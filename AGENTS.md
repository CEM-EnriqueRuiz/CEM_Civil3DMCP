# CEM_Civil3DMCP: agent instructions

A fork of `barbosaihan/civil3d-mcp`: a .NET 10 plugin inside Civil 3D 2027 (`plugin/Civil3dMcpPlugin`, TCP JSON-RPC on
`127.0.0.1:8766`, deployed as `CEM_Civil3DMCP.bundle`) and a Node MCP server (`src/`, `build/index.js`, `civil3d-mcp`)
whose tools run C# in the drawing (`civil3d_query`, `civil3d_execute`), list the C# templates in `skills/`, capture the
view and save the drawing.

1. **Read [docs/index.md](docs/index.md) ("Start here") first**, then the pages its "Before you
   change X" table names. The wiki holds the conventions, the decisions and why, and the known gaps.
2. Follow the canonical skill: [.claude/skills/cem-civil3dmcp-dev/SKILL.md](.claude/skills/cem-civil3dmcp-dev/SKILL.md)
   (hard rules, verify commands).
3. Cross-repo invariants: [../../CROSS_REPO.md](../../CROSS_REPO.md).
4. Search the wiki with the qmd CLI when the index is not enough:
   `qmd query -c cem_civil3dmcp "..."`, or `qmd query "..."` across all wikis. Read a hit with
   `qmd get qmd://cem_civil3dmcp/<path>.md`. The collection names are listed in
   [../../tools/wiki/README.md](../../tools/wiki/README.md).
5. **Commit-time ingest.** Every commit carries its own wiki update in `docs/`:
   - the source page `sources/issues/<org>-<repo>-<N>.md`, or `sources/commits/<YYYY-MM>.md`, with
     each decision, its reason, and the rejected alternatives
   - the affected pages, and new pages in `index.md`
   - a `log.md` entry
   - `python ../../tools/wiki/wiki_lint.py .` with 0 errors

   The commit message is one line, `FEAT|FIX|REFACTOR|DOCS - Description. <issue URL>`, with no body
   or trailers, on `main`, only after the user sends the issue link. The git `pre-commit` hook
   rejects code without its docs update.
