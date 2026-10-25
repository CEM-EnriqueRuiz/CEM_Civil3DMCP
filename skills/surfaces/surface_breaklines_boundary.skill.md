---
name: surface_breaklines_boundary
category: surfaces
description: Add standard breaklines (3D polylines / feature lines) and an outer boundary (closed polyline) to a TIN surface
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: surfaceName
    type: string
    required: true
  - name: breaklineHandles
    type: string[]
    required: false
    description: Handles of 3D polylines / feature lines to use as breaklines
  - name: boundaryHandle
    type: string
    required: false
    description: Handle of a closed polyline to use as outer boundary
---

## Code Template

```csharp
// ---- parameters ----
var surfaceName = "EG";
var breaklineHandles = new string[] { };     // e.g. { "2A4", "2A9" }
var boundaryHandle = "";                    // e.g. "2B0"
// ---- end parameters ----

TinSurface surf = null;
foreach (ObjectId id in CivilDoc.GetSurfaceIds())
{
    var s = Transaction.GetObject(id, OpenMode.ForRead) as TinSurface;
    if (s != null && s.Name == surfaceName) surf = s;
}
if (surf == null) return new { error = "TIN surface not found: " + surfaceName };
surf.UpgradeOpen();

ObjectId FromHandle(string h) => Database.GetObjectId(false, new Handle(Convert.ToInt64(h, 16)), 0);

var added = new List<string>();
if (breaklineHandles.Length > 0)
{
    var ids = new ObjectIdCollection();
    foreach (var h in breaklineHandles) ids.Add(FromHandle(h));
    // (ids, midOrdinateDistance, maxDistance, weedingDistance, weedingAngle)
    surf.BreaklinesDefinition.AddStandardBreaklines(ids, 0.1, 10.0, 0.0, 0.0);
    added.Add(breaklineHandles.Length + " breaklines");
}
if (!string.IsNullOrEmpty(boundaryHandle))
{
    var ids = new ObjectIdCollection { FromHandle(boundaryHandle) };
    surf.BoundariesDefinition.AddBoundaries(ids, 0.1, Autodesk.Civil.SurfaceBoundaryType.Outer, true);
    added.Add("outer boundary");
}
surf.Rebuild();
var g = surf.GetGeneralProperties();
return new { surface = surf.Name, added, points = g.NumberOfPoints, minElevation = g.MinimumElevation, maxElevation = g.MaximumElevation };
```

## Usage Notes
- Breaklines need elevations (3D polylines, feature lines). 2D polylines would force elevation 0.
- Boundary types: Outer, Hide, Show, DataClip (`Autodesk.Civil.SurfaceBoundaryType`).
