---
title: "Known gaps: what is missing, unverified or risky"
type: concept
updated: 2026-11-05
sources: [plugin/Civil3dMcpPlugin/ScriptSandbox.cs, plugin/Civil3dMcpPlugin/RpcTcpServer.cs, plugin/Civil3dMcpPlugin/CommandDispatcher.cs, src/utils/ConnectionManager.ts, plugin/Civil3dMcpPlugin/PluginRuntime.cs, plugin/Civil3dMcpPlugin/Civil3dMcpPlugin.csproj, src/utils/SocketClient.ts, setup_claude.ps1, package.json]
related: [file-writes.md, threading-and-undo.md, ../decisions/0001-code-execution-architecture.md, ../workflows/live-mcp-test.md]
tags: [gaps, security, risk]
---

# Known gaps

**Security**
- No authentication: any local process that reaches `127.0.0.1:8766` can run C# inside Civil 3D while the plugin is
  loaded. `ScriptSandbox` is a regex filter on the script's text (it blocks process start, file and directory
  delete, HTTP, sockets, registry, P/Invoke, `Assembly.Load`), trivially bypassed. The Navisworks MCP solved the same
  with a per-start token (its 0009); nothing like it here yet. `C3DMCPSTOP` stops the listener.
- Roslyn scripts can write files anywhere the user can, ACC included. Only the tool description asks the AI to
  write where the user named ([file writes](file-writes.md)).

**Build and deploy**
- The unsigned DLL triggers Civil 3D's security prompt on every new build until the user picks "Cargar siempre".
- The publish folder carries CEM_CSharpExtended's own dependencies (`SocketIO*.dll`, `Clipper2Lib.dll`), unused by
  the plugin, into the bundle.
- `GenerateAssemblyInfo=false` drops the Windows platform attribute, so the build shows CA1416 warnings (22 on
  2026-11-05).
- The bundle manifest `setup_claude.ps1` writes says `SeriesMin="R25.0"`, so Civil 3D 2025 and 2026 (R25.x, .NET 8)
  would also autoload this `net10.0-windows` DLL, and fail. Found by reading the code, not tried.
- `setup_claude.ps1` registers the server only in `%APPDATA%\Claude` and the MS Store package paths; the main
  machine's Claude Desktop config lives elsewhere (`%LOCALAPPDATA%\Claude-Data\…`), so it was edited by hand.
- `package.json` still names upstream's repository and the ISC licence, while `LICENSE` is MIT. It also declares
  `ws` and `@types/ws`, which nothing imports, `main: index.js`, which does not exist, and version 1.0.0 while the
  server reports 1.2.0.

**Protocol**
- One request per TCP connection, framed by "read until the bytes parse as JSON". The server's
  `data.toString()` per chunk would break a multi-byte UTF-8 character split across chunks; today the plugin's JSON
  escapes every non-ASCII character, so it does not happen.
- The other direction can break. `RpcTcpServer` decodes each 8 KB read on its own (`Encoding.UTF8.GetString` per
  chunk), and the server sends the script as raw UTF-8 (`JSON.stringify` does not escape `ñ` or `á`). A script over
  8 KB with such a character on a read boundary would reach Roslyn with `U+FFFD` in its place. Found by reading
  the code, not reproduced.
- `CommandDispatcher` runs the script on the main thread and blocks that thread with `task.Wait()` until the script
  ends. A script that awaits (top-level `await`) would need the same thread to resume, so Civil 3D would hang, and
  the script timeout cannot help. No skill awaits. Found by reading the code, not tried: it would freeze Civil 3D.
- `SocketClient` keeps each command's `CIVIL3D_COMMAND_TIMEOUT` timer (300 s) after the answer; it does nothing when
  it fires. Harmless in the long-lived server; a short-lived client waits for it (`tests/unit/connection.test.mjs`
  sets a short one).
- `RoslynExecutor` caches compiled scripts by `string.GetHashCode()` with no bound: a long session grows it, and a
  hash collision would run the wrong script.
- `ConnectionManager`'s connect error, which the AI reads, still says "the MCP plugin is loaded (NETLOAD)"; the
  plugin autoloads from the bundle ([0004](../decisions/0004-per-user-bundle-deploy.md)), and `C3DMCPSTATUS` /
  `C3DMCPSTART` are the real checks.
- `C3DMCPSTATUS` always shows "pending: 0": `PluginRuntime` increments `_queueDepth` and decrements it before the first
  await (upstream code).

**Harness**
- The live harness (`run_all.ps1`) closes nothing it did not start, but it rebuilds and redeploys through
  `setup_claude.ps1`, which changes the Claude config.

**Not verified live on 2026-10-24**: `newDrawing`, the `drawing`/`window` capture modes, Save in place and Save As
(deliberately: never save a test drawing), and the 48 skills beyond the four run in the
[live MCP test](../workflows/live-mcp-test.md) (their `verified:` lines date from 2026-10-18).
