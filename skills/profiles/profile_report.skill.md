---
name: profile_report
category: profiles
description: List an alignment's profiles and sample elevations/grades at a station interval (e.g. compare design vs ground)
requires_write: false
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: alignmentName
    type: string
    required: true
  - name: stationInterval
    type: double
    required: false
---

## Code Template

```csharp
// ---- parameters ----
var alignmentName = "Eje 1";
var stationInterval = 20.0;
// ---- end parameters ----

Alignment al = null;
foreach (ObjectId id in CivilDoc.GetAlignmentIds())
{
    var a = (Alignment)Transaction.GetObject(id, OpenMode.ForRead);
    if (a.Name == alignmentName) al = a;
}
if (al == null) return new { error = "Alignment not found: " + alignmentName };

var profiles = new List<Profile>();
foreach (ObjectId pid in al.GetProfileIds()) profiles.Add((Profile)Transaction.GetObject(pid, OpenMode.ForRead));

var table = new List<Dictionary<string, object>>();
for (double st = al.StartingStation; st <= al.EndingStation + 1e-6; st += stationInterval)
{
    var row = new Dictionary<string, object> { ["station"] = Math.Round(st, 3) };
    foreach (var p in profiles)
    {
        if (st < p.StartingStation - 1e-6 || st > p.EndingStation + 1e-6) { row[p.Name] = null; continue; }
        try { row[p.Name] = Math.Round(p.ElevationAt(st), 3); } catch { row[p.Name] = null; }
    }
    table.Add(row);
}

return new {
    alignment = al.Name,
    profiles = profiles.Select(p => new { p.Name, type = p.ProfileType.ToString(), p.StartingStation, p.EndingStation, p.ElevationMin, p.ElevationMax }),
    table
};
```

## Usage Notes
- Cut/fill depth at a station = design elevation − ground elevation from the table.
