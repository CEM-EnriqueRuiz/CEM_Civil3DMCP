# Civil 3D MCP skills

Each `*.skill.md` is a documented C# template for `civil3d_query` / `civil3d_execute`.

Conventions
- Values to adapt live in a `// ---- parameters ----` … `// ---- end parameters ----` block at the top.
- Templates find objects **by name** and return `{ error = "..." }` instead of throwing when something is missing.
- `verified:` in the frontmatter records the Civil 3D version the template was last run against
  by `tests/skills_test.cjs` (`no` = written but not yet run).
- Name clashes between AutoCAD and Civil 3D namespaces: always write
  `Autodesk.Civil.DatabaseServices.Surface` and `Autodesk.Civil.DatabaseServices.Section`
  (plain `Surface` / `Section` are ambiguous).
- Styles: `CivilDoc.Styles.<Collection>[name]` or `[0]` for the first style in the drawing/template.
