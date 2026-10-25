---
name: labels
category: styles
description: Add labels - spot elevation labels on a surface at XY points, and (re)apply an alignment label set (station ticks, geometry points)
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: surfaceName
    type: string
    required: false
  - name: spotPoints
    type: double[][]
    required: false
  - name: alignmentName
    type: string
    required: false
---

## Code Template

```csharp
// ---- parameters ----
var surfaceName = "EG";
var spotPoints = new double[][] { new[] { 50.0, 20.0 } };   // spot elevation labels
var alignmentName = "Eje 1";                               // "" = skip
var alignmentLabelSet = "";                                // "" = first label set
// ---- end parameters ----

var done = new List<string>();
if (!string.IsNullOrEmpty(surfaceName) && spotPoints.Length > 0)
{
    ObjectId sfId = ObjectId.Null;
    foreach (ObjectId id in CivilDoc.GetSurfaceIds())
        if (((Autodesk.Civil.DatabaseServices.Surface)Transaction.GetObject(id, OpenMode.ForRead)).Name == surfaceName) sfId = id;
    if (sfId.IsNull) return new { error = "Surface not found: " + surfaceName };
    foreach (var p in spotPoints) SurfaceElevationLabel.Create(sfId, new Point2d(p[0], p[1]));
    done.Add(spotPoints.Length + " spot elevation labels");
}
if (!string.IsNullOrEmpty(alignmentName))
{
    foreach (ObjectId id in CivilDoc.GetAlignmentIds())
    {
        var al = (Alignment)Transaction.GetObject(id, OpenMode.ForRead);
        if (al.Name != alignmentName) continue;
        al.UpgradeOpen();
        var setId = string.IsNullOrEmpty(alignmentLabelSet)
            ? CivilDoc.Styles.LabelSetStyles.AlignmentLabelSetStyles[0]
            : CivilDoc.Styles.LabelSetStyles.AlignmentLabelSetStyles[alignmentLabelSet];
        al.ImportLabelSet(setId);
        done.Add("label set applied to " + al.Name);
    }
}
return new { done };
```

## Usage Notes
- Overloads take explicit label style ids, e.g. `SurfaceElevationLabel.Create(sfId, pt, labelStyleId, markerStyleId)`.
- Check placement visually with civil3d_screenshot.
