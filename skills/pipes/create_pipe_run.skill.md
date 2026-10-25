---
name: create_pipe_run
category: pipes
description: Create a gravity pipe network run - structures at given XY points connected by pipes, using the first parts list (or a named one)
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: networkName
    type: string
    required: true
  - name: points
    type: double[][]
    required: true
    description: "[[x, y, rimOrPipeZ], ...] in flow order"
  - name: surfaceName
    type: string
    required: false
    description: Reference surface (rims follow it)
---

## Code Template

```csharp
using Autodesk.Civil.DatabaseServices.Styles;   // PartsList, PartFamily

// ---- parameters ----
var networkName = "Saneamiento 1";
var points = new double[][] {             // x, y, pipe centerline z at that structure
    new[] { 0.0, 0.0, 98.0 }, new[] { 50.0, 0.0, 97.5 }, new[] { 100.0, 10.0, 97.0 }
};
var partsListName = "";                   // "" = first parts list in the drawing
var surfaceName = "";                     // reference surface for rims
// ---- end parameters ----

var partsListId = string.IsNullOrEmpty(partsListName) ? CivilDoc.Styles.PartsListSet[0] : CivilDoc.Styles.PartsListSet[partsListName];
var partsList = (PartsList)Transaction.GetObject(partsListId, OpenMode.ForRead);

ObjectId pipeFamily = ObjectId.Null, pipeSize = ObjectId.Null, structFamily = ObjectId.Null, structSize = ObjectId.Null;
for (int i = 0; i < partsList.PartFamilyCount; i++)
{
    var famId = partsList[i];                                   // family ObjectId
    var fam = (PartFamily)Transaction.GetObject(famId, OpenMode.ForRead);
    if (fam.PartSizeCount == 0) continue;
    if (fam.Domain == DomainType.Pipe && pipeFamily.IsNull) { pipeFamily = famId; pipeSize = fam[0]; }          // size ObjectId
    if (fam.Domain == DomainType.Structure && structFamily.IsNull) { structFamily = famId; structSize = fam[0]; }
}
if (pipeFamily.IsNull || structFamily.IsNull) return new { error = "Parts list '" + partsList.Name + "' lacks pipe or structure families" };

string name = networkName;
var netId = Network.Create(CivilDoc, ref name);
var net = (Network)Transaction.GetObject(netId, OpenMode.ForWrite);
net.PartsListId = partsListId;
if (!string.IsNullOrEmpty(surfaceName))
    foreach (ObjectId sid in CivilDoc.GetSurfaceIds())
        if (((Autodesk.Civil.DatabaseServices.Surface)Transaction.GetObject(sid, OpenMode.ForRead)).Name == surfaceName) net.ReferenceSurfaceId = sid;

var structIds = new List<ObjectId>();
foreach (var p in points)
{
    ObjectId sId = ObjectId.Null;
    net.AddStructure(structFamily, structSize, new Point3d(p[0], p[1], p[2]), 0.0, ref sId, true);
    structIds.Add(sId);
}
var pipeNames = new List<string>();
for (int i = 0; i < points.Length - 1; i++)
{
    ObjectId pId = ObjectId.Null;
    var seg = new LineSegment3d(new Point3d(points[i][0], points[i][1], points[i][2]), new Point3d(points[i + 1][0], points[i + 1][1], points[i + 1][2]));
    net.AddLinePipe(pipeFamily, pipeSize, seg, ref pId, false);
    var pipe = (Pipe)Transaction.GetObject(pId, OpenMode.ForWrite);
    pipe.ConnectToStructure(ConnectorPositionType.Start, structIds[i], true);
    pipe.ConnectToStructure(ConnectorPositionType.End, structIds[i + 1], true);
    pipeNames.Add(pipe.Name + " (" + pipe.PartSizeName + ")");
}
return new { network = net.Name, partsList = partsList.Name, structures = structIds.Count, pipes = pipeNames };
```

## Usage Notes
- Uses the first pipe/structure family and size in the parts list; `partsList[i]` = family id, `family[k]` = size id (2027 API).
- Rules are applied to structures (`applyRules = true`); pipes keep the given Z.
