"use strict";
// Cemengal: the Node side of root decision 0031 (docs/decisions/0003-no-acc-writes-temp-folder.md).
// Every log and temporary artefact of this repo's scripts goes to %TEMP%\Cemengal\Civil3DMCP\: a log is
// <name>-yyyyMMdd.log in that folder, an artefact goes to a <Kind>\ subfolder. Nothing is written under ACC or
// next to the script that writes it. The folder prunes itself the first time a process writes to it: files
// older than 7 days, then the oldest until it holds at most 50 MB; a locked file is skipped; pruning never throws.
// The plugin's C# side follows the same contract through CEM_CSharpExtended's Hosting helper.
//
// CLI, for PowerShell and batch scripts (prints the path, after the prune):
//   node tools/cem-temp.cjs log <name> [.log|.jsonl]
//   node tools/cem-temp.cjs dir <Kind>
//   node tools/cem-temp.cjs prune
const nodeFs = require("fs");
const os = require("os");
const path = require("path");

const APP = "Civil3DMCP";
const MAX_AGE_DAYS = 7;
const MAX_BYTES = 50 * 1024 * 1024;
const DAY_MS = 24 * 3600 * 1000;

/** True when a path has an ACCDocs segment (the Autodesk Desktop Connector root, synced to every colleague). */
function isUnderAcc(p) {
  return String(p).split(/[\\/]+/).some((segment) => segment.toLowerCase() === "accdocs");
}

/** <folder>\<name>, where name is one file or folder name (the C# helper's rule): no separator, drive, "." or "..". */
function inside(folder, name, what) {
  const bad = !name || typeof name !== "string" || /[\\/:*?"<>|]/.test(name) || name.trim() !== name ||
    name === "." || name === ".." || name.endsWith(".");
  if (bad) throw new Error(`${what} must be a single file or folder name inside ${folder}: ${name}`);
  return path.join(folder, name);
}

function stamp(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/**
 * The app's temp folder. Options (tests inject them): app, root (default os.tmpdir()), now, maxAgeDays,
 * maxBytes, fs. Reading `folder` creates nothing; dir(), file() and logFile() create the folder and prune
 * once per process (per helper instance) before returning.
 */
function createCemTemp(options = {}) {
  const fs = options.fs ?? nodeFs;
  const app = options.app ?? APP;
  const root = options.root ?? os.tmpdir();
  const now = options.now ?? (() => new Date());
  const maxAgeMs = (options.maxAgeDays ?? MAX_AGE_DAYS) * DAY_MS;
  const maxBytes = options.maxBytes ?? MAX_BYTES;
  if (isUnderAcc(root)) throw new Error(`Refusing a temp root under ACC: ${root}`);
  const folder = path.join(root, "Cemengal", app);
  let pruned = false;

  function listFiles(dir, out) {
    let entries;
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
    for (const e of entries) {
      const p = path.join(dir, e.name);
      if (e.isDirectory()) listFiles(p, out);
      else if (e.isFile()) {
        try { const s = fs.statSync(p); out.push({ path: p, size: s.size, mtime: s.mtimeMs }); } catch { /* gone */ }
      }
    }
    return out;
  }

  /** Delete files older than maxAgeDays, then the oldest until at most maxBytes remain. Never throws. */
  function prune() {
    const result = { removed: 0, skipped: 0 };
    try {
      const files = listFiles(folder, []).sort((a, b) => a.mtime - b.mtime);
      const cutoff = now().getTime() - maxAgeMs;
      let total = files.reduce((sum, f) => sum + f.size, 0);
      const remove = (f) => {
        try { fs.unlinkSync(f.path); result.removed++; total -= f.size; } catch { result.skipped++; }
      };
      const fresh = [];
      for (const f of files) (f.mtime < cutoff ? remove(f) : fresh.push(f));
      for (const f of fresh) {
        if (total <= maxBytes) break;
        remove(f);
      }
    } catch { /* pruning never throws */ }
    return result;
  }

  function ensure(dir) {
    fs.mkdirSync(dir, { recursive: true });
    if (!pruned) { pruned = true; prune(); }
    return dir;
  }

  return {
    folder,
    prune,
    /** <folder>\<kind>, created; the first call of the process prunes. */
    dir(kind) { return ensure(inside(folder, kind, "A kind")); },
    /** <folder>\<kind>\<name>; the folder is created, the file is not. */
    file(kind, name) {
      const dir = inside(folder, kind, "A kind");
      const full = inside(dir, name, "A file name");
      ensure(path.dirname(full));
      return full;
    },
    /** <folder>\<name>-yyyyMMdd<ext> (local date), one log file per day; the folder is created. */
    logFile(name, ext = ".log") {
      const full = inside(folder, `${name}-${stamp(now())}${ext}`, "A log name");
      ensure(path.dirname(full));
      return full;
    },
    /** Writes <folder>\<kind>\<name> (text or Buffer), replacing it; returns its path. */
    write(kind, name, data) {
      const full = this.file(kind, name);
      fs.writeFileSync(full, data);
      return full;
    },
    /** Appends a line to today's <name> log. Never throws: false when nothing was written. */
    appendLog(name, line, ext = ".log") {
      try { fs.appendFileSync(this.logFile(name, ext), `${line}${os.EOL}`); return true; } catch { return false; }
    },
  };
}

module.exports = { createCemTemp, isUnderAcc, APP, MAX_AGE_DAYS, MAX_BYTES };

if (require.main === module) {
  const [verb, a, b] = process.argv.slice(2);
  const temp = createCemTemp();
  try {
    if (verb === "log" && a) console.log(temp.logFile(a, b ?? ".log"));
    else if (verb === "dir" && a) console.log(temp.dir(a));
    else if (verb === "prune") console.log(JSON.stringify(temp.prune()));
    else { console.error("usage: node tools/cem-temp.cjs log <name> [ext] | dir <Kind> | prune"); process.exit(2); }
  } catch (e) { console.error(String(e && e.message || e)); process.exit(1); }
}
