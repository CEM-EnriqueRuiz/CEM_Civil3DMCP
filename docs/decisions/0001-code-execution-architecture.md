---
title: "0001 — Code execution: three meta-tools run C# through Roslyn inside Civil 3D, on its main thread"
type: decision
status: current
updated: 2026-10-24
sources: [d6b953d, plugin/Civil3dMcpPlugin/RoslynExecutor.cs, plugin/Civil3dMcpPlugin/CivilExecution.cs, plugin/Civil3dMcpPlugin/PluginEntry.cs, src/tools/register.ts, README.md]
related: [../concepts/threading-and-undo.md, ../modules/plugin.md, ../modules/mcp-server.md, ../modules/skills-library.md, ../concepts/upstream-and-fork.md]
tags: [architecture, roslyn, threading, undo, upstream]
---

# 0001 — Code execution through Roslyn, on Civil 3D's main thread

**Context.** Upstream first exposed 50+ fixed tools, one C# handler each. On 2026-05-15 (`d6b953d`) it replaced
them with code execution: the AI writes C# against the full AutoCAD, Civil 3D and Map 3D .NET API, and tested
templates (`skills/`) replace the fixed handlers. Our fork adopts that architecture as-is.

**Decision.**
1. Five MCP tools: `civil3d_query` (read-only), `civil3d_execute` (write), `civil3d_skills` (the templates), plus
   `civil3d_screenshot` and `civil3d_save` (added in the Cemengal work, 2026-10). They map onto six JSON-RPC
   methods of the plugin: `executeCode`, `getCivil3DHealth`, `captureView`, `saveDrawing`, `newDrawing`, `ping`.
2. `RoslynExecutor` compiles each script with every loaded assembly as a reference (minus the stock subassembly
   assemblies, whose `Subassembly` namespace clashes) and the globals of `ScriptContext` (`Document`, `CivilDoc`,
   `Database`, `Transaction`, `Editor`). Map 3D assemblies are referenced but not imported.
3. Every request runs on the AutoCAD main thread, through the `SynchronizationContext` captured in
   `IExtensionApplication.Initialize`, re-posted every 2 s while pending
   ([threading and undo](../concepts/threading-and-undo.md)).
4. A write runs inside the registered `MCPEXEC` command, so one `civil3d_execute` is one undo step; a query runs
   without a document lock and must create nothing.

**Why.** A fixed tool set never covers Civil 3D; templates plus code keep the plugin small. The main-thread and
undo rules come from failures seen by hand in Civil 3D 2027 (queries waiting 100+ s; `UNDO _BEGIN/_END` not
capturing changes; a read lock filed as an empty undo step).

**Rejected.** Running scripts on the TCP thread (the Civil 3D API is single-threaded);
`ExecuteInCommandContextAsync` with `UNDO` marks (did not capture the changes); a document lock for queries
(made `U` undo nothing).

**Consequences.** `ScriptSandbox` is a text filter, not a sandbox: any local process that reaches the port can run
C# inside Civil 3D while the plugin is loaded ([known gaps](../concepts/known-gaps.md)).
