---
name: surface_sample_along
category: surfaces
description: Sample surface elevations along a polyline/alignment/line (by handle) or on a regular grid of XY points; read-only
requires_write: false
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: surfaceName
    type: string
    required: true
  - name: curveHandle
    type: string
    required: false
    description: Handle of the curve to sample along (polyline, line, arc, alignment)
---

## Code Template

```csharp
// ---- parameters ----
var surfaceName = "EG";
var curveHandle = "";                         // sample along this curve, or
var gridMin = new double[] { 0, 0 };         // ... a grid (used when curveHandle is "")
var gridMax = new double[] { 100, 100 };
var gridStep = 25.0;
// ---- end parameters ----

Autodesk.Civil.DatabaseServices.Surface surf = null;
foreach (ObjectId id in CivilDoc.GetSurfaceIds())
{
    var s = (Autodesk.Civil.DatabaseServices.Surface)Transaction.GetObject(id, OpenMode.ForRead);
    if (s.Name == surfaceName) surf = s;
}
if (surf == null) return new { error = "Surface not found: " + surfaceName };

var samples = new List<object>();
if (!string.IsNullOrEmpty(curveHandle))
{
    if (!(surf is TinSurface tin)) return new { error = "Sampling along a curve needs a TIN surface" };
    var curveId = Database.GetObjectId(false, new Handle(Convert.ToInt64(curveHandle, 16)), 0);
    foreach (Point3d p in tin.SampleElevations(curveId))
        samples.Add(new { x = p.X, y = p.Y, z = p.Z });
}
else
{
    for (double x = gridMin[0]; x <= gridMax[0] + 1e-9; x += gridStep)
    for (double y = gridMin[1]; y <= gridMax[1] + 1e-9; y += gridStep)
    {
        try { samples.Add(new { x, y, z = surf.FindElevationAtXY(x, y) }); }
        catch { samples.Add(new { x, y, z = (double?)null }); }   // outside the surface
    }
}
return new { surface = surf.Name, count = samples.Count, samples = samples.Take(2000) };
```

## Usage Notes
- `TinSurface.SampleElevations(curveId)` (or `(pt1, pt2)`) returns a point at every TIN edge crossing — ideal for long sections.
- `FindElevationAtXY` throws outside the surface; the template returns null there.
