---
title: "Add or change a skill template"
type: workflow
updated: 2026-10-24
sources: [skills/README.md, src/tools/skillsTool.ts, tests/skills_test.cjs]
related: [../modules/skills-library.md, ../concepts/threading-and-undo.md, ../concepts/file-writes.md]
tags: [skills, templates]
---

# Add or change a skill

1. Create `skills/<category>/<name>.skill.md` with the front matter of the others (`name`, `category`,
   `description`, `requires_write`, `verified: no`, `parameters`) and one ```` ```csharp ```` template that starts
   with `// ---- parameters ----`.
2. Read-only skills must create nothing (they run as `civil3d_query`, with no lock); anything that creates, even a
   temporary object, is `requires_write: true` ([threading and undo](../concepts/threading-and-undo.md)).
3. A skill that writes a file writes only to a path the caller passes; never a default next to the drawing or the
   plugin, never ACC ([file writes](../concepts/file-writes.md)).
4. Add a step for it to the plan in `tests/skills_test.cjs`, run it live on a scratch drawing with `--only=<name>`,
   then `--mark-verified` (it rewrites the `verified:` line), and add the skill to the README's table.
