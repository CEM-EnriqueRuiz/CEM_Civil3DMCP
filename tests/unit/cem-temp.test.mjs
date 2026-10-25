// The Node side of root decision 0031 (docs/decisions/0003-no-acc-writes-temp-folder.md): logs and temporary
// artefacts go to %TEMP%\Cemengal\Civil3DMCP\, which prunes itself on the first write of each process
// (older than 7 days, then the oldest until under 50 MB; locked files skipped; never throws).
import { after, test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import cemTemp from "../../tools/cem-temp.cjs";

const { createCemTemp, isUnderAcc } = cemTemp;
const DAY = 24 * 3600 * 1000;

const scratches = [];
function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cem-temp-test-"));
  scratches.push(dir);
  return dir;
}
after(() => { for (const dir of scratches) fs.rmSync(dir, { recursive: true, force: true }); });

function put(file, bytes, ageDays, now) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, Buffer.alloc(bytes));
  const t = new Date(now.getTime() - ageDays * DAY);
  fs.utimesSync(file, t, t);
}

test("the folder is <temp>\\Cemengal\\<App>, and reading it creates nothing", () => {
  const root = scratch();
  const temp = createCemTemp({ app: "Civil3DMCP", root });
  assert.equal(temp.folder, path.join(root, "Cemengal", "Civil3DMCP"));
  assert.equal(fs.existsSync(temp.folder), false);
});

test("the default root is the OS temp folder", () => {
  assert.equal(createCemTemp().folder, path.join(os.tmpdir(), "Cemengal", "Civil3DMCP"));
});

test("a kind gets its own subfolder, created on demand", () => {
  const root = scratch();
  const temp = createCemTemp({ app: "Civil3DMCP", root });
  const dir = temp.dir("TestResults");
  assert.equal(dir, path.join(temp.folder, "TestResults"));
  assert.ok(fs.statSync(dir).isDirectory());
  assert.equal(temp.file("Screenshots", "a.png"), path.join(temp.folder, "Screenshots", "a.png"));
  assert.ok(fs.statSync(path.join(temp.folder, "Screenshots")).isDirectory());
});

test("a log is one file per day, <name>-yyyyMMdd.log, in the app folder", () => {
  const root = scratch();
  const now = new Date(2026, 9, 4, 23, 59); // local time, 4 Oct 2026
  const temp = createCemTemp({ app: "Civil3DMCP", root, now: () => now });
  assert.equal(temp.logFile("setup"), path.join(temp.folder, "setup-20261004.log"));
  assert.equal(temp.logFile("runner", ".jsonl"), path.join(temp.folder, "runner-20261004.jsonl"));
});

test("names and kinds cannot leave the folder", () => {
  const temp = createCemTemp({ app: "Civil3DMCP", root: scratch() });
  assert.throws(() => temp.dir(".."), /inside/);
  assert.throws(() => temp.dir("a\\..\\.."), /inside/);
  assert.throws(() => temp.file("TestResults", "..\\..\\x.txt"), /inside/);
  assert.throws(() => temp.file("TestResults", "C:\\x.txt"), /inside/);
  assert.throws(() => temp.logFile("../x"), /inside/);
});

test("a root under ACC is refused", () => {
  assert.equal(isUnderAcc("C:\\DC\\ACCDocs\\Cemengal\\x"), true);
  assert.equal(isUnderAcc("D:/Sync/accdocs/x"), true);
  assert.equal(isUnderAcc("C:\\Users\\me\\AppData\\Local\\Temp"), false);
  assert.equal(isUnderAcc("C:\\Temp\\NotACCDocsReally"), false);
  assert.throws(() => createCemTemp({ root: "C:\\DC\\ACCDocs\\Org\\Project" }), /ACC/);
});

test("the first write prunes files older than 7 days, in every kind", () => {
  const root = scratch();
  const now = new Date();
  const temp = createCemTemp({ app: "Civil3DMCP", root, now: () => now });
  const old = path.join(temp.folder, "TestResults", "old.json");
  const oldLog = path.join(temp.folder, "setup-20200101.log");
  const fresh = path.join(temp.folder, "Screenshots", "fresh.png");
  put(old, 10, 8, now);
  put(oldLog, 10, 30, now);
  put(fresh, 10, 6, now);
  temp.dir("Queue");
  assert.equal(fs.existsSync(old), false);
  assert.equal(fs.existsSync(oldLog), false);
  assert.equal(fs.existsSync(fresh), true);
});

test("then the oldest files go until the folder is under the size cap", () => {
  const root = scratch();
  const now = new Date();
  const temp = createCemTemp({ app: "Civil3DMCP", root, now: () => now, maxBytes: 250 });
  const a = path.join(temp.folder, "TestResults", "a.bin");
  const b = path.join(temp.folder, "TestResults", "b.bin");
  const c = path.join(temp.folder, "Screenshots", "c.bin");
  put(a, 100, 3, now); // oldest
  put(b, 100, 2, now);
  put(c, 100, 1, now); // newest
  temp.logFile("runner");
  assert.equal(fs.existsSync(a), false, "the oldest goes first");
  assert.equal(fs.existsSync(b), true);
  assert.equal(fs.existsSync(c), true);
});

test("pruning runs once per process, not on every write", () => {
  const root = scratch();
  const now = new Date();
  const temp = createCemTemp({ app: "Civil3DMCP", root, now: () => now });
  temp.dir("TestResults");
  const old = path.join(temp.folder, "TestResults", "old.json");
  put(old, 10, 9, now);
  temp.dir("TestResults");
  temp.file("TestResults", "x.json");
  assert.equal(fs.existsSync(old), true);
});

test("a locked file is skipped and pruning never throws", () => {
  const root = scratch();
  const now = new Date();
  const locked = path.join(root, "Cemengal", "Civil3DMCP", "TestResults", "locked.json");
  const other = path.join(root, "Cemengal", "Civil3DMCP", "TestResults", "other.json");
  put(locked, 10, 9, now);
  put(other, 10, 9, now);
  const lockingFs = {
    ...fs,
    unlinkSync(p) {
      if (path.resolve(p) === path.resolve(locked)) {
        throw Object.assign(new Error("EBUSY: resource busy or locked"), { code: "EBUSY" });
      }
      return fs.unlinkSync(p);
    },
  };
  const temp = createCemTemp({ app: "Civil3DMCP", root, now: () => now, fs: lockingFs });
  assert.doesNotThrow(() => temp.dir("TestResults"));
  assert.equal(fs.existsSync(locked), true);
  assert.equal(fs.existsSync(other), false);
});

test("a failing directory listing does not throw either", () => {
  const root = scratch();
  const brokenFs = { ...fs, readdirSync() { throw new Error("EACCES"); } };
  const temp = createCemTemp({ app: "Civil3DMCP", root, fs: brokenFs });
  assert.doesNotThrow(() => temp.dir("TestResults"));
});

test("prune() reports what it removed", () => {
  const root = scratch();
  const now = new Date();
  const temp = createCemTemp({ app: "Civil3DMCP", root, now: () => now });
  put(path.join(temp.folder, "Queue", "q.json"), 10, 10, now);
  const r = temp.prune();
  assert.equal(r.removed, 1);
  assert.equal(r.skipped, 0);
});

test("write() puts a file in a kind folder and returns its path", () => {
  const temp = createCemTemp({ app: "Civil3DMCP", root: scratch() });
  const p = temp.write("TestResults", "report.md", "# ok");
  assert.equal(p, path.join(temp.folder, "TestResults", "report.md"));
  assert.equal(fs.readFileSync(p, "utf8"), "# ok");
  const b = temp.write("TestData", "x.bin", Buffer.from([1, 2, 3]));
  assert.deepEqual([...fs.readFileSync(b)], [1, 2, 3]);
  assert.throws(() => temp.write("TestResults", "..\\x.md", "no"), /inside/);
});

test("appendLog() appends a line to today's log and never throws", () => {
  const now = new Date(2026, 9, 24, 10, 0);
  const temp = createCemTemp({ app: "Civil3DMCP", root: scratch(), now: () => now });
  assert.equal(temp.appendLog("test_plugin", "one"), true);
  assert.equal(temp.appendLog("test_plugin", "two"), true);
  assert.equal(fs.readFileSync(path.join(temp.folder, "test_plugin-20261024.log"), "utf8"), `one${os.EOL}two${os.EOL}`);
  assert.equal(temp.appendLog("..\\bad", "x"), false);
});
