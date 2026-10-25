---
name: zoom_to_area
category: view
description: Set the current view to a window, to an entity by handle, or to all extents - use before civil3d_screenshot to frame what to check
requires_write: false
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: handle
    type: string
    required: false
  - name: window
    type: double[]
    required: false
---

## Code Template

```csharp
// ---- parameters ----
var handle = "";                       // zoom to this entity, or
double[] window = null;                // new[] { xmin, ymin, xmax, ymax }, or both empty = extents
var margin = 0.1;                      // 10 % padding
// ---- end parameters ----

Extents3d ext;
if (!string.IsNullOrEmpty(handle))
{
    var id = Database.GetObjectId(false, new Handle(Convert.ToInt64(handle, 16)), 0);
    ext = ((Autodesk.AutoCAD.DatabaseServices.Entity)Transaction.GetObject(id, OpenMode.ForRead)).GeometricExtents;
}
else if (window != null) ext = new Extents3d(new Point3d(window[0], window[1], 0), new Point3d(window[2], window[3], 0));
else
{
    // read-only extents (Database.UpdateExt needs a document lock, which queries do not take)
    var ms = (BlockTableRecord)Transaction.GetObject(SymbolUtilityServices.GetBlockModelSpaceId(Database), OpenMode.ForRead);
    ext = new Extents3d(); bool any = false;
    foreach (ObjectId eid in ms)
    {
        try { var e = (Autodesk.AutoCAD.DatabaseServices.Entity)Transaction.GetObject(eid, OpenMode.ForRead); if (!e.Visible) continue; var ge = e.GeometricExtents; if (any) ext.AddExtents(ge); else { ext = ge; any = true; } }
        catch { /* entities without extents (empty surfaces, rays...) */ }
    }
    if (!any) return new { error = "Model space is empty" };
}

var view = Editor.GetCurrentView();
double w = (ext.MaxPoint.X - ext.MinPoint.X) * (1 + margin), h = (ext.MaxPoint.Y - ext.MinPoint.Y) * (1 + margin);
double ratio = view.Width / view.Height;
if (w / h < ratio) w = h * ratio; else h = w / ratio;
view.CenterPoint = new Point2d((ext.MinPoint.X + ext.MaxPoint.X) / 2, (ext.MinPoint.Y + ext.MaxPoint.Y) / 2);
view.Width = Math.Max(w, 1e-3); view.Height = Math.Max(h, 1e-3);
view.ViewDirection = Vector3d.ZAxis; view.Target = Point3d.Origin; view.ViewTwist = 0;   // plan view
Editor.SetCurrentView(view);
return new { center = new[] { view.CenterPoint.X, view.CenterPoint.Y }, width = view.Width, height = view.Height };
```

## Usage Notes
- Works in civil3d_query (views are not part of the transaction; extents are computed from model-space entities).
- Assumes the World UCS / plan view; for profile views just pass the profile view handle.
