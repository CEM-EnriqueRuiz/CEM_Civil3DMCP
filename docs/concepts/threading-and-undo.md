---
title: "Threading and undo: how a request reaches Civil 3D's main thread, and why a write is one undo step"
type: concept
updated: 2026-10-24
sources: [plugin/Civil3dMcpPlugin/CivilExecution.cs, plugin/Civil3dMcpPlugin/PluginEntry.cs, plugin/Civil3dMcpPlugin/RpcTcpServer.cs, README.md]
related: [../decisions/0001-code-execution-architecture.md, ../modules/plugin.md, known-gaps.md]
tags: [threading, undo, civil3d-api]
---

# Threading and undo

Learned by hand in Civil 3D 2027 (plugin 1.1.3, 2026-10-18) and kept since. The Civil 3D API is single-threaded.

**The request path.** `RpcTcpServer` accepts on a thread-pool thread, reads one JSON object per connection, and
hands it to `PluginRuntime.HandleRawRequestAsync` → `CommandDispatcher`. Work is posted to the
`SynchronizationContext` captured in `PluginEntry.Initialize` (`CivilExecution.CaptureMainThread`).

**The 2 s nudge.** WinForms `Post` sends one window message that drains the whole queue. Civil 3D's Event Viewer
and Welcome panel sometimes swallow it, so a query waited 108–165 s until the next request arrived.
`NudgeWhilePending` re-posts a no-op every 2 s while work is pending.

**Queries** (`civil3d_query`, `ReadAsync`) run in the application context with a transaction that is aborted, and
**no document lock**: a lock taken there is filed as an empty undo step, and the user's `U` then undid nothing. So a
query must create nothing, not even temporary objects, nor call `Database.UpdateExt`.

**Writes** (`civil3d_execute`, `WriteAsync`) are queued, then `SendStringToExecute("_MCPEXEC ")` starts the
registered `MCPEXEC` command, which runs the queue with a document lock and a committed transaction. A real command
is one undo step: `U` echoes `MCPEXEC` and reverts the whole call. `UNDO _BEGIN/_END` inside
`ExecuteInCommandContextAsync` did not capture the changes. If Civil 3D does not start the command within 30 s (a
command or dialog active), the call fails with `CIVIL3D.BUSY` instead of hanging.

**Startup.** The Welcome panel, the DWG-association dialog, the drawing-recovery notice and the unsigned-DLL prompt
block the main thread: the plugin answers `ping` (thread pool) but everything else waits. In a Spanish Civil 3D,
`U` autocompletes to `UNIR`: type `_U`.
