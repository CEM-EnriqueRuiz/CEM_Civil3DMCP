// The plugin, the server and setup_claude.ps1 agree on the default port, 8766 (docs/decisions/0002-own-port-8766.md),
// and no script of this repo still falls back to 8080, the Revit MCP's port.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { codeFiles, noComment } from "./code-files.mjs";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const read = (rel) => readFileSync(path.join(repo, rel), "utf8");

test("the plugin's default is 8766", () => {
  assert.match(read("plugin/Civil3dMcpPlugin/PortSetting.cs"), /public const int Default = 8766;/);
  assert.match(read("plugin/Civil3dMcpPlugin/PluginRuntime.cs"),
    /Port = PortSetting\.Resolve\(Environment\.GetEnvironmentVariable\("CIVIL3D_PORT"\)\)/);
});

test("the server's default is 8766 and CIVIL3D_PORT goes through resolvePort", () => {
  assert.match(read("src/utils/config.ts"), /export const DEFAULT_PORT = 8766;/);
  assert.match(read("src/utils/ConnectionManager.ts"), /resolvePort\(process\.env\.CIVIL3D_PORT\)/);
});

test("setup_claude.ps1 defaults to 8766 and persists CIVIL3D_PORT only for another port", () => {
  const setup = read("setup_claude.ps1");
  assert.match(setup, /\[int\]\$Port = 8766/);
  assert.match(setup, /\$DefaultPort = 8766/);
  assert.match(setup, /if \(\$Port -ne \$DefaultPort\)[^\n]*\{[^\n]*SetEnvironmentVariable\("CIVIL3D_PORT", "\$Port", "User"\)/);
});

test("no code file falls back to 8080, the Revit MCP's port", () => {
  const offenders = codeFiles(repo).flatMap((f) =>
    read(f).split(/\r?\n/).map((text, i) => ({ f, n: i + 1, code: noComment(text) }))
      .filter((l) => /\b8080\b/.test(l.code)).map((l) => `${l.f}:${l.n}: ${l.code.trim()}`));
  assert.deepEqual(offenders, []);
});

test("the harness scripts fall back to 8766", () => {
  for (const f of ["tests/runner.cjs", "tests/skills_test.cjs", "test_plugin.cjs", "tests/run_all.ps1"]) {
    assert.match(read(f), /8766/, f);
  }
});
