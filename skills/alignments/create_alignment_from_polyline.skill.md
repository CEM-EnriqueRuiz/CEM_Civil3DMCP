---
name: create_alignment_from_polyline
category: alignments
description: Create a centerline alignment from an existing polyline (by handle) or from a list of XY vertices
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: alignmentName
    type: string
    required: true
  - name: polylineHandle
    type: string
    required: false
    description: Existing 2D polyline handle; if empty a polyline is created from 'vertices'
  - name: vertices
    type: double[][]
    required: false
---

## Code Template

```csharp
// ---- parameters ----
var alignmentName = "Eje 1";
var polylineHandle = "";                       // existing polyline, or
var vertices = new double[][] {                // vertices for a new one
    new[] { 0.0, 0.0 }, new[] { 150.0, 40.0 }, new[] { 300.0, 20.0 }
};
var addCurvesBetweenTangents = true;          // fillet tangents using the drawing's default radius
var eraseSourcePolyline = false;
var styleName = "";                          // "" = first alignment style
var labelSetName = "";                       // "" = first alignment label set
// ---- end parameters ----

ObjectId plId;
if (!string.IsNullOrEmpty(polylineHandle))
    plId = Database.GetObjectId(false, new Handle(Convert.ToInt64(polylineHandle, 16)), 0);
else
{
    var pl = new Polyline();
    for (int i = 0; i < vertices.Length; i++) pl.AddVertexAt(i, new Point2d(vertices[i][0], vertices[i][1]), 0, 0, 0);
    var ms = (BlockTableRecord)Transaction.GetObject(SymbolUtilityServices.GetBlockModelSpaceId(Database), OpenMode.ForWrite);
    plId = ms.AppendEntity(pl);
    Transaction.AddNewlyCreatedDBObject(pl, true);
    eraseSourcePolyline = true;   // helper geometry only
}

var styleId = string.IsNullOrEmpty(styleName) ? CivilDoc.Styles.AlignmentStyles[0] : CivilDoc.Styles.AlignmentStyles[styleName];
var labelSetId = string.IsNullOrEmpty(labelSetName)
    ? CivilDoc.Styles.LabelSetStyles.AlignmentLabelSetStyles[0]
    : CivilDoc.Styles.LabelSetStyles.AlignmentLabelSetStyles[labelSetName];

var opts = new PolylineOptions { PlineId = plId, AddCurvesBetweenTangents = addCurvesBetweenTangents, EraseExistingEntities = eraseSourcePolyline };
var alId = Alignment.Create(CivilDoc, opts, alignmentName, ObjectId.Null, Database.Clayer, styleId, labelSetId);
var al = (Alignment)Transaction.GetObject(alId, OpenMode.ForRead);

return new { alignment = al.Name, handle = al.Handle.ToString(), length = al.Length,
             startStation = al.StartingStation, endStation = al.EndingStation, entities = al.Entities.Count };
```

## Usage Notes
- Site = ObjectId.Null creates a siteless alignment (recommended).
- Alignment names must be unique; Civil 3D throws if the name exists.
- To start at another station: `al.UpgradeOpen(); al.ReferencePointStation = 1000;`
