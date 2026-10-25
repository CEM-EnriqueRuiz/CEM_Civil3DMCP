---
name: list_corridors
category: corridors
description: List corridors with baselines, regions (stations, assembly, frequency), corridor surfaces and out-of-date status
requires_write: false
verified: Civil 3D 2027 (26.0.0.0)
parameters: []
---

## Code Template

```csharp
var result = new List<object>();
foreach (ObjectId cid in CivilDoc.CorridorCollection)
{
    var c = (Corridor)Transaction.GetObject(cid, OpenMode.ForRead);
    var baselines = new List<object>();
    foreach (Baseline b in c.Baselines)
    {
        var regions = new List<object>();
        foreach (BaselineRegion r in b.BaselineRegions)
        {
            string assembly = "";
            try { assembly = ((Autodesk.Civil.DatabaseServices.Assembly)Transaction.GetObject(r.AssemblyId, OpenMode.ForRead)).Name; } catch { }
            regions.Add(new { r.Name, r.StartStation, r.EndStation, assembly,
                              frequencyTangents = r.AppliedAssemblySetting.FrequencyAlongTangents, frequencyCurves = r.AppliedAssemblySetting.FrequencyAlongCurves });
        }
        string alName = "", prName = "";
        try { alName = ((Alignment)Transaction.GetObject(b.AlignmentId, OpenMode.ForRead)).Name; } catch { }
        try { prName = ((Profile)Transaction.GetObject(b.ProfileId, OpenMode.ForRead)).Name; } catch { }
        baselines.Add(new { b.Name, alignment = alName, profile = prName, regions });
    }
    var surfaces = new List<string>();
    foreach (CorridorSurface cs in c.CorridorSurfaces) surfaces.Add(cs.Name);
    result.Add(new { c.Name, handle = c.Handle.ToString(), outOfDate = c.IsOutOfDate, baselines, corridorSurfaces = surfaces });
}
return new { count = result.Count, corridors = result };
```

## Usage Notes
- `outOfDate = true` means it needs `corridor.Rebuild()` (see corridor_rebuild).
