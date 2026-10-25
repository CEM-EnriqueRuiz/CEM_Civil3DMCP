---
name: cem-civil3dmcp-dev
description: Develop CEM_Civil3DMCP, the Civil 3D 2027 MCP fork — the .NET 10 plugin inside acad.exe (TCP JSON-RPC on 8766, Roslyn code execution, main-thread marshalling, MCPEXEC undo, view capture, save), the Node MCP server tools (civil3d_query/execute/skills/screenshot/save), the C# skill templates, the unit and guard tests, the bundle deploy and the live harness. Triggers "Civil 3D MCP", "CEM_Civil3DMCP", "civil3d-mcp", "Civil 3D plugin", "MCP tool for Civil 3D".
---

# CEM_Civil3DMCP development

A fork of `barbosaihan/civil3d-mcp`. Inside Civil 3D 2027, `plugin/Civil3dMcpPlugin` (net10.0-windows, loaded from the
per-user bundle `%APPDATA%\Autodesk\ApplicationPlugins\CEM_Civil3DMCP.bundle`) listens on `127.0.0.1:8766` and answers
one JSON-RPC request per TCP connection (`executeCode`, `getCivil3DHealth`, `captureView`, `saveDrawing`, `newDrawing`,
`ping`). Outside, `src/` is a Node MCP server over stdio (`build/index.js`) whose five tools turn into those calls;
`skills/` holds the tested C# templates that `civil3d_skills` serves.

**Before planning or editing, read [docs/index.md](../../../docs/index.md) ("Start here"), then the pages it names.**
Search with qmd when the index is not enough (`qmd query -c cem_civil3dmcp "..."`).

## Hard rules

- It is a fork: keep upstream's layout (`plugin/`, `src/`, `skills/`) and record every divergence in
  [upstream and fork](../../../docs/concepts/upstream-and-fork.md); pull upstream by merge.
- **Port 8766** is the default in the plugin (`PortSetting.Default`), the server (`src/utils/config.ts`) and
  `setup_claude.ps1`; `CIVIL3D_PORT` overrides it in all three, and setup persists it only for a non-default port.
  Never 8080: that is the Revit MCP's port ([0002](../../../docs/decisions/0002-own-port-8766.md)). `npm test` pins it.
- **Nothing writes under ACC (`ACCDocs`) or next to its own DLL or script.** Logs and temporary artefacts go to
  `%TEMP%\Cemengal\Civil3DMCP\` (`<name>-yyyyMMdd.log`, `<Kind>\`), pruned on the first write of each process: C# through
  CEM_CSharpExtended `Hosting`, Node and the setup through `tools/cem-temp.cjs`. Settings stay in `%APPDATA%`
  ([0003](../../../docs/decisions/0003-no-acc-writes-temp-folder.md), root
  [0031](../../../../../docs/decisions/0031-nothing-writes-under-acc-logs-in-local-temp.md)). The guard test fails on a
  new raw write.
- **The drawing is saved only by `civil3d_save`**, to the absolute `.dwg` path the user asked for, or in place
  ([0005](../../../docs/decisions/0005-save-only-where-the-user-asked.md)). Never save a test drawing.
- Every request runs on the AutoCAD main thread through the `SynchronizationContext` captured at load, nudged every 2 s;
  `civil3d_execute` runs inside the `MCPEXEC` command (one undo step), `civil3d_query` runs without a document lock and
  must create nothing ([0001](../../../docs/decisions/0001-code-execution-architecture.md),
  [threading and undo](../../../docs/concepts/threading-and-undo.md)).
- The plugin listens on loopback only. `ScriptSandbox` is a text filter, not a sandbox; do not describe it as one.
- Test code never ships: the bundle is the plugin's `dotnet publish` output only, and npm ships `build/` only.

## Verify

```powershell
npm test                                                     # build, then unit, contract and guard tests (node:test)
dotnet test plugin\Civil3dMcpPlugin.Tests -v minimal         # the plugin's pure logic (xunit, .NET 10 SDK)
dotnet build plugin\Civil3dMcpPlugin\Civil3dMcpPlugin.csproj -c Release -v minimal   # 0 errors
python ..\..\tools\wiki\wiki_lint.py .                       # 0 errors
```

Anything inside Civil 3D is checked live through the MCP server ([live MCP test](../../../docs/workflows/live-mcp-test.md)).
A rebuilt plugin needs a Civil 3D restart because `acad.exe` locks the DLL; ask before closing or starting Civil 3D.
TDD for new logic: [tdd-and-test-runner](../../../../../docs/workflows/tdd-and-test-runner.md).

## Finish: commit-time ingest

Every commit carries its own wiki update (CROSS_REPO.md §4/§9): the source page in `docs/sources/` with each decision,
its reason and the rejected alternatives; the affected pages; `docs/index.md` for new pages; one `docs/log.md` entry.
Run `python ../../tools/wiki/wiki_lint.py .` to 0 errors and commit one line: `TYPE - Description. <issue URL>`
([finish a change](../../../docs/workflows/finish-a-change.md)).
