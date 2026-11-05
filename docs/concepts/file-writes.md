---
title: "Every file this repo writes: where, what kind, and why it is allowed"
type: concept
updated: 2026-11-05
sources: [https://github.com/CEM-EnriqueRuiz/CEM_API/issues/82, plugin/Civil3dMcpPlugin/ViewCapture.cs, plugin/Civil3dMcpPlugin/DrawingFile.cs, setup_claude.ps1, tests/runner.cjs, tests/skills_test.cjs, test_plugin.cjs, tests/run_all.ps1, tests/list_acad.bat, tools/cem-temp.cjs, tests/unit/no-acc-writes.test.mjs]
related: [../sources/issues/CEM-EnriqueRuiz-CEM_API-82.md, ../decisions/0003-no-acc-writes-temp-folder.md, ../decisions/0005-save-only-where-the-user-asked.md, ../decisions/0004-per-user-bundle-deploy.md, known-gaps.md]
tags: [acc, logs, temp, audit, guard]
---

# File writes

The audit of 2026-10-24 for root decision 0031 ([CEM_API#82](../sources/issues/CEM-EnriqueRuiz-CEM_API-82.md)),
and the state after it. `T` is `%TEMP%\Cemengal\Civil3DMCP`
(pruned on the first write of each process: older than 7 days, then the oldest above 50 MB). The guard
`tests/unit/no-acc-writes.test.mjs` keeps this table true: a new write fails it until it goes through a helper or is
added to its allow-list with a reason, and then here.

| Who | Writes | Kind | Before 2026-10-24 | Now |
|---|---|---|---|---|
| Plugin `ViewCapture` (`civil3d_screenshot`) | the PNG returned to the AI | temp artefact | `%TEMP%\civil3d-mcp\capture_*.png`, never cleaned | `T\Screenshots\capture_<stamp>.png` via `CemTempFolder` |
| Plugin `DrawingFile` (`civil3d_save`) | the drawing | user data | in place, or Save As to a path checked only for `.dwg` and an existing folder (a relative path passed) | in place, or an absolute `.dwg` path with an existing folder ([0005](../decisions/0005-save-only-where-the-user-asked.md)) |
| Plugin, any log | — | log | none (only `Debug.WriteLine`) | none; a future log uses `CemTempFolder.AppendLog("Civil3DMCP", …)` |
| Roslyn scripts (`civil3d_execute`) | whatever the AI's C# writes | user data if the user named the path | unrestricted (`ScriptSandbox` blocks deletes, not writes) | unchanged in code; the tool description now says: only to a path the user named, never ACC or next to the plugin, scratch under `T` ([known gaps](known-gaps.md)) |
| Skill `import_export_points` (export) | a CSV | user data | to the path the caller passes | unchanged |
| Node server (`src/`) | nothing | — | logs to stderr only | unchanged; the guard keeps it so |
| `setup_claude.ps1` | its transcript | log | `setup_log.txt` next to the script | `T\setup-yyyyMMdd.log` (via `tools/cem-temp.cjs log setup`) |
| `setup_claude.ps1` | `C_References\*.dll` | build input in the checkout | — | unchanged (ignored, never shipped) |
| `setup_claude.ps1` | the bundle (`Contents\`, `PackageContents.xml`) | deploy | `%APPDATA%\Autodesk\ApplicationPlugins\CEM_Civil3DMCP.bundle` | unchanged; now also checks `CEM_CSharpExtended.dll` is there |
| `setup_claude.ps1` | Claude config `civil3d` entry and its `.bak-civil3d` | settings (the user ran setup to change them) | always with `env.CIVIL3D_PORT` | `env` only for a non-default port |
| `setup_claude.ps1` | user environment `CIVIL3D_PORT` | settings | always persisted (8080, or 18080) | only for `-Port` other than 8766; a stale value is removed |
| `tests/runner.cjs` | job results, images, `_alive.json`; the job queue | temp artefacts | `tests/results/`, `tests/queue/` next to the script | `T\TestResults`, `T\Queue` |
| `tests/skills_test.cjs` | report, screenshots | temp artefacts | `tests/results/` | `T\TestResults` |
| `tests/skills_test.cjs` | import CSV, shapefile fixtures, the scratch drawing's Save As | temp artefacts | `%TEMP%\civil3d-mcp-test`, never cleaned | `T\TestData` |
| `tests/skills_test.cjs --mark-verified` | the `verified:` line of `skills/*.skill.md` | source edit (intended) | — | unchanged, allow-listed |
| `test_plugin.cjs` | its log | log | `test_plugin_log.txt` next to the script | `T\test_plugin-yyyyMMdd.log` |
| `tests/run_all.ps1` | the list of running acad.exe | temp artefact | `tests/acad_running.txt` | `T\TestResults\acad_running.txt` |
| `tests/list_acad.bat` | the same, from tasklist/wmic | temp artefact | `tests/results/acad_procs.txt` | `T\TestResults\acad_procs.txt` |

The old outputs (`tests/results/`, `tests/acad_running.txt`, `setup_log.txt`, `test_plugin_log.txt`; `tests/queue/`
was already gone) were left ignored at first, then moved out of the checkout on 2026-11-05 with their `.gitignore`
lines (root [0037](../../../../docs/decisions/0037-code-follows-the-tables.md): leftovers go, ignoring them is not
enough). A script that wrote there again would now show in `git status`.

Nothing in the repo named an ACC path, before or after. No code derives a path from its own assembly
(`RoslynExecutor` reads the acad.exe folder to find Map 3D assemblies, a read).

**Live check, 2026-10-24.** The file watcher on `C:\DC\ACCDocs`, `%APPDATA%\Autodesk\ApplicationPlugins` and the
Revit add-in folder recorded no event during the 15 MCP calls ([live MCP test](../workflows/live-mcp-test.md)).
