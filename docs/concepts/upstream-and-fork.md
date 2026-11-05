---
title: "Upstream and fork: what barbosaihan/civil3d-mcp is and what Cemengal changed"
type: concept
updated: 2026-11-05
sources: [git log, d6b953d, ef0e7db, 9506566, README.md]
related: [../sources/commits/2026-05.md, ../sources/commits/2026-10.md, ../sources/issues/CEM-EnriqueRuiz-CEM_API-82.md, ../decisions/0001-code-execution-architecture.md, ../overview.md]
tags: [fork, upstream, history]
---

# Upstream and fork

- `origin`: https://github.com/CEM-EnriqueRuiz/CEM_Civil3DMCP (the Cemengal fork).
- `upstream`: https://github.com/barbosaihan/civil3d-mcp (MIT).

**Lineage.** Upstream began as a copy of the Revit MCP TypeScript server (`revit-mcp`, 2025-03/04, the same family
as CEM_RevitMCP), was adapted to Civil 3D in 2025-06 (`9506566`), rebuilt on 2026-05-14 as a domain-based server
with a C# plugin (`ef0e7db`), and on 2026-05-15 replaced its fixed tools with code execution through Roslyn plus 11
skill templates (`d6b953d`). The fork base is `344ad15` (2026-05-15). Details: [2026-05](../sources/commits/2026-05.md).

**What Cemengal changed** (committed together on 2026-10-25, the fork's first Cemengal commit: the user's work in
[2026-10](../sources/commits/2026-10.md), the rest in [CEM_API#82](../sources/issues/CEM-EnriqueRuiz-CEM_API-82.md)):
- Civil 3D 2027 on .NET 10 (`net10.0-windows`), the per-user bundle `CEM_Civil3DMCP.bundle` and
  `setup_claude.ps1` ([0004](../decisions/0004-per-user-bundle-deploy.md)).
- Main-thread marshalling with the 2 s nudge, `MCPEXEC` writes, lock-free queries
  ([threading and undo](threading-and-undo.md)).
- `civil3d_screenshot` (`ViewCapture`), `civil3d_save` (`DrawingFile`), the `newDrawing` and `ping` methods.
- 48 skills (from 11), each `verified:` against Civil 3D 2027 by `tests/skills_test.cjs`; Map 3D references.
- Port 8766 ([0002](../decisions/0002-own-port-8766.md)), the temp folder and guards
  ([0003](../decisions/0003-no-acc-writes-temp-folder.md)), the save-path check
  ([0005](../decisions/0005-save-only-where-the-user-asked.md)), the unit suites
  ([0006](../decisions/0006-tests-node-and-xunit.md)), and this wiki.
- Upstream comments that contradicted the fork, corrected on 2026-11-05 (comments only): `ScriptSandbox` called a
  security sandbox, `PluginEntry` loaded by NETLOAD, `C_References/README.md` written for AutoCAD 2025.

**Rules for change.** Keep upstream's layout (`plugin/`, `src/`, `skills/`); record each divergence here. Pull
upstream by merge, never rebase the fork; never push to `upstream`. Upstream's `package.json` still names
`civil3d-mcp/civil3d-mcp` and ISC while `LICENSE` is MIT ([known gaps](known-gaps.md)).
