---
title: "Known gaps: what is missing, unverified or risky"
type: concept
updated: 2026-10-24
sources: [plugin/Civil3dMcpPlugin/ScriptSandbox.cs, plugin/Civil3dMcpPlugin/RpcTcpServer.cs, plugin/Civil3dMcpPlugin/Civil3dMcpPlugin.csproj, src/utils/SocketClient.ts, setup_claude.ps1, package.json, tests/kill_stale_acad.bat, test_plugin.js]
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
- `GenerateAssemblyInfo=false` drops the Windows platform attribute, so the build shows ~25 CA1416 warnings.
- `setup_claude.ps1` registers the server only in `%APPDATA%\Claude` and the MS Store package paths; the main
  machine's Claude Desktop config lives elsewhere (`%LOCALAPPDATA%\Claude-Data\…`), so it was edited by hand.
- `package.json` still names upstream's repository and the ISC licence, while `LICENSE` is MIT.

**Protocol**
- One request per TCP connection, framed by "read until the bytes parse as JSON". The server's
  `data.toString()` per chunk would break a multi-byte UTF-8 character split across chunks; today the plugin's JSON
  escapes every non-ASCII character, so it does not happen.
- `RoslynExecutor` caches compiled scripts by `string.GetHashCode()` with no bound: a long session grows it, and a
  hash collision would run the wrong script.

**Harness**
- `tests/kill_stale_acad.bat` kills a hard-coded PID (15724) if its window says `Dibujo1`: a leftover of one night.
- `test_plugin.js` duplicates `test_plugin.cjs` and cannot run (the package is ESM, it uses `require`).
- The live harness (`run_all.ps1`) closes nothing it did not start, but it rebuilds and redeploys through
  `setup_claude.ps1`, which changes the Claude config.

**Not verified live on 2026-10-24**: `newDrawing`, the `drawing`/`window` capture modes, Save in place and Save As
(deliberately: never save a test drawing), and the 48 skills beyond the four run in the
[live MCP test](../workflows/live-mcp-test.md) (their `verified:` lines date from 2026-10-18).
