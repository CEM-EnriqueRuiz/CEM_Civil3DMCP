---
title: "Local ports of the Cemengal MCPs and tools"
type: concept
updated: 2026-10-24
sources: [plugin/Civil3dMcpPlugin/PortSetting.cs, src/utils/config.ts, ../CEM_RevitMCP/server/src/utils/ConnectionManager.ts, ../CEM_NavisworksMCP/docs/decisions/0006-renamed-and-hosted-by-cem-ribbonui.md]
related: [../decisions/0002-own-port-8766.md, ../workflows/connect-an-agent.md]
tags: [port, config, revit, navisworks, qmd]
---

# Ports

Every server below listens on `127.0.0.1` only. Two of them on one port means one MCP's calls reach the other app:
that happened with Civil 3D and Revit on 8080 until 2026-10-24 ([0002](../decisions/0002-own-port-8766.md)).

| Port | Who listens | Who connects | Override |
|---|---|---|---|
| 8080 | Revit MCP plugin, inside Revit (CEM_RevitMCP) | `cem-revit-ai` server | none |
| 8765 | Navisworks AI Modeler, inside Navisworks (CEM_NavisworksMCP) | `cem-navis-aimodeler` client | its settings |
| **8766** | **Civil 3D MCP plugin, inside acad.exe (this repo)** | `civil3d-mcp` server (`build/index.js`) | `CIVIL3D_PORT` in both halves |
| 8181 | the machine's shared qmd server | every repo's `.mcp.json` | — |

The AutoCAD MCP (CEM_AutocadMCP) drives AutoCAD through COM and opens no port. Before choosing a new port, check it
is free (`netstat -ano | findstr LISTENING`) and outside Windows' excluded ranges
(`netsh int ipv4 show excludedportrange protocol=tcp`), and add it here.
