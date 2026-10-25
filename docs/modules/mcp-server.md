---
title: "The Node MCP server (civil3d-mcp, build/index.js) and its five tools"
type: module
updated: 2026-10-24
sources: [src/index.ts, src/tools/register.ts, src/tools/queryTool.ts, src/tools/executeTool.ts, src/tools/skillsTool.ts, src/tools/screenshotTool.ts, src/tools/saveTool.ts, src/utils/ConnectionManager.ts, src/utils/SocketClient.ts, src/utils/config.ts, src/utils/logger.ts, package.json, tsconfig.json]
related: [plugin.md, skills-library.md, ../decisions/0001-code-execution-architecture.md, ../decisions/0002-own-port-8766.md, ../workflows/connect-an-agent.md]
tags: [mcp, node, typescript, tools]
---

# MCP server

TypeScript in `src/`, compiled by `tsc` to `build/` (ESM, Node16 modules), started over stdio as
`node build/index.js`; server name `civil3d-mcp`, version 1.2.0. Dependencies: `@modelcontextprotocol/sdk`, `zod`.

| Tool | Plugin call | Notes |
|---|---|---|
| `civil3d_query` | `executeCode` `readOnly: true` | never committed, no undo step, no lock: create nothing |
| `civil3d_execute` | `executeCode` `readOnly: false` | one `MCPEXEC` = one undo step; not saved; the description tells the AI where scripts may write |
| `civil3d_skills` | — (reads `skills/`) | `list`, `search`, `get` ([skills library](skills-library.md)) |
| `civil3d_screenshot` | `captureView` | returns the image plus "Saved to `%TEMP%\Cemengal\Civil3DMCP\Screenshots\…`" |
| `civil3d_save` | `saveDrawing` | in place, or Save As to an absolute `.dwg` path; only when and where the user asked |

`ConnectionManager.withApplicationConnection` opens one TCP connection per call to `CIVIL3D_HOST`
(`localhost`) : `resolvePort(CIVIL3D_PORT)` (default 8766, [0002](../decisions/0002-own-port-8766.md)), with a
5 s connect timeout (`CIVIL3D_CONNECT_TIMEOUT`); `SocketClient` waits `CIVIL3D_COMMAND_TIMEOUT` (300 000 ms) for
the response. `logger.ts` writes to stderr only, at `LOG_LEVEL` (`info`); the server writes no file.

`skillsTool` finds `skills/` relative to its own build folder (`build/tools/../../skills`): a read, never a write.
