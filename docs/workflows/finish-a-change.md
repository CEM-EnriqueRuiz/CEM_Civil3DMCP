---
title: "Finish a change — commit with its wiki ingest"
type: workflow
updated: 2026-11-05
sources: [CLAUDE.md, AGENTS.md, .claude/agents/cem-civil3dmcp-dev.md]
related: [../log.md, ../index.md, test.md]
tags: [commit, wiki, workflow]
---

# Finish a change: commit with its wiki ingest

Rules: [CROSS_REPO §4 and §9](../../../../CROSS_REPO.md).

1. **Implement and verify first** ([test](test.md), [build and deploy](build-and-deploy.md),
   [live MCP test](live-mcp-test.md)). Nothing is committed until the user has tested the change and sent the issue
   link. That link is the go-ahead.
2. **Ingest into `docs/`** in the same change: the source page (`sources/issues/<org>-<repo>-<N>.md`, or
   `sources/commits/<YYYY-MM>.md` with no issue) with every decision, its reason and the rejected alternatives; the
   affected pages; new pages in `index.md`; a `log.md` entry (`## [YYYY-MM-DD] ingest | <title>`);
   `python ../../tools/wiki/wiki_lint.py .` with 0 errors.
3. **Commit** on `main`, staging explicit paths:
   `git commit -m "FEAT - Description. <issue URL>"`. That one line is the whole message: no body, no
   `Co-Authored-By`. Use the user's link verbatim; with no issue, the plain `TYPE - Description.` form.
4. The `pre-commit` hook rejects staged code without a staged `docs/log.md` plus another `docs/` page.

Do not push unless the user asks. Never push to `upstream`. Never stage `C_References/*.dll`, `build/` or anything
under `%TEMP%`.
