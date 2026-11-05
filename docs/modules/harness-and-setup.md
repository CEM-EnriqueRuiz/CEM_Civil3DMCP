---
title: "Setup and the live harness: setup_claude.ps1, tests/*.cjs, run_all, test_plugin, tools/cem-temp.cjs"
type: module
updated: 2026-11-05
sources: [setup_claude.ps1, setup_claude.bat, tools/cem-temp.cjs, tests/runner.cjs, tests/skills_test.cjs, tests/run_all.ps1, tests/list_acad.bat, test_plugin.cjs]
related: [../decisions/0003-no-acc-writes-temp-folder.md, ../decisions/0004-per-user-bundle-deploy.md, ../decisions/0002-own-port-8766.md, ../workflows/build-and-deploy.md, ../workflows/live-mcp-test.md]
tags: [setup, harness, scripts, temp]
---

# Setup and the live harness

**`setup_claude.ps1 [-Port <port>]`** (or double-click `setup_claude.bat`), re-runnable, for a user's machine:
`npm install` + build; Civil 3D found through the registry and its five DLLs copied to `C_References/`; the .NET 10
SDK installed by winget if missing; `dotnet publish` the plugin and copy it into the bundle (and check
`Civil3dMcpPlugin.dll` and `CEM_CSharpExtended.dll` are there); the port ([0002](../decisions/0002-own-port-8766.md));
the `civil3d` entry in the Claude Desktop config, with a `.bak-civil3d` backup. Its transcript is
`%TEMP%\Cemengal\Civil3DMCP\setup-yyyyMMdd.log`. An agent does not run it: it changes the user's Claude config and
environment ([build and deploy](../workflows/build-and-deploy.md)).

**`tools/cem-temp.cjs`**, the Node side of [0003](../decisions/0003-no-acc-writes-temp-folder.md):
`createCemTemp({ app, root, now, maxAgeDays, maxBytes, fs })` → `folder`, `dir(kind)`, `file(kind, name)`,
`write(kind, name, data)`, `logFile(name, ext)`, `appendLog(name, line)`, `prune()`; and `isUnderAcc(path)`.
CLI for scripts: `node tools/cem-temp.cjs dir <Kind>` | `log <name> [ext]` | `prune` prints the path. Names are
single segments, like the C# `CemTempFolder`.

**Live harness** (needs a running Civil 3D; driving it is not a test, [0006](../decisions/0006-tests-node-and-xunit.md)):

| Script | What it does | Output |
|---|---|---|
| `tests/run_all.ps1` (`run_all.bat`) | with Civil 3D closed: setup, start Civil 3D, new scratch drawing, every skill | `…\TestResults\report.md`, screenshots |
| `tests/skills_test.cjs [--mark-verified] [--only=a,b]` | runs every skill in a scratch drawing (refuses a named one), checks one execute = one undo step, Save As to temp | `…\TestResults`, fixtures in `…\TestData` |
| `tests/runner.cjs` (`runner.bat`) | watches `…\Queue\*.json` and runs each job by raw RPC or through the MCP server | `…\TestResults\<job>.json` |
| `test_plugin.cjs` (`test_plugin.bat`) | health and one query over raw TCP | `…\test_plugin-yyyyMMdd.log` |
| `tests/list_acad.bat` | lists acad.exe processes | `…\TestResults\acad_procs.txt` |

`…` is `%TEMP%\Cemengal\Civil3DMCP`. Every script falls back to port 8766 when `CIVIL3D_PORT` is unset. The repo's old
`tests/results/`, `setup_log.txt` and `test_plugin_log.txt` were moved out of the checkout on 2026-11-05
([file writes](../concepts/file-writes.md)).
