---
title: "0005 — The drawing is saved only by civil3d_save, in place or to the absolute path the user asked for"
type: decision
status: current
updated: 2026-10-24
sources: [plugin/Civil3dMcpPlugin/SavePath.cs, plugin/Civil3dMcpPlugin/DrawingFile.cs, src/tools/saveTool.ts, plugin/Civil3dMcpPlugin.Tests/SavePathTests.cs]
related: [0003-no-acc-writes-temp-folder.md, ../modules/plugin.md, ../concepts/file-writes.md]
tags: [save, dwg, user-data]
---

# 0005 — Save only where the user asked

**Context.** `civil3d_execute` commits to memory only; `civil3d_save` (Cemengal work, 2026-10) writes the drawing.
Root [0031](../../../../docs/decisions/0031-nothing-writes-under-acc-logs-in-local-temp.md) treats the user's
drawing, saved where the user chose, as the user's data. The audit found one way to save somewhere nobody chose:
a relative path (`copy.dwg`, `sub\copy.dwg`, `C:copy.dwg`) passed the old check and would have resolved against
acad.exe's working folder.

**Decision.**
1. `saveDrawing` is the plugin's only save. Without a path it saves in place, and refuses a drawing never saved.
2. With a path, `SavePath.Validate` accepts only an absolute (fully qualified) `.dwg` path whose folder exists, and
   returns it normalised; anything else is `CIVIL3D.INVALID_INPUT` with the reason.
3. The tool tells the AI to save only when, and only where, the user asked. Nothing else saves: no autosave, no copy
   to temp or next to the DLL. A test that needs a saved drawing saves a copy under `%TEMP%`
   (`skills_test.cjs` uses `TestData\mcp_skills_test.dwg`).

**Why.** Saving is the one write in this repo that is user data, so its target must be exactly what the user named.

**Rejected.** Refusing an ACC path for Save As: a drawing on ACC is the user's project file, and saving it there is
the user's choice (0031 §1). Blocking `Save`/`SaveAs` inside scripts: `ScriptSandbox` is a text filter that a
script can bypass, so the rule lives in the tool descriptions instead ([known gaps](../concepts/known-gaps.md)).

**Consequences.** Verified live on 2026-10-24: `civil3d_save("copy.dwg")` answered "Path must be absolute" and saved
nothing ([live MCP test](../workflows/live-mcp-test.md)).
