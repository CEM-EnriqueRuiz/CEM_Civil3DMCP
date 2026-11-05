---
title: "CEM_Civil3DMCP wiki — index"
type: index
updated: 2026-11-05
sources: [README.md, CLAUDE.md, .claude/skills/cem-civil3dmcp-dev/SKILL.md]
related: [overview.md, log.md]
tags: [index]
---

# CEM_Civil3DMCP wiki

## Start here

**1. Read [overview.md](overview.md).** CEM_Civil3DMCP is a **fork of `barbosaihan/civil3d-mcp`**: a .NET 10
plugin inside Civil 3D 2027 (`plugin/Civil3dMcpPlugin`, TCP JSON-RPC on `127.0.0.1:8766`, the per-user bundle
`CEM_Civil3DMCP.bundle`) and a Node MCP server (`src/` → `build/index.js`, `civil3d-mcp`) whose tools run C# in the
drawing, serve the `skills/` templates, capture the view and save the drawing. Upstream vs ours:
[upstream and fork](concepts/upstream-and-fork.md).

**2. Hard rules.** Each links to its reason.

1. Keep upstream's layout and record every divergence; pull upstream by merge → [upstream and fork](concepts/upstream-and-fork.md)
2. Port **8766** in the plugin, the server and `setup_claude.ps1`; `CIVIL3D_PORT` overrides it, and setup persists it
   only for another port; never 8080 (the Revit MCP's) → [0002](decisions/0002-own-port-8766.md), [ports](concepts/ports.md)
3. Nothing writes under ACC or next to its own DLL or script; logs and artefacts go to `%TEMP%\Cemengal\Civil3DMCP`,
   through `CemTempFolder` (C#) or `tools/cem-temp.cjs` (scripts); the guard test fails on a new raw write
   → [0003](decisions/0003-no-acc-writes-temp-folder.md), root [0031](../../../docs/decisions/0031-nothing-writes-under-acc-logs-in-local-temp.md)
4. The drawing is saved only by `civil3d_save`, in place or to the absolute `.dwg` path the user asked for; never
   save a test drawing → [0005](decisions/0005-save-only-where-the-user-asked.md)
5. Every request runs on Civil 3D's main thread; a write is one `MCPEXEC` command (one undo step); a query takes no
   lock and creates nothing → [0001](decisions/0001-code-execution-architecture.md), [threading and undo](concepts/threading-and-undo.md)
6. Loopback only; `ScriptSandbox` is a text filter, not a sandbox → [known gaps](concepts/known-gaps.md)
7. Test code never ships; a rebuilt plugin needs a Civil 3D restart, asked for first → [0006](decisions/0006-tests-node-and-xunit.md), [0004](decisions/0004-per-user-bundle-deploy.md)

**3. Before you change X, read Y.**

| Task / area | Read |
|---|---|
| A tool, a JSON-RPC method, the server | [MCP server](modules/mcp-server.md), [plugin](modules/plugin.md), [0001](decisions/0001-code-execution-architecture.md) |
| Threading, undo, "Civil 3D does not answer", `CIVIL3D.BUSY` | [threading and undo](concepts/threading-and-undo.md) |
| The port, connecting Claude | [0002](decisions/0002-own-port-8766.md), [ports](concepts/ports.md), [connect an agent](workflows/connect-an-agent.md) |
| Any file write: a log, a screenshot, an export, a script's output | [0003](decisions/0003-no-acc-writes-temp-folder.md), [file writes](concepts/file-writes.md), [harness and setup](modules/harness-and-setup.md) |
| Saving the drawing | [0005](decisions/0005-save-only-where-the-user-asked.md) |
| A skill template | [add a skill](workflows/add-a-skill.md), [skills library](modules/skills-library.md) |
| csproj, the bundle, setup, a new Civil 3D year | [build and deploy](workflows/build-and-deploy.md), [0004](decisions/0004-per-user-bundle-deploy.md) |
| Tests | [test](workflows/test.md), [0006](decisions/0006-tests-node-and-xunit.md) |
| Pulling from upstream | [upstream and fork](concepts/upstream-and-fork.md) |
| Anything | [known gaps](concepts/known-gaps.md): no authentication, scripts may write anywhere, the unsigned DLL, untested live paths |

**4. Build, test, verify:** [build and deploy](workflows/build-and-deploy.md); [test](workflows/test.md) with
`npm test` and `dotnet test plugin\Civil3dMcpPlugin.Tests`; then the [live MCP test](workflows/live-mcp-test.md) for
anything that runs in Civil 3D.

**5. Finish:** [finish a change](workflows/finish-a-change.md). Every commit carries its `docs/` update. Lint with
`python ../../tools/wiki/wiki_lint.py .`. The message is one line, `TYPE - Description. <issue URL>`, committed on
`main` after the user sends the issue link.

## Catalog

### Hub

- [overview.md](overview.md): what the fork is, its parts, the request path, place in the family.
- [log.md](log.md): append-only history of ingests, lints and queries.

### Modules

- [plugin](modules/plugin.md): `Civil3dMcpPlugin`, the files, methods, error codes and what it writes.
- [mcp-server](modules/mcp-server.md): `src/`, the five tools, connection and timeouts.
- [skills-library](modules/skills-library.md): the 48 C# templates and their format.
- [harness-and-setup](modules/harness-and-setup.md): `setup_claude.ps1`, `tools/cem-temp.cjs`, the live harness scripts.

### Concepts

- [upstream-and-fork](concepts/upstream-and-fork.md): lineage, what Cemengal changed, how to sync.
- [threading-and-undo](concepts/threading-and-undo.md): the main thread, the nudge, `MCPEXEC`, lock-free queries.
- [file-writes](concepts/file-writes.md): every write, its kind, before and after root 0031.
- [ports](concepts/ports.md): Revit 8080, Navisworks 8765, Civil 3D 8766, qmd 8181.
- [known-gaps](concepts/known-gaps.md): what is missing, unverified or risky.

### Workflows

- [build-and-deploy](workflows/build-and-deploy.md): build, publish, deploy as a user or an agent, the restart.
- [test](workflows/test.md): the two suites and what they cannot cover.
- [live-mcp-test](workflows/live-mcp-test.md): driving Civil 3D through the MCP server, with the recorded results.
- [connect-an-agent](workflows/connect-an-agent.md): the Claude entry and the port.
- [add-a-skill](workflows/add-a-skill.md): a new template, verified live.
- [finish-a-change](workflows/finish-a-change.md): commit with the wiki ingest.

### Decisions

- [0001](decisions/0001-code-execution-architecture.md): code execution through Roslyn on the main thread (current).
- [0002](decisions/0002-own-port-8766.md): Civil 3D's own port, 8766 (current).
- [0003](decisions/0003-no-acc-writes-temp-folder.md): no writes under ACC; the self-cleaning temp folder (current).
- [0004](decisions/0004-per-user-bundle-deploy.md): the per-user ApplicationPlugins bundle (current).
- [0005](decisions/0005-save-only-where-the-user-asked.md): save only where the user asked (current).
- [0006](decisions/0006-tests-node-and-xunit.md): node:test and xunit; the live harness is not a test (current).

### Sources

- [commits 2026-05](sources/commits/2026-05.md): upstream's history to the fork base.
- [commits 2026-10](sources/commits/2026-10.md): the user's Civil 3D 2027 work (no issue), committed with #82.
- [commits 2026-11](sources/commits/2026-11.md): the project-level `civil3d` entry in `.mcp.json`, and the
  2026-11-05 maintenance review with its unapplied proposals P1–P9 (no issue).
- [CEM_API#82](sources/issues/CEM-EnriqueRuiz-CEM_API-82.md): nothing written into ACC; port 8766, the temp folder,
  the save-path check, the tests, the onboarding and the live run, with every decision and its reasons.
