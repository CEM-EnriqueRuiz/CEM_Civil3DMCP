---
title: "CEM-EnriqueRuiz/CEM_API#82: the MCPs write nothing into ACC; here, port 8766, the self-cleaning temp folder and the fork's onboarding"
type: source
updated: 2026-10-25
sources: [https://github.com/CEM-EnriqueRuiz/CEM_API/issues/82, plugin/Civil3dMcpPlugin/ViewCapture.cs, plugin/Civil3dMcpPlugin/PortSetting.cs, plugin/Civil3dMcpPlugin/SavePath.cs, plugin/Civil3dMcpPlugin/DrawingFile.cs, plugin/Civil3dMcpPlugin/Civil3dMcpPlugin.csproj, src/utils/config.ts, src/utils/ConnectionManager.ts, src/tools/executeTool.ts, src/tools/saveTool.ts, tools/cem-temp.cjs, setup_claude.ps1, tests/unit/, plugin/Civil3dMcpPlugin.Tests/]
related: [../../decisions/0002-own-port-8766.md, ../../decisions/0003-no-acc-writes-temp-folder.md, ../../decisions/0005-save-only-where-the-user-asked.md, ../../decisions/0006-tests-node-and-xunit.md, ../../concepts/file-writes.md, ../../concepts/ports.md, ../../concepts/known-gaps.md, ../../workflows/live-mcp-test.md, ../commits/2026-10.md, ../../../../../docs/features/CEM-EnriqueRuiz-CEM_API-82.md, ../../../../../docs/decisions/0031-nothing-writes-under-acc-logs-in-local-temp.md]
tags: [issue, acc, logs, temp, port, guard, onboarding, cem_csharpextended, cross-repo]
---

# CEM-EnriqueRuiz/CEM_API#82

**Issue:** https://github.com/CEM-EnriqueRuiz/CEM_API/issues/82, "Borrar logs in ACC de los MCP". It is filed in
CEM_API's tracker with an empty body; the cross-repo work is on the root
[feature page](../../../../../docs/features/CEM-EnriqueRuiz-CEM_API-82.md), under root
[0031](../../../../../docs/decisions/0031-nothing-writes-under-acc-logs-in-local-temp.md). Implemented on
2026-10-24 and committed on 2026-10-25, after the user tested it, as the fork's first Cemengal commit. That commit
also carries the user's earlier Civil 3D 2027 work, which had no issue of its own
([2026-10](../commits/2026-10.md)); the files mix both, so they were not split.

## What was asked

The user, 2026-10-24 (translated): "Test the MCPs of Navisworks, Civil 3D, AutoCAD and Revit with the files I left in
`CEM_Test\MCP`, and verify that no one writes logs or other files in an ACC path: I don't want any massive
synchronization through the ACC Desktop Connector. If we or the app need logs, they go to a local temp folder that is
cleaned automatically, without accumulating. Fix what you find."

For this repo, the architect's brief added:
- bring the fork into the Cemengal system: the schema files, the `cem-civil3dmcp-dev` skill, this wiki and tests;
- audit every file write. The screenshot moves to `%TEMP%\Cemengal\Civil3DMCP\Screenshots` through
  CEM_CSharpExtended's `CemTempFolder`, the bundle ships `CEM_CSharpExtended.dll`, and the drawing is saved only
  where the user asked;
- fix the port clash: Civil 3D held 8080, the Revit MCP's port;
- run a live test through the MCP server, as Claude Desktop starts it, on the test drawing, which is never saved.

## What the audit found (2026-10-24)

- **No ACC path anywhere** in the plugin, the server, the skills or the scripts. Nothing derived a write path from
  its own assembly (`RoslynExecutor` reads the acad.exe folder to find Map 3D assemblies: a read).
- **Screenshots** piled up in `%TEMP%\civil3d-mcp\capture_*.png`, with no cleanup.
- **Every script wrote next to itself:**
  - the `setup_claude.ps1` transcript (`setup_log.txt`);
  - the `test_plugin` log (`test_plugin_log.txt`);
  - `runner.cjs` and `skills_test.cjs` (`tests/results`, `tests/queue`);
  - `run_all.ps1` (`tests/acad_running.txt`) and `list_acad.bat` (`tests/results/acad_procs.txt`).

  `skills_test.cjs` also used `%TEMP%\civil3d-mcp-test`, which nothing cleaned.
- **Save As** accepted a relative path, which acad.exe resolves against its own working folder: a place nobody chose.
- **Port:** `127.0.0.1:8080` was held by acad.exe, so a Revit MCP call could reach Civil 3D. Setup persisted
  `CIVIL3D_PORT` every time (8080, or 18080 when 8080 was taken).
- **The plugin writes no log** (`Debug.WriteLine` only), and the Node server logs to stderr only.

The full table, before and after, is [file writes](../../concepts/file-writes.md).

## Decisions and reasons

| Decision | Reason | Rejected |
|---|---|---|
| Default port **8766** in the plugin (`PortSetting`), the server (`config.ts`) and setup (`-Port`); `CIVIL3D_PORT` overrides it, and an invalid value falls back to the default ([0002](../../decisions/0002-own-port-8766.md)) | 8080 is the Revit MCP's port. 8766 sits next to the Navisworks MCP's 8765, outside Windows' excluded ranges | Keeping 8080 and moving the Revit MCP (a shipped feature whose users already have 8080 configured); a random port per start (it needs a discovery file, a write this repo avoids) |
| Setup persists `CIVIL3D_PORT` only for a non-default port, removes a stale value, and stops when the port is taken | The coordinator's rule (2026-10-24). A port that setup switched by itself would have to be persisted | Setup's old auto-switch to 18080 |
| The screenshot goes through `CemTempFolder.NewArtifactFile("Civil3DMCP", "Screenshots", …)`; the bundle ships `CEM_CSharpExtended.dll`, and setup stops when it is missing ([0003](../../decisions/0003-no-acc-writes-temp-folder.md)) | Root 0031 §6: one C# implementation, which prunes the folder (7 days, then 50 MB) | Keeping `%TEMP%\civil3d-mcp`; returning the image only in memory (the user can open the saved copy, and it now expires) |
| Scripts write through `tools/cem-temp.cjs` (`dir`, `file`, `write`, `logFile`, `appendLog`, and a CLI for PowerShell and batch) | Node and PowerShell cannot load the C# helper. 0031 lets each language keep a small helper with tests. Helper calls keep the guard a simple allow-list | Raw `fs` calls checked by data-flow analysis |
| The harness outputs also go to temp, not to the repo's ignored folders | The coordinator's choice, 2026-10-24. The old `tests/results`, `setup_log.txt` and `test_plugin_log.txt` stay ignored and untouched | Keeping the dev-only outputs in the checkout |
| The Node helper refuses a temp root under ACC | Its root is injectable, for tests. The C# helper takes no root from its caller: `CemTempFolder.UserTempPath` is the user's own temp (root 0031 §2) | — |
| Save As needs an absolute `.dwg` path with an existing folder (`SavePath`) ([0005](../../decisions/0005-save-only-where-the-user-asked.md)) | A relative path saved somewhere nobody asked for | Refusing an ACC path for Save As (a drawing on ACC is the user's project file, 0031 §1) |
| No sandbox rule against `Save`, `SaveAs` or file writes in scripts: the rule is in the `civil3d_execute` and `civil3d_save` descriptions and in [known gaps](../../concepts/known-gaps.md) | `ScriptSandbox` is a text filter, and a script can bypass it | A deny-list that would look like a guarantee |
| `JsonRpcDispatchException` moves to its own file | The xunit project compiles the pure files without Civil 3D | Referencing the plugin project (it needs the Civil 3D DLLs) |
| `npm test` (node:test) and an xunit project; the live harness is not a test suite ([0006](../../decisions/0006-tests-node-and-xunit.md)) | Fast checks with no Civil 3D; the harness needs a running Civil 3D | Mocking the AutoCAD API (a huge surface for little value); calling the live harness a test suite (it changes a drawing and needs a licensed Civil 3D) |
| Guard `no-acc-writes.test.mjs`: every write goes through a helper or an allow-listed call site with its reason | A new raw write fails until someone classifies it | A list of forbidden calls (a new kind of write would pass) |
| Plugin and server 1.2.0 | The port and the screenshot path change behaviour | — |

## The user's decisions (2026-10-25)

- Keep every pass-1 change.
- Only the MCPs were in question. Root 0031 now says it: the MCPs have no exception, and the add-ins keep their
  deliberate team files on ACC. This repo is an MCP, so the strict rule applies.
- The coordinator deleted the 148 old files in ACC's `CEM_RibbonUI\Logs`, `05-CEMAIModeler\Log`, `Screenshots` and
  `Recipes`. None of them came from this repo.
- The coordinator publishes the menus to ACC later, with the user's OK. This repo is deployed per user, not from ACC
  ([0004](../../decisions/0004-per-user-bundle-deploy.md)), and it never publishes.
- The doc drift reported in pass 1 stays reported ([Left open](#left-open)).

## Files changed

- **Plugin:**
  - new `PortSetting.cs`, `SavePath.cs` and `JsonRpcDispatchException.cs`;
  - `PluginRuntime.cs`: the port, `TempApp`, 1.2.0;
  - `ViewCapture.cs`: the screenshot through `CemTempFolder`;
  - `DrawingFile.cs`: Save As through `SavePath`;
  - `Civil3dMcpPlugin.csproj`: the `ProjectReference` to CEM_CSharpExtended;
  - new `plugin/Civil3dMcpPlugin.Tests/`.
- **Server:**
  - new `src/utils/config.ts`;
  - `ConnectionManager.ts`;
  - the `executeTool.ts` and `saveTool.ts` descriptions;
  - `index.ts` 1.2.0;
  - the `package.json` `test` script.
- **Scripts:**
  - new `tools/cem-temp.cjs`;
  - `setup_claude.ps1`;
  - the harness: `tests/runner.cjs`, `tests/skills_test.cjs`, `test_plugin.cjs`, `test_plugin.js`,
    `tests/run_all.ps1` and `tests/list_acad.bat`.
- **Tests:** new `tests/unit/` (`port`, `port-contract`, `cem-temp` and `no-acc-writes`, plus `code-files.mjs`).
- **Onboarding:**
  - `CLAUDE.md`, `AGENTS.md` and `TESTS.md`;
  - the agent and skill, and the Codex redirect;
  - `.claude/settings.json` (wiki hooks), `.claude/settings.local.json`, `.mcp.json` (the shared qmd) and
    `.gitattributes`;
  - `README.md` (port, file locations, "Files it writes", unit-test commands);
  - `.gitignore` (the old harness outputs);
  - this wiki.

## Verified (2026-10-24)

- **Red first:**
  - the port tests failed on 8080 and on `abc` → `NaN`;
  - the contract test failed four ways: the server, setup and harness still used 8080;
  - the helper tests failed 12 of 14 against a stub;
  - the guard listed every write next to a script and the old screenshot path;
  - `dotnet test` failed 10: the 8080 default, relative and drive-relative paths accepted, a path not normalised.
- **Final:**
  - `npm test` 29/29;
  - `dotnet test plugin\Civil3dMcpPlugin.Tests` 24/24;
  - the Release build: 0 errors, about 25 known CA1416 warnings;
  - wiki lint: 0 errors.

  No repo file changed after that run except `docs/`, `.gitignore` and the wiki ingest of 2026-10-25.
  CEM_CSharpExtended's `CemTempFolder` gained `UserTempPath` after the run, so the plugin was built again in Release
  on 2026-10-25 against it: 0 errors.
- **Live, 15 MCP calls** through `build\index.js` over stdio, started as the Claude Desktop entry says, on the user's
  test drawing opened read-only ([live MCP test](../../workflows/live-mcp-test.md)):
  - every call answered as expected;
  - the screenshot was saved in `…\Civil3DMCP\Screenshots`;
  - a line was created, then erased;
  - a relative Save As was refused.

  8766 was held by acad.exe, and 8080 was free. Civil 3D was then closed with the drawings unsaved, and the test
  drawing kept its date and size.
- **Restart:** the coordinator approved one restart to load the rebuilt plugin. The test drawing's unsaved state was
  first copied to `…\Civil3DMCP\Recovery`. The unsigned DLL was loaded with "Cargar una vez", with the coordinator's
  OK.
- **Watcher** on `C:\DC\ACCDocs`, `%APPDATA%\Autodesk\ApplicationPlugins` and the Revit add-in folder:
  - no event during the 15 calls;
  - during the deploy, 211 events, all in `CEM_Civil3DMCP.bundle`;
  - two ACC events while Civil 3D was starting (21:13:32–33), on the Revit menu's `CEM_NestedSelection.dll` and
    `.pdb`. They are not from this repo: no code here names ACC.

- **The skill:** the Skill tool could not invoke `cem-civil3dmcp-dev` in the session that created it, because skills
  load at session start. That session followed it from its file. The commit session loaded it normally.

## Left open

- Civil 3D asks again at every start until the user picks "Cargar siempre" for the unsigned DLL.
- The bundle also carries CEM_CSharpExtended's SocketIO and Clipper2 DLLs, which the plugin never loads.
- **Doc drift, reported, not fixed:**
  - `C_References/README.md` still says to copy the DLLs by hand from AutoCAD 2025; setup copies them from the
    Civil 3D 2027 install;
  - `package.json` names upstream's repository and ISC, while `LICENSE` is MIT;
  - `tests/kill_stale_acad.bat` kills a hard-coded PID, and `test_plugin.js` duplicates `test_plugin.cjs`.

  The last two are in [known gaps](../../concepts/known-gaps.md).
- `tests/acad_running.txt`, the old output of `run_all.ps1` from 2026-10-18, is left out of the commit and now
  ignored.
