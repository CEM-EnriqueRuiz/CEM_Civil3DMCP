---
name: text_and_dimensions
category: cad
description: Create annotation - MText notes and aligned dimensions between point pairs - on a given layer
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: notes
    type: array
    required: false
  - name: dimensions
    type: array
    required: false
---

## Code Template

```csharp
// ---- parameters ----
var layer = "0";
var notes = new[] {                               // x, y, height, text (\P = new line)
    (x: 0.0, y: 0.0, height: 2.5, text: "NOTA:\\PCota en metros"),
};
var dimensions = new[] {                          // p1, p2, dimension line offset
    (x1: 0.0, y1: 0.0, x2: 100.0, y2: 0.0, offset: 5.0),
};
// ---- end parameters ----

var ms = (BlockTableRecord)Transaction.GetObject(SymbolUtilityServices.GetBlockModelSpaceId(Database), OpenMode.ForWrite);
var created = new List<string>();
foreach (var n in notes)
{
    var mt = new MText { Location = new Point3d(n.x, n.y, 0), TextHeight = n.height, Contents = n.text, Layer = layer };
    ms.AppendEntity(mt); Transaction.AddNewlyCreatedDBObject(mt, true);
    created.Add("MText " + mt.Handle);
}
foreach (var d in dimensions)
{
    var p1 = new Point3d(d.x1, d.y1, 0); var p2 = new Point3d(d.x2, d.y2, 0);
    var dir = (p2 - p1).GetNormal(); var normal = new Vector3d(-dir.Y, dir.X, 0);
    var dimLine = p1 + (p2 - p1) / 2 + normal * d.offset;
    var dim = new AlignedDimension(p1, p2, dimLine, "", Database.Dimstyle) { Layer = layer };
    ms.AppendEntity(dim); Transaction.AddNewlyCreatedDBObject(dim, true);
    created.Add($"Dimension {dim.Handle} = {dim.Measurement:0.###}");
}
return new { created };
```

## Usage Notes
- Text height is in drawing units; for annotative scaling set `mt.Annotative = AnnotativeStates.True`.
- The dimension uses the current dimension style (`Database.Dimstyle`).
