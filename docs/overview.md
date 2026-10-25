---
title: "CEM_Civil3DMCP — overview"
type: overview
updated: 2026-10-24
sources: [README.md, plugin/Civil3dMcpPlugin/, src/, skills/, setup_claude.ps1]
related: [index.md, concepts/upstream-and-fork.md, modules/plugin.md, modules/mcp-server.md, ../../../docs/overview.md]
tags: [overview, mcp, civil3d]
---

# CEM_Civil3DMCP overview

An MCP bridge that lets an AI agent work in **Autodesk Civil 3D 2027**: write and run C# against the full AutoCAD,
Civil 3D and Map 3D .NET API, read the drawing, look at it, and save it when the user asks. A fork of
`barbosaihan/civil3d-mcp` ([upstream and fork](concepts/upstream-and-fork.md)).

```
Claude / any MCP client ──stdio──► node build/index.js (civil3d-mcp) ──TCP JSON-RPC 127.0.0.1:8766──► Civil3dMcpPlugin.dll
                                   5 tools, skills/ templates                                          inside acad.exe (Roslyn, main thread)
```

**Parts**
- [Plugin](modules/plugin.md): `plugin/Civil3dMcpPlugin`, `net10.0-windows`, autoloaded from the per-user bundle
  `%APPDATA%\Autodesk\ApplicationPlugins\CEM_Civil3DMCP.bundle` ([0004](decisions/0004-per-user-bundle-deploy.md)).
- [MCP server](modules/mcp-server.md): `src/` → `build/index.js`; tools `civil3d_query`, `civil3d_execute`,
  `civil3d_skills`, `civil3d_screenshot`, `civil3d_save`.
- [Skills library](modules/skills-library.md): 48 C# templates verified in Civil 3D 2027.
- [Setup and live harness](modules/harness-and-setup.md), and `tools/cem-temp.cjs`.

**A request.** The server opens one TCP connection per tool call; the plugin parses it on a thread-pool thread, posts
the work to Civil 3D's main thread, runs the script in a transaction (aborted for a query, committed inside the
`MCPEXEC` command for a write) and answers JSON ([threading and undo](concepts/threading-and-undo.md)).

**In the product family.** One of the Cemengal MCPs, beside CEM_RevitMCP (Revit, port 8080), CEM_NavisworksMCP
(Navisworks, 8765) and CEM_AutocadMCP (AutoCAD through COM): [ports](concepts/ports.md). It shares the C# library
CEM_CSharpExtended (`Hosting.CemTempFolder`) and the workspace rule that nothing writes under ACC
([0003](decisions/0003-no-acc-writes-temp-folder.md)). The root wiki: [overview](../../../docs/overview.md).
