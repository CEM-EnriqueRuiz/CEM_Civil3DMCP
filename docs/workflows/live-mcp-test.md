---
title: "Live MCP test: drive Civil 3D through the MCP server, with the recorded results"
type: workflow
updated: 2026-10-25
sources: [src/tools/, plugin/Civil3dMcpPlugin/, tests/runner.cjs, https://github.com/CEM-EnriqueRuiz/CEM_API/issues/82]
related: [build-and-deploy.md, test.md, connect-an-agent.md, ../concepts/file-writes.md, ../concepts/known-gaps.md, ../sources/issues/CEM-EnriqueRuiz-CEM_API-82.md]
tags: [live, smoke-test, mcp, verification]
---

# Live MCP test

"Through MCP" means real MCP calls over stdio to `node build\index.js`, launched exactly as the user's Claude Desktop
`civil3d` entry says (command, args, env), not raw socket calls. A small client with the Python `mcp` package
(`CEM_AutocadMCP\.venv`) or the MCP SDK's `Client` (as `tests/runner.cjs` does) is enough. Use the test drawing
opened read-only, never save it, and keep every call harmless: reads, a screenshot, create-then-delete.

## Recorded run, 2026-10-24 (plugin 1.2.0, server 1.2.0, Civil 3D 2027 26.0)

For [CEM_API#82](../sources/issues/CEM-EnriqueRuiz-CEM_API-82.md). Drawing: the user's Civil 3D test drawing in
`CEM_Test\MCP`, opened read-only through COM. A public wiki does not name project files. The Claude Desktop entry had
no `env`, so the server used the default port 8766. 15 calls between 21:27:36 and 21:28:39:

| Call | Result |
|---|---|
| `civil3d_skills list` / `get` ×4 | 48 skills; templates for drawing_info, list_surfaces, list_alignments, list_cogo_points |
| `civil3d_query` drawing_info | metres, CS `CANQ-M8`; 8 surfaces, 9 alignments, 2 corridors, 1 site, 5 pipe networks, 0 COGO points (36.5 s: the first script compiles Roslyn) |
| `civil3d_query` list_surfaces | 8 TIN surfaces (e.g. `SU-EX-ZONE 4-5-6`, 4 627 points, 33.5–39.8 m) |
| `civil3d_query` list_alignments | 9 alignments (e.g. `PLUVIAL 1`, 606.67 m) |
| `civil3d_query` list_cogo_points | 0 points |
| `civil3d_query` layers | 958 model-space entities on 63 layers |
| `civil3d_query` DBMOD | 1 before any write: Civil 3D flags the drawing on open |
| `civil3d_screenshot` view | 1200×439 PNG returned; copy at `%TEMP%\Cemengal\Civil3DMCP\Screenshots\capture_20261024_212831_687.png` |
| `civil3d_execute` create line | handle `256DB`, 959 entities |
| `civil3d_execute` erase it | erased, 958 entities |
| `civil3d_query` confirm | handle gone |
| `civil3d_save` `copy.dwg` | refused: "Path must be absolute"; nothing saved |

Port check during the run: `127.0.0.1:8766` held by acad.exe, nothing on 8080. The file watcher recorded no event
under `C:\DC\ACCDocs` or the deployed add-in folders during the calls; the deploy itself (21:13:10–15) changed only
`CEM_Civil3DMCP.bundle`. `test_plugin.cjs` logged to `%TEMP%\Cemengal\Civil3DMCP\test_plugin-20261024.log`.
Civil 3D was then closed with both drawings unsaved; the test drawing kept its date and size.

Not run live: see [known gaps](../concepts/known-gaps.md).
