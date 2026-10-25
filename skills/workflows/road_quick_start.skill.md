---
name: road_quick_start
category: workflows
description: Recipe for a complete road study - EG surface, alignment, ground profile, profile view, design profile, corridor, volumes, sections - as an ordered list of skills
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters: []
---

## Steps (run each skill with civil3d_execute, check each with civil3d_screenshot)

1. **Ground**: `surface_from_points` (point group → EG) or `create_tin_surface`; add breaklines/boundary with `surface_breaklines_boundary`.
2. **Axis**: `create_alignment_from_polyline` (from a drawn polyline handle — find it with `query_entities`).
3. **Ground profile**: `create_surface_profile` (alignment + EG).
4. **Profile view**: `create_profile_view` below the plan; `zoom_to_area` on its handle + `civil3d_screenshot`.
5. **Design profile**: read the ground with `profile_report`, choose PVIs (grades ≤ design limits), `create_layout_profile`.
6. **Corridor**: `create_simple_corridor` (assembly lanes/shoulders/daylight to EG) → corridor surface "… Top".
7. **Volumes**: `surface_volume` EG vs corridor Top surface.
8. **Sections**: `create_sample_lines` → `section_report` / `create_section_views`.
9. **Save**: `civil3d_save` (ask the user for a path first if the drawing was never saved).

## Code Template — status check between steps

```csharp
var al = CivilDoc.GetAlignmentIds().Cast<ObjectId>().Select(id => (Alignment)Transaction.GetObject(id, OpenMode.ForRead))
    .Select(a => new { a.Name, a.Length, profiles = a.GetProfileIds().Cast<ObjectId>().Select(p => ((Profile)Transaction.GetObject(p, OpenMode.ForRead)).Name).ToList(),
                       profileViews = a.GetProfileViewIds().Count, sampleLineGroups = a.GetSampleLineGroupIds().Count }).ToList();
var surfaces = CivilDoc.GetSurfaceIds().Cast<ObjectId>().Select(id => ((Autodesk.Civil.DatabaseServices.Surface)Transaction.GetObject(id, OpenMode.ForRead)).Name).ToList();
var corridors = CivilDoc.CorridorCollection.Cast<ObjectId>().Select(id => ((Corridor)Transaction.GetObject(id, OpenMode.ForRead)).Name).ToList();
return new { surfaces, alignments = al, corridors, points = CivilDoc.CogoPoints.Count };
```

## Usage Notes
- Keep one civil3d_execute per step: each is a separate undo step and failures stay small.
