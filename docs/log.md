---
title: "Wiki log"
type: log
updated: 2026-11-05
sources: []
related:
  - index.md
tags: [log]
---

# Wiki log

This log is append-only. Each entry uses the heading `## [YYYY-MM-DD] ingest|decision|lint|query | title`.

## [2026-10-24] ingest | Bootstrap: onboarding, port 8766, the temp folder (root 0031), save-path check, tests and the wiki

The repo joins the Cemengal system: schema files, the `cem-civil3dmcp-dev` skill and this wiki, modelled on
CEM_NavisworksMCP's. The user's uncommitted Civil 3D 2027 work (to 2026-10-18) is recorded as found. New: port 8766
instead of the Revit MCP's 8080 ([0002](decisions/0002-own-port-8766.md)); screenshots and every script's output in
`%TEMP%\Cemengal\Civil3DMCP` through CEM_CSharpExtended's `CemTempFolder` and `tools/cem-temp.cjs`
([0003](decisions/0003-no-acc-writes-temp-folder.md)); Save As only to an absolute path
([0005](decisions/0005-save-only-where-the-user-asked.md)); `npm test` and an xunit project
([0006](decisions/0006-tests-node-and-xunit.md)). Live run through the MCP server on the test drawing, with no
watcher event under ACC ([live MCP test](workflows/live-mcp-test.md)). Details in
[sources/commits/2026-10](sources/commits/2026-10.md), upstream history in [2026-05](sources/commits/2026-05.md).

## [2026-10-25] ingest | CEM-EnriqueRuiz/CEM_API#82 nothing written into ACC, port 8766, the temp folder and the onboarding

The user tested pass 1 and sent the issue link, so the fork's first Cemengal commit carries the user's Civil 3D 2027
work together with #82. New source page [CEM_API#82](sources/issues/CEM-EnriqueRuiz-CEM_API-82.md), with every
decision, its reasons and the rejected alternatives. Moved there from [2026-10](sources/commits/2026-10.md), which
keeps the user's earlier work. The user's decisions of 2026-10-25: keep every change. The MCPs have no exception to
root 0031, so the strict rule applies here. [0003](decisions/0003-no-acc-writes-temp-folder.md) now names
`CemTempFolder.UserTempPath`. The [live MCP test](workflows/live-mcp-test.md) no longer names the project
drawing. [File writes](concepts/file-writes.md) and [upstream and fork](concepts/upstream-and-fork.md) record the
commit. `tests/acad_running.txt`, an old harness output, is ignored. All decisions were already `current`.

## [2026-11-03] ingest | The civil3d MCP server declared in .mcp.json (no issue)

The user asked for each repo's `.mcp.json` to declare the servers its development needs, and to commit this without an
issue link. `.mcp.json` gains the project-level `civil3d` entry with the relative path `build/index.js`, and
`.claude/settings.local.json` enables it. Decisions and the rejected absolute path and user-level registration are in
[sources/commits/2026-11](sources/commits/2026-11.md). [Connect an agent](workflows/connect-an-agent.md) now gives the
project entry and the build it needs.

## [2026-11-05] ingest | Overnight maintenance review

The user reviewed the overnight maintenance review and chose to commit it with no issue link and without the QA and
security reviews. Applied:
- the old harness outputs moved out of the checkout, with their `.gitignore` lines;
- the dead `test_plugin.js` and `tests/kill_stale_acad.bat` deleted;
- the false "Connection timed out" warning after every successful call fixed (`ConnectionManager`);
- `civil3d_skills get` returns each parameter's type, `required` and description as declared (it returned optional
  strings);
- comments that contradicted the wiki corrected.

[Known gaps](concepts/known-gaps.md) gains the risks found by reading the code, including the NETLOAD hint and
"pending: 0". The changes, the decisions, the verification (node 32/32, xunit 24/24) and the proposals P1–P9, which
were not applied, are in [sources/commits/2026-11](sources/commits/2026-11.md).
