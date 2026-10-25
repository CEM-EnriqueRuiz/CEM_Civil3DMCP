---
title: "Connect an agent: register the server with Claude Desktop or Claude Code"
type: workflow
updated: 2026-10-24
sources: [setup_claude.ps1, src/utils/config.ts, README.md]
related: [../concepts/ports.md, ../decisions/0002-own-port-8766.md, build-and-deploy.md]
tags: [claude, mcp, config]
---

# Connect an agent

1. Civil 3D running with the bundle loaded (`C3DMCPSTATUS` in Civil 3D shows the listener; `C3DMCPSTART` starts it).
2. The server entry, as `setup_claude.ps1` writes it:

```json
"civil3d": { "command": "C:\\Program Files\\nodejs\\node.exe",
             "args": ["D:\\repos\\Cemengal\\CEM_IA\\CEM_Civil3DMCP\\build\\index.js"] }
```

   No `env` for the default port 8766; add `"env": { "CIVIL3D_PORT": "<port>" }` only for another one, which the
   plugin must also see (`setup_claude.ps1 -Port <port>` persists it in the user environment).
3. Quit Claude fully and reopen it. Claude Code: `claude mcp add civil3d -- node <repo>\build\index.js`.

The Claude Desktop config on the main machine is not where setup looks
(`%LOCALAPPDATA%\Claude-Data\…\claude_desktop_config.json`), and it belongs to the user: an agent reports the value
to change rather than editing it ([known gaps](../concepts/known-gaps.md)).
