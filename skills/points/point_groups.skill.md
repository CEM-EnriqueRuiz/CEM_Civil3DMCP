---
name: point_groups
category: points
description: List point groups, or create a point group filtered by raw description (wildcards), point numbers or elevation
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: groupName
    type: string
    required: false
    description: Empty = just list groups
  - name: rawDescriptions
    type: string
    required: false
    description: e.g. "TN*,ARB*" (comma separated, wildcards)
---

## Code Template

```csharp
// ---- parameters ----
var groupName = "";                   // "" = list only
var rawDescriptions = "TN*";          // IncludeRawDescriptions filter
var pointNumbers = "";                // e.g. "1-100,250"
// ---- end parameters ----

object created = null;
if (!string.IsNullOrEmpty(groupName))
{
    var gid = CivilDoc.PointGroups.Add(groupName);
    var g = (PointGroup)Transaction.GetObject(gid, OpenMode.ForWrite);
    var q = new StandardPointGroupQuery();
    if (!string.IsNullOrEmpty(rawDescriptions)) q.IncludeRawDescriptions = rawDescriptions;
    if (!string.IsNullOrEmpty(pointNumbers)) q.IncludeNumbers = pointNumbers;
    g.SetQuery(q);
    g.Update();
    created = new { g.Name, points = g.PointsCount };
}

var groups = new List<object>();
foreach (ObjectId id in CivilDoc.PointGroups)
{
    var g = (PointGroup)Transaction.GetObject(id, OpenMode.ForRead);
    groups.Add(new { g.Name, points = g.PointsCount });
}
return new { created, groups };
```

## Usage Notes
- Run with civil3d_query when only listing (groupName = "").
- Point groups drive dynamic surfaces (surface_from_points).
