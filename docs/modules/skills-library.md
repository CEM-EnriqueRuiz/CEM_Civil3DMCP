---
title: "skills/ — the 48 tested C# templates served by civil3d_skills"
type: module
updated: 2026-10-24
sources: [skills/README.md, src/tools/skillsTool.ts, tests/skills_test.cjs, README.md]
related: [mcp-server.md, harness-and-setup.md, ../workflows/add-a-skill.md]
tags: [skills, templates, csharp]
---

# Skills library

`skills/<category>/<name>.skill.md`: YAML front matter (`name`, `category`, `description`, `requires_write`,
`verified`, `parameters`) and a body whose first ```` ```csharp ```` block is the template. Templates start with a
`// ---- parameters ----` block the AI edits before sending the code to `civil3d_query` (read-only skills) or
`civil3d_execute` (`requires_write: true`). The README's table lists all 48, by category: drawing, surfaces,
points, alignments, profiles, sections, corridors, pipes, grading, parcels, styles, geometry, cad, view, map,
workflows.

`verified:` records the Civil 3D build the skill last passed `tests/skills_test.cjs --mark-verified` on
(Civil 3D 2027, 26.0.0.0, 2026-10-18). The test builds a small road in a scratch drawing and refuses a named one.

Skills that touch files: `import_export_points` reads a PNEZD file or exports a CSV to a path the caller gives;
`import_shp` reads a shapefile; `xrefs` attaches a DWG. None writes anywhere else
([file writes](../concepts/file-writes.md)). API lessons learned while writing them are in the README
("API details learned while testing the skills").
