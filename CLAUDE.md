# CEM_Civil3DMCP

A fork of `barbosaihan/civil3d-mcp`, the Civil 3D MCP: a .NET 10 plugin (`plugin/Civil3dMcpPlugin`) that runs inside
Civil 3D 2027 (`acad.exe`) and answers JSON-RPC over TCP on `127.0.0.1:8766`, and a Node MCP server (`src/`, built to
`build/index.js`, server name `civil3d-mcp`) that lets an AI agent such as Claude run C# in the drawing, read it,
capture it and save it. The plugin deploys as the per-user bundle `%APPDATA%\Autodesk\ApplicationPlugins\CEM_Civil3DMCP.bundle`.

**Read [docs/index.md](docs/index.md) ("Start here") before planning or editing**, then the pages it names. The wiki
holds the conventions, the decisions and their reasons, and the known gaps. The code and the wiki win over the README.

Load the `cem-civil3dmcp-dev` skill (`.claude/skills/cem-civil3dmcp-dev/SKILL.md`) before writing code.
Cross-repo rules: [../../CROSS_REPO.md](../../CROSS_REPO.md).

Every commit carries its wiki update ([docs/workflows/finish-a-change.md](docs/workflows/finish-a-change.md)).
Commit message: `FEAT|FIX|REFACTOR|DOCS - Description. <issue URL>`. **That line is the entire
message**: no body, no file list, no test tally, no `Co-Authored-By`. Use one `git commit -m "..."`.
