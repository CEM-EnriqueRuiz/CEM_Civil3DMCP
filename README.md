# Civil 3D MCP Server — Code Execution Architecture

An MCP server that lets AI assistants **write and execute C# inside Autodesk Civil 3D** (full AutoCAD + Civil 3D + Map 3D .NET API), look at the result, and save the drawing.

```
┌─────────────────┐   stdio   ┌───────────────────┐   TCP/JSON-RPC :8766   ┌──────────────────────────┐
│  Claude / Cline │ ◄───────► │ MCP server (Node) │ ◄────────────────────► │ Civil3dMcpPlugin.dll     │
└─────────────────┘           │ tools + skills    │                        │ (inside acad.exe)        │
                              └───────────────────┘                        │ Roslyn C# engine, capture│
                                                                           └──────────────────────────┘
```

## Tools

| Tool | Purpose |
|------|---------|
| `civil3d_query` | Run C# **read-only** (transaction never committed) |
| `civil3d_execute` | Run C# with **write** access (committed; one undo step per call; not saved to disk) |
| `civil3d_skills` | List / search / read the tested C# templates in `skills/` |
| `civil3d_screenshot` | Image of the drawing to verify results (`view` off-screen render, `drawing` window, `window` whole app; optional zoom extents). A copy goes to `%TEMP%\Cemengal\Civil3DMCP\Screenshots`, pruned |
| `civil3d_save` | Save, or Save As to a path |

Script globals: `Document`, `CivilDoc`, `Database`, `Transaction`, `Editor`.
Auto-imported: `System`, `System.Linq`, `System.Collections.Generic`, `System.Text`, `Autodesk.AutoCAD.{ApplicationServices,DatabaseServices,EditorInput,Geometry,Runtime}`,
`Autodesk.Civil`, `Autodesk.Civil.{ApplicationServices,DatabaseServices,Settings}`.
Anything else (e.g. `Autodesk.Civil.DatabaseServices.Styles`, Map 3D `Autodesk.Gis.Map.*`, `OSGeo.MapGuide`) via `using` lines at the top of the script —
Map 3D assemblies are referenced automatically but not imported, because their type names (`Table`, `Record`…) clash with AutoCAD's.

## Skills (48)

Templates start with a `// ---- parameters ----` block; ✏️ = needs `civil3d_execute`, 👁 = read-only.
`verified:` in each file records the Civil 3D build it last passed `tests/skills_test.cjs` on.

| Area | Skill | | What it does |
|---|---|---|---|
| drawing | `drawing_info` | 👁 | Get comprehensive information about the active Civil 3D drawing |
| surfaces | `create_tin_surface` | ✏️ | Create a new TIN surface and optionally add 3D points to it |
| surfaces | `list_surfaces` | 👁 | List all surfaces in the active Civil 3D drawing with name, type, layer, and basic statistics |
| surfaces | `surface_breaklines_boundary` | ✏️ | Add standard breaklines (3D polylines / feature lines) and an outer boundary (closed polyline) to a TIN surface |
| surfaces | `surface_elevation` | 👁 | Get the elevation of a surface at a specific X,Y coordinate |
| surfaces | `surface_from_points` | ✏️ | Build or update a TIN surface from COGO points (a point group) or from an explicit list of XYZ points |
| surfaces | `surface_sample_along` | 👁 | Sample surface elevations along a polyline/alignment/line (by handle) or on a regular grid of XY points; read-only |
| surfaces | `surface_volume` | ✏️ | Cut/fill volumes between two surfaces via a temporary TIN volume surface (erased again unless keepVolumeSurface) |
| points | `create_cogo_points` | ✏️ | Create COGO points from coordinates with optional descriptions |
| points | `import_export_points` | ✏️ | Import COGO points from a PNEZD text/CSV file, or export points to CSV |
| points | `list_cogo_points` | 👁 | List COGO points in the drawing, optionally filtered by point group |
| points | `point_groups` | ✏️ | List point groups, or create a point group filtered by raw description (wildcards), point numbers or elevation |
| alignments | `alignment_geometry` | 👁 | Report an alignment's geometry - tangents, curves, spirals with stations, lengths, radii; plus points at a station interval |
| alignments | `create_alignment_from_polyline` | ✏️ | Create a centerline alignment from an existing polyline (by handle) or from a list of XY vertices |
| alignments | `create_offset_alignment` | ✏️ | Create an offset alignment (e.g. edge of pavement) at a constant offset from a parent alignment |
| alignments | `list_alignments` | 👁 | List all alignments in the drawing with name, length, start/end stations |
| alignments | `station_offset` | 👁 | Convert between station+offset and X,Y coordinates along an alignment |
| profiles | `create_layout_profile` | ✏️ | Create a design (layout) profile from a list of PVIs (station, elevation), optionally with symmetric vertical curves |
| profiles | `create_profile_view` | ✏️ | Create a profile view (graph) for an alignment at an insertion point; all its profiles are drawn in it |
| profiles | `create_surface_profile` | ✏️ | Create an existing-ground profile by sampling a surface along an alignment |
| profiles | `profile_report` | 👁 | List an alignment's profiles and sample elevations/grades at a station interval (e.g. compare design vs ground) |
| sections | `create_sample_lines` | ✏️ | Create a sample line group along an alignment with sample lines every N units, sampling the chosen surfaces (and corridors) |
| sections | `create_section_views` | ✏️ | Create one section view per sample line of a group, laid out in a grid starting at a base point |
| sections | `section_report` | 👁 | Read cross-section data (offset/elevation points per source) for each sample line of a group; read-only |
| corridors | `corridor_rebuild` | ✏️ | Rebuild one corridor (or all) and report time taken; optionally change the tangent/curve frequency first |
| corridors | `create_simple_corridor` | ✏️ | Build a basic road corridor - assembly with stock lane + shoulder + daylight subassemblies, corridor on alignment/profile, Top corridor surface |
| corridors | `list_corridors` | 👁 | List corridors with baselines, regions (stations, assembly, frequency), corridor surfaces and out-of-date status |
| pipes | `create_pipe_run` | ✏️ | Create a gravity pipe network run - structures at given XY points connected by pipes, using the first parts list (or a named one) |
| pipes | `list_pipe_networks` | 👁 | List pipe networks with pipes (size, length, slope, inverts, connected structures) and structures (rim, sump, size) |
| grading | `feature_line_from_polyline` | ✏️ | Convert a polyline into a siteless feature line and optionally drape it on a surface (elevations from surface) |
| grading | `list_feature_lines` | 👁 | List feature lines (siteless and per site) with length and elevation range |
| parcels | `list_parcels` | 👁 | List sites and their parcels with area and perimeter |
| styles | `labels` | ✏️ | Add labels - spot elevation labels on a surface at XY points, and (re)apply an alignment label set (station ticks, geometry points) |
| styles | `list_styles` | 👁 | List available Civil 3D style names per object type (surface, alignment, profile, profile view, section view, point, label sets, parts lists...) |
| geometry | `create_polyline` | ✏️ | Create a 2D or 3D polyline from a list of vertices |
| cad | `blocks_attributes` | ✏️ | List block definitions and their references with attribute values, or insert a block reference with attribute values |
| cad | `layers` | ✏️ | List layers (with object counts) or create/update a layer - color (ACI or RGB), linetype, lineweight, on/off, frozen, locked, plot |
| cad | `layouts` | ✏️ | List paper-space layouts (with viewports and plot settings) or create a new layout with a viewport showing a model-space window |
| cad | `query_entities` | 👁 | Find model-space entities filtered by type, layer and/or a bounding window; returns handle, type, layer, extents (and length/area when available) |
| cad | `text_and_dimensions` | ✏️ | Create annotation - MText notes and aligned dimensions between point pairs - on a given layer |
| cad | `xrefs` | ✏️ | List external references (DWG xrefs) with path, status and whether overlaid; optionally attach a DWG as overlay |
| view | `zoom_to_area` | 👁 | Set the current view to a window, to an entity by handle, or to all extents - use before civil3d_screenshot to frame what to check |
| map | `import_shp` | ✏️ | Import a Shapefile (or other FDO/GIS format supported by MAPIMPORT) as AutoCAD objects with attributes as object data |
| map | `map_project_info` | 👁 | Map 3D - current coordinate system of the drawing, object data tables (fields, number of attached records) and whether Map 3D API is available |
| map | `object_data` | ✏️ | Map 3D object data - read the OD records of an entity, or create an OD table and attach a record with values to entities |
| map | `transform_coordinates` | 👁 | Transform XY coordinates between coordinate systems (e.g. ETRS89 UTM 30N <-> WGS84 lat/long) with the Map 3D / MapGuide coordinate library |
| workflows | `earthwork_report` | 👁 | Generate a complete earthwork report - iterates alignments, creates profiles from a surface, and computes cut/fill volumes |
| workflows | `road_quick_start` | ✏️ | Recipe for a complete road study - EG surface, alignment, ground profile, profile view, design profile, corridor, volumes, sections - as an ordered list of skills |

## Setup (Windows)

Double-click **`setup_claude.bat`** (re-runnable; another port: `setup_claude.ps1 -Port <port>`). It logs to
`%TEMP%\Cemengal\Civil3DMCP\setup-yyyyMMdd.log` and:
1. `npm install` + `npm run build` (Node 18+),
2. finds Civil 3D (registry / running acad.exe), copies the 5 reference DLLs to `C_References/`,
3. installs the .NET 10 SDK with winget if missing (Civil 3D 2027 runs on .NET 10; 2025/2026 used .NET 8 — change `TargetFramework` for those),
4. `dotnet publish` the plugin (with `CEM_CSharpExtended.dll`, the sibling repo `..\..\CEM_CSharpExtended` must be cloned) and installs it
   as an autoload bundle in `%APPDATA%\Autodesk\ApplicationPlugins\CEM_Civil3DMCP.bundle`,
5. registers `civil3d` in the Claude desktop config (MS Store and classic paths), with a `.bak-civil3d` backup. `CIVIL3D_PORT` is
   persisted (user environment and the config entry) only for a port other than 8766.

Then restart Civil 3D (choose **"Cargar siempre" / "Always load"** when it asks about the unsigned DLL) and fully quit + reopen Claude.

**Update + full test in one go:** close Civil 3D and double-click **`tests\run_all.bat`** — it runs the setup, starts Civil 3D, opens a scratch drawing,
runs every skill (`tests\skills_test.cjs`) and writes `report.md` plus screenshots to `%TEMP%\Cemengal\Civil3DMCP\TestResults`.

**Unit tests:** `npm test` (server, port contract, file-write guards) and `dotnet test plugin\Civil3dMcpPlugin.Tests` (the plugin's pure logic).

## Configuration

| Variable | Default | Where | Meaning |
|---|---|---|---|
| `CIVIL3D_PORT` | `8766` | plugin + server | TCP port (8080 is the Revit MCP's; `setup_claude.ps1 -Port <port>` persists another one) |
| `CIVIL3D_SCRIPT_TIMEOUT` | `300` | plugin | seconds per script |
| `CIVIL3D_COMMAND_TIMEOUT` | `300000` | server | ms to wait for the plugin |
| `CIVIL3D_HOST` | `localhost` | server | plugin host |
| `LOG_LEVEL` | `info` | server | debug / info / warn / error |

Plugin commands in Civil 3D: `C3DMCPSTATUS`, `C3DMCPSTART`, `C3DMCPSTOP`.

## Notes on Civil 3D 2027

**Threading and undo** (verified by hand, Civil 3D 2027, plugin 1.1.3)
- Every request is marshalled onto the main thread through the `SynchronizationContext` captured at load. A no-op is re-posted every 2 s
  while work is pending: Civil 3D's Event Viewer / Welcome panel sometimes swallow the WinForms marshaling message, and without the
  re-post a query could wait 100+ s until the next request arrived.
- `civil3d_execute` runs inside the registered **`MCPEXEC`** command (queued with `SendStringToExecute`), so each call is exactly one
  undo step — **U** echoes `MCPEXEC` and reverts it. `UNDO _BEGIN/_END` inside `ExecuteInCommandContextAsync` did *not* capture the
  changes. If Civil 3D is busy (a command or dialog active) the call fails after 30 s with `CIVIL3D.BUSY` instead of hanging.
- `civil3d_query` runs **without a document lock** (a lock taken in the application context is filed as an empty undo step, which made U
  undo nothing). So queries must not create anything, not even temporary objects, nor call `Database.UpdateExt`.
- U typed in a Spanish Civil 3D autocompletes to `UNIR`: use `_U`.

**Startup**
- The *Bienvenido / Welcome* panel and the *DWG association* dialog block the main thread right after launch: the plugin answers
  `ping`, but anything needing the main thread waits until you click into Civil 3D once (or close the panel).
- The plugin is unsigned: Civil 3D asks every time unless you choose **"Cargar siempre"** (your trust decision).

**API details learned while testing the skills**
- `DocumentCollection.ExecuteInCommandContextAsync` returns an awaitable `ExecutionResult` (not `Task`).
- Ambiguous names: write `Autodesk.Civil.DatabaseServices.Surface` / `.Section` / `.Subassembly` (AutoCAD / stock subassembly
  assemblies have classes with the same names; `C3DStockSubassemblies` and `Subassembly.*` are excluded from script references).
- Stock subassemblies in 2027: `LaneSuperelevationAOR`, `ShoulderExtendSubbase`, `BasicSideSlopeCutDitch` (there is no `DaylightBasic`).
- Corridor surfaces need an explicit `TinSurface.Rebuild()` after `Corridor.Rebuild()`, otherwise they stay empty (0 points).
- `TinVolumeSurface` net volume = fill − cut (negative = net cut).
- `CogoPointCollection.ImportPoints` is static; point file formats are localized names (e.g. `PNEZD (delimitado por comas)`).
- Map 3D (`Autodesk.Gis.Map.*`) is referenced but not auto-imported (its `Table`/`Record` clash) — add the `using` in the script.

## Files it writes

Nothing under an ACC (Desktop Connector) folder and nothing next to its DLL or scripts. Screenshots, test results and logs go to
`%TEMP%\Cemengal\Civil3DMCP\`, which deletes files older than 7 days, then the oldest above 50 MB, the first time each process
writes there. The drawing is saved only by `civil3d_save`, in place or to the absolute `.dwg` path you give.

## Security

The plugin listens on 127.0.0.1 only, and `ScriptSandbox` rejects obvious dangerous calls (process start, file/directory delete,
network, registry, P/Invoke, dynamic assembly loading). It is a text-pattern filter, not a real sandbox: any local process can send C#
to run inside Civil 3D while the plugin is loaded. Use `C3DMCPSTOP` when you don't need it.

## License

MIT
