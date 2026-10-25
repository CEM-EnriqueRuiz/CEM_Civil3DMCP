---
name: list_pipe_networks
category: pipes
description: List pipe networks with pipes (size, length, slope, inverts, connected structures) and structures (rim, sump, size)
requires_write: false
verified: Civil 3D 2027 (26.0.0.0)
parameters: []
---

## Code Template

```csharp
var nets = new List<object>();
foreach (ObjectId nid in CivilDoc.GetPipeNetworkIds())
{
    var net = (Network)Transaction.GetObject(nid, OpenMode.ForRead);
    var structures = new Dictionary<ObjectId, string>();
    var sList = new List<object>();
    foreach (ObjectId sid in net.GetStructureIds())
    {
        var s = (Structure)Transaction.GetObject(sid, OpenMode.ForRead);
        structures[sid] = s.Name;
        sList.Add(new { s.Name, size = s.PartSizeName, x = s.Location.X, y = s.Location.Y,
                        rim = s.RimElevation, sump = s.SumpElevation });
    }
    var pList = new List<object>();
    foreach (ObjectId pid in net.GetPipeIds())
    {
        var p = (Pipe)Transaction.GetObject(pid, OpenMode.ForRead);
        pList.Add(new { p.Name, size = p.PartSizeName, length2d = p.Length2D, slope = p.Slope,
                        startInvert = p.StartPoint.Z - p.InnerDiameterOrWidth / 2, endInvert = p.EndPoint.Z - p.InnerDiameterOrWidth / 2,
                        from = structures.TryGetValue(p.StartStructureId, out var a) ? a : null,
                        to = structures.TryGetValue(p.EndStructureId, out var b) ? b : null });
    }
    nets.Add(new { network = net.Name, structures = sList, pipes = pList });
}
return new { count = nets.Count, networks = nets };
```

## Usage Notes
- Pipe Start/EndPoint are on the pipe centerline; invert = center Z − inner diameter/2.
- Slope is a ratio (0.01 = 1 %), sign follows start→end.
