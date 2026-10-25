---
name: corridor_rebuild
category: corridors
description: Rebuild one corridor (or all) and report time taken; optionally change the tangent/curve frequency first
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: corridorName
    type: string
    required: false
    description: Empty = all corridors
---

## Code Template

```csharp
// ---- parameters ----
var corridorName = "";          // "" = all
double? frequency = null;       // e.g. 10.0 to set tangent+curve increment on every region
// ---- end parameters ----

var done = new List<object>();
foreach (ObjectId cid in CivilDoc.CorridorCollection)
{
    var c = (Corridor)Transaction.GetObject(cid, OpenMode.ForWrite);
    if (corridorName != "" && c.Name != corridorName) continue;
    if (frequency.HasValue)
        foreach (Baseline b in c.Baselines)
            foreach (BaselineRegion r in b.BaselineRegions)
            {
                r.AppliedAssemblySetting.FrequencyAlongTangents = frequency.Value;
                r.AppliedAssemblySetting.FrequencyAlongCurves = frequency.Value;
            }
    var sw = System.Diagnostics.Stopwatch.StartNew();
    c.Rebuild();
    foreach (CorridorSurface cs in c.CorridorSurfaces)          // corridor surfaces need their own rebuild
        ((TinSurface)Transaction.GetObject(cs.SurfaceId, OpenMode.ForWrite)).Rebuild();
    done.Add(new { c.Name, seconds = Math.Round(sw.Elapsed.TotalSeconds, 2) });
}
return done.Count == 0 ? (object)new { error = "No corridor matched '" + corridorName + "'" } : new { rebuilt = done };
```

## Usage Notes
- Large corridors can take minutes; the script timeout is 300 s by default (CIVIL3D_SCRIPT_TIMEOUT).
