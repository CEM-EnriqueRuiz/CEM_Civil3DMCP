---
title: "Connect an agent: register the server with Claude Desktop or Claude Code"
type: workflow
updated: 2026-11-03
sources: [setup_claude.ps1, src/utils/config.ts, README.md, .mcp.json]
related: [../concepts/ports.md, ../decisions/0002-own-port-8766.md, build-and-deploy.md, ../sources/commits/2026-11.md]
tags: [claude, mcp, config]
---

# Connect an agent

**Claude Code inside this repo needs no registration.** The tracked `.mcp.json` declares `civil3d` with the relative
path `build/index.js`, and `.claude/settings.local.json` enables it
([why](../sources/commits/2026-11.md)). `build/` is ignored, so a fresh checkout runs `npm install` and `npm run build`
first. Without a build the server does not start. Civil 3D still has to be running (step 1) for the tools to reach it.

From anywhere else:

1. Civil 3D running with the bundle loaded (`C3DMCPSTATUS` in Civil 3D shows the listener; `C3DMCPSTART` starts it).
2. The server entry, as `setup_claude.ps1` writes it:

```json
"civil3d": { "command": "C:\\Program Files\\nodejs\\node.exe",
             "args": ["D:\\repos\\Cemengal\\CEM_IA\\CEM_Civil3DMCP\\build\\index.js"] }
```

   No `env` for the default port 8766; add `"env": { "CIVIL3D_PORT": "<port>" }` only for another one, which the
   plugin must also see (`setup_claude.ps1 -Port <port>` persists it in the user environment).
3. Quit Claude fully and reopen it. Claude Code outside this repo: `claude mcp add civil3d -- node <repo>\build\index.js`.

The Claude Desktop config on the main machine is not where setup looks
(`%LOCALAPPDATA%\Claude-Data\…\claude_desktop_config.json`), and it belongs to the user: an agent reports the value
to change rather than editing it ([known gaps](../concepts/known-gaps.md)).
