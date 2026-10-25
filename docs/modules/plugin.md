---
title: "Civil3dMcpPlugin — the .NET 10 plugin inside acad.exe"
type: module
updated: 2026-10-24
sources: [plugin/Civil3dMcpPlugin/Civil3dMcpPlugin.csproj, plugin/Civil3dMcpPlugin/PluginEntry.cs, plugin/Civil3dMcpPlugin/PluginRuntime.cs, plugin/Civil3dMcpPlugin/CommandDispatcher.cs, plugin/Civil3dMcpPlugin/CivilExecution.cs, plugin/Civil3dMcpPlugin/RoslynExecutor.cs, plugin/Civil3dMcpPlugin/ViewCapture.cs, plugin/Civil3dMcpPlugin/DrawingFile.cs, plugin/Civil3dMcpPlugin/PortSetting.cs, plugin/Civil3dMcpPlugin/SavePath.cs]
related: [../decisions/0001-code-execution-architecture.md, ../decisions/0002-own-port-8766.md, ../decisions/0003-no-acc-writes-temp-folder.md, ../decisions/0005-save-only-where-the-user-asked.md, ../concepts/threading-and-undo.md, mcp-server.md]
tags: [plugin, csharp, civil3d, roslyn]
---

# Civil3dMcpPlugin

`plugin/Civil3dMcpPlugin`, SDK-style, `net10.0-windows` (Civil 3D 2027 runs on .NET 10; 2025/2026 used .NET 8),
version `PluginRuntime.Version` = 1.2.0. References: the five Civil 3D DLLs from `C_References/` (copied by setup,
`Private=False`), `Microsoft.CodeAnalysis.CSharp.Scripting` 4.12.0, and the sibling CEM_CSharpExtended
(`ProjectReference ..\..\..\..\CEM_CSharpExtended\CEM_CSharpExtended\CEM_CSharpExtended.csproj`).

| File | Role |
|---|---|
| `PluginEntry.cs` | `IExtensionApplication`: captures the main thread, starts the listener; commands `MCPEXEC` (internal), `C3DMCPSTART`, `C3DMCPSTOP`, `C3DMCPSTATUS` |
| `PluginRuntime.cs` | listener lifecycle, `Port` (= `PortSetting.Resolve(CIVIL3D_PORT)`), `TempApp = "Civil3DMCP"`, JSON-RPC parse/serialize, parameter helpers |
| `PortSetting.cs` | default 8766, `CIVIL3D_PORT` 1–65535 ([0002](../decisions/0002-own-port-8766.md)); pure, unit-tested |
| `RpcTcpServer.cs` | `TcpListener` on `IPAddress.Loopback`; one JSON object per connection |
| `CommandDispatcher.cs` | `executeCode`, `getCivil3DHealth`, `captureView`, `saveDrawing`, `newDrawing`, `ping` |
| `CivilExecution.cs` | main-thread marshalling, the nudge, `ReadAsync` (no lock, aborted) and `WriteAsync` (via `MCPEXEC`) ([threading and undo](../concepts/threading-and-undo.md)) |
| `RoslynExecutor.cs` | compile and run; references = loaded assemblies; Map 3D loaded on demand; cache by hash; timeout `CIVIL3D_SCRIPT_TIMEOUT` (300 s) |
| `ScriptContext.cs` | the script globals `Document`, `CivilDoc`, `Database`, `Transaction`, `Editor` |
| `ScriptSandbox.cs` | regex filter on the script text (not a sandbox; [known gaps](../concepts/known-gaps.md)) |
| `ViewCapture.cs` | `view` (`CapturePreviewImage`), `drawing` and `window` (`PrintWindow`); PNG to `%TEMP%\Cemengal\Civil3DMCP\Screenshots` through `CemTempFolder`, returned as base64 |
| `DrawingFile.cs` | `SaveAsync` (COM `Save`/`SaveAs`, path checked by `SavePath`), `Automation.NewDrawingAsync` (QNEW template) |
| `SavePath.cs` | absolute `.dwg` path in an existing folder, normalised ([0005](../decisions/0005-save-only-where-the-user-asked.md)); pure, unit-tested |
| `JsonRpcDispatchException.cs` | error with a `CIVIL3D.*` code; its own file so the tests can compile it |

**Error codes:** `CIVIL3D.INVALID_INPUT`, `NO_DRAWING`, `BUSY`, `TIMEOUT`, `COMPILATION_ERROR`, `SANDBOX_VIOLATION`,
`CAPTURE_FAILED`, `TRANSACTION_FAILED`.

**Files it writes:** the screenshot (temp) and the drawing the user asked to save; nothing else
([file writes](../concepts/file-writes.md)). It never reads its own assembly's location.
