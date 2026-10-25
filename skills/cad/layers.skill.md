---
name: layers
category: cad
description: List layers (with object counts) or create/update a layer - color (ACI or RGB), linetype, lineweight, on/off, frozen, locked, plot
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: layerName
    type: string
    required: false
    description: Empty = list only
---

## Code Template

```csharp
// ---- parameters ----
var layerName = "";                 // "" = list only
short aci = 3;                      // AutoCAD color index (1 red, 2 yellow, 3 green, 4 cyan, 5 blue, 6 magenta, 7 white)
int[] rgb = null;                   // e.g. new[] { 255, 128, 0 } overrides aci
var linetype = "Continuous";        // must be loaded
var lineWeight = LineWeight.ByLineWeightDefault;   // e.g. LineWeight.LineWeight035
bool? isOff = null, isFrozen = null, isLocked = null, isPlottable = null;
var makeCurrent = false;
// ---- end parameters ----

var lt = (LayerTable)Transaction.GetObject(Database.LayerTableId, OpenMode.ForRead);
object changed = null;
if (!string.IsNullOrEmpty(layerName))
{
    LayerTableRecord ltr;
    bool created = !lt.Has(layerName);
    if (created)
    {
        lt.UpgradeOpen();
        ltr = new LayerTableRecord { Name = layerName };
        lt.Add(ltr);
        Transaction.AddNewlyCreatedDBObject(ltr, true);
    }
    else ltr = (LayerTableRecord)Transaction.GetObject(lt[layerName], OpenMode.ForWrite);

    ltr.Color = rgb != null
        ? Autodesk.AutoCAD.Colors.Color.FromRgb((byte)rgb[0], (byte)rgb[1], (byte)rgb[2])
        : Autodesk.AutoCAD.Colors.Color.FromColorIndex(Autodesk.AutoCAD.Colors.ColorMethod.ByAci, aci);
    var ltt = (LinetypeTable)Transaction.GetObject(Database.LinetypeTableId, OpenMode.ForRead);
    if (ltt.Has(linetype)) ltr.LinetypeObjectId = ltt[linetype];
    ltr.LineWeight = lineWeight;
    if (isOff.HasValue) ltr.IsOff = isOff.Value;
    if (isFrozen.HasValue && ltr.ObjectId != Database.Clayer) ltr.IsFrozen = isFrozen.Value;
    if (isLocked.HasValue) ltr.IsLocked = isLocked.Value;
    if (isPlottable.HasValue) ltr.IsPlottable = isPlottable.Value;
    if (makeCurrent) Database.Clayer = ltr.ObjectId;
    changed = new { layer = layerName, created, linetypeLoaded = ltt.Has(linetype) };
}

// object count per layer (model space)
var counts = new Dictionary<string, int>();
var ms = (BlockTableRecord)Transaction.GetObject(SymbolUtilityServices.GetBlockModelSpaceId(Database), OpenMode.ForRead);
foreach (ObjectId id in ms)
{
    var e = (Autodesk.AutoCAD.DatabaseServices.Entity)Transaction.GetObject(id, OpenMode.ForRead);
    counts[e.Layer] = counts.TryGetValue(e.Layer, out var c) ? c + 1 : 1;
}
var layers = new List<object>();
foreach (ObjectId id in lt)
{
    var l = (LayerTableRecord)Transaction.GetObject(id, OpenMode.ForRead);
    layers.Add(new { l.Name, color = l.Color.ToString(), on = !l.IsOff, frozen = l.IsFrozen, locked = l.IsLocked,
                     objects = counts.TryGetValue(l.Name, out var n) ? n : 0 });
}
return new { changed, current = ((LayerTableRecord)Transaction.GetObject(Database.Clayer, OpenMode.ForRead)).Name, layers };
```

## Usage Notes
- Run with civil3d_query when only listing.
- Load a linetype first: `Database.LoadLineTypeFile("DASHED", "acadiso.lin");`
- Move objects: `ent.Layer = "NAME";` (entity opened ForWrite).
