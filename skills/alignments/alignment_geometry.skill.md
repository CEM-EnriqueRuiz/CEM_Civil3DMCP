---
name: alignment_geometry
category: alignments
description: Report an alignment's geometry - tangents, curves, spirals with stations, lengths, radii; plus points at a station interval
requires_write: false
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: alignmentName
    type: string
    required: true
  - name: stationInterval
    type: double
    required: false
    description: If > 0, also return XY at every N units of station
---

## Code Template

```csharp
// ---- parameters ----
var alignmentName = "Eje 1";
var stationInterval = 20.0;     // 0 = skip the station table
// ---- end parameters ----

Alignment al = null;
foreach (ObjectId id in CivilDoc.GetAlignmentIds())
{
    var a = (Alignment)Transaction.GetObject(id, OpenMode.ForRead);
    if (a.Name.Equals(alignmentName, StringComparison.OrdinalIgnoreCase)) al = a;
}
if (al == null) return new { error = "Alignment not found: " + alignmentName };

var entities = new List<object>();
for (int i = 0; i < al.Entities.Count; i++)
{
    var e = al.Entities.GetEntityByOrder(i);
    var info = new Dictionary<string, object> { ["order"] = i, ["type"] = e.EntityType.ToString() };
    switch (e)
    {
        case AlignmentLine l:
            info["startStation"] = l.StartStation; info["endStation"] = l.EndStation; info["length"] = l.Length;
            info["start"] = new[] { l.StartPoint.X, l.StartPoint.Y }; info["end"] = new[] { l.EndPoint.X, l.EndPoint.Y };
            break;
        case AlignmentArc c:
            info["startStation"] = c.StartStation; info["endStation"] = c.EndStation; info["length"] = c.Length;
            info["radius"] = c.Radius; info["clockwise"] = c.Clockwise; info["center"] = new[] { c.CenterPoint.X, c.CenterPoint.Y };
            break;
        default:
            foreach (var prop in new[] { "StartStation", "EndStation", "Length" })
                try { info[char.ToLower(prop[0]) + prop.Substring(1)] = e.GetType().GetProperty(prop)?.GetValue(e); } catch { }
            break;
    }
    entities.Add(info);
}

var stations = new List<object>();
if (stationInterval > 0)
{
    for (double st = al.StartingStation; st <= al.EndingStation + 1e-6; st += stationInterval)
    {
        double x = 0, y = 0;
        al.PointLocation(Math.Min(st, al.EndingStation), 0, ref x, ref y);
        stations.Add(new { station = Math.Round(st, 3), x, y });
    }
}

return new { alignment = al.Name, length = al.Length, startStation = al.StartingStation, endStation = al.EndingStation,
             entityCount = entities.Count, entities, stations };
```

## Usage Notes
- Spirals are reported with station/length via the default branch (AlignmentSpiral, AlignmentSCS...).
- `PointLocation(station, offset, ...)` also works with offsets (left negative, right positive).
