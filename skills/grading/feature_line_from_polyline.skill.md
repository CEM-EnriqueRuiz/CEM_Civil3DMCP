---
name: feature_line_from_polyline
category: grading
description: Convert a polyline into a siteless feature line and optionally drape it on a surface (elevations from surface)
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: polylineHandle
    type: string
    required: true
  - name: surfaceName
    type: string
    required: false
---

## Code Template

```csharp
// ---- parameters ----
var polylineHandle = "2A4";
var featureLineName = "FL 1";
var surfaceName = "EG";                 // "" = keep polyline elevations
var insertGradeBreaks = true;           // add points where the surface changes grade
// ---- end parameters ----

var plId = Database.GetObjectId(false, new Handle(Convert.ToInt64(polylineHandle, 16)), 0);
var flId = FeatureLine.Create(featureLineName, plId);
var fl = (FeatureLine)Transaction.GetObject(flId, OpenMode.ForWrite);

if (!string.IsNullOrEmpty(surfaceName))
{
    ObjectId sfId = ObjectId.Null;
    foreach (ObjectId id in CivilDoc.GetSurfaceIds())
        if (((Autodesk.Civil.DatabaseServices.Surface)Transaction.GetObject(id, OpenMode.ForRead)).Name == surfaceName) sfId = id;
    if (sfId.IsNull) return new { error = "Surface not found: " + surfaceName };
    fl.AssignElevationsFromSurface(sfId, insertGradeBreaks);
}

var pts = fl.GetPoints(Autodesk.Civil.FeatureLinePointType.AllPoints);
var list = new List<double[]>();
foreach (Point3d p in pts) list.Add(new[] { Math.Round(p.X, 3), Math.Round(p.Y, 3), Math.Round(p.Z, 3) });
return new { featureLine = fl.Name, handle = fl.Handle.ToString(), length2d = fl.Length2D, points = list };
```

## Usage Notes
- Feature lines are valid surface breaklines (surface_breaklines_boundary).
- Point types: AllPoints, PIPoints, ElevationPoints (`Autodesk.Civil.FeatureLinePointType`).
