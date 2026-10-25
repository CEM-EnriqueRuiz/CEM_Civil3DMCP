---
name: create_polyline
category: geometry
description: Create a 2D or 3D polyline from a list of vertices
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: vertices
    type: array
    required: true
    description: Array of {x, y} or {x, y, z} coordinates
  - name: closed
    type: boolean
    required: false
    description: Whether to close the polyline
  - name: layer
    type: string
    required: false
    description: Layer name
---

## Code Template — 2D Polyline

```csharp
// ---- parameters ----
var vertices = new double[][] { new[] { 0.0, 0.0 }, new[] { 100.0, 0.0 }, new[] { 100.0, 100.0 } };
var closed = false;
var layer = "";              // "" = current layer
// ---- end parameters ----

var polyline = new Polyline();
for (int i = 0; i < vertices.Length; i++) polyline.AddVertexAt(i, new Point2d(vertices[i][0], vertices[i][1]), 0, 0, 0);
polyline.Closed = closed;
if (layer != "") polyline.Layer = layer;

var bt = (BlockTable)Transaction.GetObject(Database.BlockTableId, OpenMode.ForRead);
var btr = (BlockTableRecord)Transaction.GetObject(bt[BlockTableRecord.ModelSpace], OpenMode.ForWrite);
btr.AppendEntity(polyline);
Transaction.AddNewlyCreatedDBObject(polyline, true);

return new { success = true, handle = polyline.Handle.ToString(), vertexCount = polyline.NumberOfVertices };
```

## Code Template — 3D Polyline

```csharp
// ---- parameters ----
var vertices = new double[][] { new[] { 0.0, 0.0, 10.0 }, new[] { 100.0, 0.0, 15.0 }, new[] { 100.0, 100.0, 20.0 } };
// ---- end parameters ----

var pts = new Point3dCollection();
foreach (var v in vertices) pts.Add(new Point3d(v[0], v[1], v[2]));

var polyline3d = new Polyline3d(Poly3dType.SimplePoly, pts, false);

var bt = (BlockTable)Transaction.GetObject(Database.BlockTableId, OpenMode.ForRead);
var btr = (BlockTableRecord)Transaction.GetObject(bt[BlockTableRecord.ModelSpace], OpenMode.ForWrite);
btr.AppendEntity(polyline3d);
Transaction.AddNewlyCreatedDBObject(polyline3d, true);

return new { success = true, handle = polyline3d.Handle.ToString() };
```
