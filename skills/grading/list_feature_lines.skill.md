---
name: list_feature_lines
category: grading
description: List feature lines (siteless and per site) with length and elevation range
requires_write: false
verified: Civil 3D 2027 (26.0.0.0)
parameters: []
---

## Code Template

```csharp
var list = new List<object>();
void Add(ObjectId id, string site)
{
    var fl = (FeatureLine)Transaction.GetObject(id, OpenMode.ForRead);
    double zmin = double.MaxValue, zmax = double.MinValue; int n = 0;
    foreach (Point3d p in fl.GetPoints(Autodesk.Civil.FeatureLinePointType.AllPoints)) { zmin = Math.Min(zmin, p.Z); zmax = Math.Max(zmax, p.Z); n++; }
    list.Add(new { fl.Name, site, handle = fl.Handle.ToString(), length2d = fl.Length2D, points = n, zmin, zmax });
}
foreach (ObjectId id in CivilDoc.GetSitelessFeatureLineIds()) Add(id, null);
foreach (ObjectId sid in CivilDoc.GetSiteIds())
{
    var site = (Site)Transaction.GetObject(sid, OpenMode.ForRead);
    foreach (ObjectId id in site.GetFeatureLineIds()) Add(id, site.Name);
}
return new { count = list.Count, featureLines = list };
```
