---
title: "0003 — Nothing writes under ACC or next to its DLL or script; logs and artefacts go to %TEMP%\\Cemengal\\Civil3DMCP"
type: decision
status: current
updated: 2026-11-05
sources: [https://github.com/CEM-EnriqueRuiz/CEM_API/issues/82, plugin/Civil3dMcpPlugin/ViewCapture.cs, plugin/Civil3dMcpPlugin/Civil3dMcpPlugin.csproj, tools/cem-temp.cjs, tests/unit/no-acc-writes.test.mjs, tests/unit/cem-temp.test.mjs, setup_claude.ps1, tests/runner.cjs, tests/skills_test.cjs, test_plugin.cjs, ../../CEM_CSharpExtended/CEM_CSharpExtended/Hosting/CemTempFolder.cs]
related: [../sources/issues/CEM-EnriqueRuiz-CEM_API-82.md, ../concepts/file-writes.md, ../modules/plugin.md, ../modules/harness-and-setup.md, ../../../../docs/decisions/0031-nothing-writes-under-acc-logs-in-local-temp.md, ../../../../CEM_CSharpExtended/docs/decisions/0032-temp-folder-for-logs-and-artefacts.md]
tags: [acc, logs, temp, cem_csharpextended, guard]
---

# 0003 — No writes under ACC; logs and artefacts in a self-cleaning temp folder

**Context.** Root decision [0031](../../../../docs/decisions/0031-nothing-writes-under-acc-logs-in-local-temp.md)
(2026-10-24): files written under the Autodesk Desktop Connector root are synced to every colleague. The user asked
that nothing of ours writes there, and that logs go to a local temp folder that cleans itself. The audit of this repo
([file writes](../concepts/file-writes.md)) found no ACC write, but screenshots piling up in `%TEMP%\civil3d-mcp`
with no cleanup, and every script's log or result written next to the script itself. Issue:
[CEM_API#82](../sources/issues/CEM-EnriqueRuiz-CEM_API-82.md). On 2026-10-25 the user confirmed that the MCPs
have no exception to the rule. Only some add-ins keep team files on ACC by design, and this repo has none.

**Decision.**
1. Nothing in this repo writes under a path with an `ACCDocs` segment, or next to its own DLL or script. Reads are
   fine. The user's drawing, saved where the user asked, is the user's data
   ([0005](0005-save-only-where-the-user-asked.md)).
2. Logs and temporary artefacts go to `%TEMP%\Cemengal\Civil3DMCP\`: a log is `<name>-yyyyMMdd.log` in that
   folder; an artefact goes to a kind subfolder (`Screenshots`, `TestResults`, `TestData`, `Queue`, `Recovery`).
   The folder is pruned on the first write of each process: older than 7 days, then the oldest until it holds at
   most 50 MB; locked files are skipped; pruning never throws.
3. **C#** uses CEM_CSharpExtended's `Hosting.CemTempFolder` (sibling `ProjectReference`): the screenshot is
   `CemTempFolder.NewArtifactFile("Civil3DMCP", "Screenshots", "capture", ".png")`, under the user's own temp
   (`CemTempFolder.UserTempPath`), never a host's per-process one. acad.exe's process temp proved to be the user's on
   2026-10-24. The bundle ships
   `CEM_CSharpExtended.dll`: setup copies the whole publish folder and stops if the DLL is missing.
4. **Node and PowerShell** use `tools/cem-temp.cjs`, the same contract in a small CommonJS helper with its own tests
   (`createCemTemp().dir/file/write/logFile/appendLog/prune`, and a CLI for scripts). It also refuses a temp root
   under ACC. The server writes no file at all: its logger writes to stderr.
5. `tests/unit/no-acc-writes.test.mjs` fails when code names an ACC path, derives a path from its own assembly, or
   adds a raw write that does not go through a helper and is not on its allow-list with a reason.

**Why one helper per language.** Root 0031 asks for one C# implementation (CEM_CSharpExtended), and lets Node and
Python keep a small one each. The Node helper serves the harness and the setup, which cannot load the C# one.

**Rejected.** Keeping the repo's `tests/results` and `setup_log.txt` for dev-only scripts (the coordinator chose the
temp folder for them too, 2026-10-24); a background cleanup thread (0031: prune on first write, never block the
host); returning the screenshot only in memory (the user can open the saved copy; it now expires on its own).

**Consequences.** Plugin and harness outputs no longer appear in the checkout; the old `tests/results`,
`setup_log.txt` and `test_plugin_log.txt` stay ignored and untouched (until 2026-11-05, when they were moved out of
the checkout and their `.gitignore` lines dropped: [file writes](../concepts/file-writes.md)). The publish folder also carries
CEM_CSharpExtended's own dependencies (SocketIO, Clipper2), which the plugin never loads ([known gaps](../concepts/known-gaps.md)).
