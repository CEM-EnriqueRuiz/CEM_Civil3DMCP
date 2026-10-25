---
name: create_cogo_points
category: points
description: Create COGO points from coordinates with optional descriptions
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: points
    type: array
    required: true
    description: Array of {easting, northing, elevation, description}
---

## Code Template

```csharp
// ---- parameters ----
var points = new[] {                       // easting, northing, elevation, raw description
    (e: 1000.0, n: 2000.0, z: 100.0, d: "TOPO"),
};
// ---- end parameters ----

var created = new List<object>();
foreach (var p in points)
{
    var id = CivilDoc.CogoPoints.Add(new Point3d(p.e, p.n, p.z), true);   // true = next available number
    var cp = (CogoPoint)Transaction.GetObject(id, OpenMode.ForWrite);
    cp.RawDescription = p.d;
    created.Add(new { pointNumber = cp.PointNumber, easting = cp.Easting, northing = cp.Northing, elevation = cp.Elevation });
}
return new { success = true, count = created.Count, created };
```

## Usage Notes
- The second parameter of Add() = useNextPointNumber (true = auto-assign numbers)
- RawDescription triggers description key matching
- Points are added to the default _All Points group automatically
