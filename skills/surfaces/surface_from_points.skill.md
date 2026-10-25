---
name: surface_from_points
category: surfaces
description: Build or update a TIN surface from COGO points (a point group) or from an explicit list of XYZ points
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: surfaceName
    type: string
    required: true
  - name: pointGroupName
    type: string
    required: false
    description: Point group to add (e.g. "_All Points"); leave empty to use the xyz list
---

## Code Template

```csharp
// ---- parameters ----
var surfaceName = "EG";
var pointGroupName = "_All Points";          // "" to skip
var xyz = new double[][] {                   // optional extra vertices
    // new[] { 1000.0, 2000.0, 100.0 },
};
var styleName = "";                          // "" = keep default style
// ---- end parameters ----

// find or create the surface
ObjectId surfId = ObjectId.Null;
foreach (ObjectId id in CivilDoc.GetSurfaceIds())
    if (((Autodesk.Civil.DatabaseServices.Surface)Transaction.GetObject(id, OpenMode.ForRead)).Name == surfaceName) surfId = id;
bool created = surfId.IsNull;
if (created) surfId = TinSurface.Create(Database, surfaceName);
var surf = (TinSurface)Transaction.GetObject(surfId, OpenMode.ForWrite);

if (!string.IsNullOrEmpty(styleName)) surf.StyleId = CivilDoc.Styles.SurfaceStyles[styleName];

if (!string.IsNullOrEmpty(pointGroupName))
{
    ObjectId pgId = ObjectId.Null;
    foreach (ObjectId id in CivilDoc.PointGroups)
        if (((PointGroup)Transaction.GetObject(id, OpenMode.ForRead)).Name == pointGroupName) pgId = id;
    if (pgId.IsNull) return new { error = "Point group not found: " + pointGroupName };
    surf.PointGroupsDefinition.AddPointGroup(pgId);
}

if (xyz.Length > 0)
{
    var pts = new Point3dCollection();
    foreach (var v in xyz) pts.Add(new Point3d(v[0], v[1], v[2]));
    surf.AddVertices(pts);
}

surf.Rebuild();
var g = surf.GetGeneralProperties();
return new {
    surface = surf.Name, created,
    points = g.NumberOfPoints,
    minElevation = g.MinimumElevation, maxElevation = g.MaximumElevation,
    triangles = surf.GetTinProperties().NumberOfTriangles
};
```

## Usage Notes
- Adding a point group keeps the surface dynamic: editing points later updates it (Rebuild).
- A TIN needs at least 3 non-collinear points.
