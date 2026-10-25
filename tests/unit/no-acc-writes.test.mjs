// Root decision 0031 here (docs/decisions/0003-no-acc-writes-temp-folder.md): nothing of this repo writes under ACC
// (ACCDocs, the Desktop Connector root synced to every colleague) or next to its own DLL or script. Logs and
// temporary artefacts go to %TEMP%\Cemengal\Civil3DMCP\: C# through CEM_CSharpExtended's CemTempFolder, scripts
// through tools/cem-temp.cjs. A new raw write fails here until it goes through a helper or is listed below, with
// its reason.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { codeFiles, noComment } from "./code-files.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const files = codeFiles(repo);
const read = (rel) => readFileSync(path.join(repo, rel), "utf8");
const lines = (rel) => read(rel).split(/\r?\n/).map((text, i) => ({ rel, n: i + 1, text }));

/** Write call sites that are allowed, per file, with the reason. */
const ALLOWED = {
  "plugin/Civil3dMcpPlugin/ViewCapture.cs": [
    [/scaled\.Save\(file, ImageFormat\.Png\)/, "the screenshot, at a CemTempFolder artefact path (checked below)"],
  ],
  "plugin/Civil3dMcpPlugin/DrawingFile.cs": [
    [/acDoc\.Save\(\);/, "civil3d_save in place: the user's drawing, where it already is"],
    [/acDoc\.SaveAs\(SavePath\.Validate\(path\)\)/, "civil3d_save as: the absolute path the user asked for"],
  ],
  "tests/skills_test.cjs": [
    [/fs\.writeFileSync\(u\.file, next\)/, "--mark-verified rewrites a skill's verified: line (a source edit)"],
  ],
  "tests/run_all.ps1": [
    [/Out-File -Encoding utf8 \(Join-Path \$results "acad_running\.txt"\)/, "$results is cem-temp's TestResults folder"],
  ],
  "tests/list_acad.bat": [
    [/>>? "%C3D_RESULTS%\\acad_procs\.txt"/, "%C3D_RESULTS% is cem-temp's TestResults folder"],
  ],
  "setup_claude.ps1": [
    [/if \(\$log\) \{ Start-Transcript -Path \$log -Append/, "the setup log, at cem-temp's daily log path"],
    [/Copy-Item \$src \$refs -Force/, "build input: Civil 3D's reference DLLs into the checkout's C_References"],
    [/New-Item -ItemType Directory -Force \$contents/, "deploy: the per-user bundle"],
    [/Copy-Item \(Join-Path \$out "\*"\) \$contents/, "deploy: the published plugin into the bundle"],
    [/Set-Content -Encoding UTF8 \(Join-Path \$bundle "PackageContents\.xml"\)/, "deploy: the bundle manifest"],
    [/Copy-Item \$cfg "\$cfg\.bak-civil3d" -Force/, "settings: backup of the Claude config the user asked setup to change"],
    [/\[IO\.File\]::WriteAllText\(\$cfg,/, "settings: the Claude config the user asked setup to change"],
  ],
};

const CS_WRITE = /\bFile\.(Write|Append|Create|Copy|Move|Open|Replace)\w*\(|new (FileStream|StreamWriter)\(|Directory\.CreateDirectory\(|\.Save\(|\.SaveAs\(|GetTempPath\(|SpecialFolder\./;
const JS_WRITE = /\b(writeFileSync|appendFileSync|mkdirSync|mkdtempSync|createWriteStream|copyFileSync|cpSync|renameSync|writeFile|appendFile|mkdir)\s*\(/;
const PS_WRITE = /\b(Start-Transcript|Out-File|Set-Content|Add-Content|Copy-Item|New-Item|Move-Item)\b|::Write\w*\(|::Append\w*\(|\s>>?\s*"?(?!nul\b)[%$A-Za-z]/i;

function offenders(filter, pattern) {
  const out = [];
  for (const rel of files.filter(filter)) {
    const allowed = ALLOWED[rel] ?? [];
    for (const l of lines(rel)) {
      const code = noComment(l.text);
      if (pattern.test(code) && !allowed.some(([re]) => re.test(code))) out.push(`${rel}:${l.n}: ${l.text.trim()}`);
    }
  }
  return out;
}

test("no code names an ACC path", () => {
  const hits = files
    .filter((f) => f !== "tools/cem-temp.cjs") // its isUnderAcc() refuses an ACC root
    .flatMap(lines)
    .filter((l) => /ACCDocs|\\DC\\/i.test(l.text))
    .map((l) => `${l.rel}:${l.n}: ${l.text.trim()}`);
  assert.deepEqual(hits, []);
});

test("the plugin never derives a path from its own assembly", () => {
  const hits = files
    .filter((f) => f.endsWith(".cs"))
    .flatMap(lines)
    .filter((l) => /\bAssembly\.Location|GetExecutingAssembly\(\)|AppContext\.BaseDirectory|AppDomain\.CurrentDomain\.BaseDirectory|\bCodeBase\b/.test(noComment(l.text)))
    .map((l) => `${l.rel}:${l.n}: ${l.text.trim()}`);
  assert.deepEqual(hits, []);
});

test("the plugin writes only the screenshot (through CemTempFolder) and the drawing the user asked to save", () => {
  assert.deepEqual(offenders((f) => f.endsWith(".cs"), CS_WRITE), []);
});

test("the screenshot goes to %TEMP%\\Cemengal\\Civil3DMCP\\Screenshots through CemTempFolder", () => {
  const capture = read("plugin/Civil3dMcpPlugin/ViewCapture.cs");
  assert.match(capture, /var file = CemTempFolder\.NewArtifactFile\(PluginRuntime\.TempApp, "Screenshots", "capture", "\.png"\);/);
  assert.match(read("plugin/Civil3dMcpPlugin/PluginRuntime.cs"), /public const string TempApp = "Civil3DMCP";/);
});

test("the bundle ships CEM_CSharpExtended.dll: the plugin references it and setup copies the whole publish folder", () => {
  assert.match(read("plugin/Civil3dMcpPlugin/Civil3dMcpPlugin.csproj"),
    /<ProjectReference Include="\.\.\\\.\.\\\.\.\\\.\.\\CEM_CSharpExtended\\CEM_CSharpExtended\\CEM_CSharpExtended\.csproj" \/>/);
  assert.match(read("setup_claude.ps1"), /Copy-Item \(Join-Path \$out "\*"\) \$contents -Recurse/);
  assert.match(read("setup_claude.ps1"), /CEM_CSharpExtended\.dll/);
});

test("scripts and the server write only through tools/cem-temp.cjs", () => {
  const js = (f) => /\.(ts|cjs|js|mjs)$/.test(f) && f !== "tools/cem-temp.cjs";
  assert.deepEqual(offenders(js, JS_WRITE), []);
});

test("PowerShell and batch scripts write no log or result next to themselves", () => {
  assert.deepEqual(offenders((f) => /\.(ps1|bat|cmd)$/i.test(f), PS_WRITE), []);
});
