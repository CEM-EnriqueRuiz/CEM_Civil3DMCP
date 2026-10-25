---
name: blocks_attributes
category: cad
description: List block definitions and their references with attribute values, or insert a block reference with attribute values
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: insertBlock
    type: string
    required: false
    description: Block name to insert; empty = list only
---

## Code Template

```csharp
// ---- parameters ----
var insertBlock = "";                         // "" = list only
var insertPoint = new Point3d(0, 0, 0);
var scale = 1.0;
var rotationDeg = 0.0;
var attributeValues = new Dictionary<string, string> { /* ["TAG"] = "value" */ };
// ---- end parameters ----

var bt = (BlockTable)Transaction.GetObject(Database.BlockTableId, OpenMode.ForRead);
object inserted = null;
if (!string.IsNullOrEmpty(insertBlock))
{
    if (!bt.Has(insertBlock)) return new { error = "Block not defined: " + insertBlock };
    var defId = bt[insertBlock];
    var def = (BlockTableRecord)Transaction.GetObject(defId, OpenMode.ForRead);
    var br = new BlockReference(insertPoint, defId) { ScaleFactors = new Scale3d(scale), Rotation = rotationDeg * Math.PI / 180 };
    var ms = (BlockTableRecord)Transaction.GetObject(SymbolUtilityServices.GetBlockModelSpaceId(Database), OpenMode.ForWrite);
    ms.AppendEntity(br);
    Transaction.AddNewlyCreatedDBObject(br, true);
    foreach (ObjectId id in def)
    {
        if (Transaction.GetObject(id, OpenMode.ForRead) is AttributeDefinition ad && !ad.Constant)
        {
            var ar = new AttributeReference();
            ar.SetAttributeFromBlock(ad, br.BlockTransform);
            if (attributeValues.TryGetValue(ad.Tag, out var v)) ar.TextString = v;
            br.AttributeCollection.AppendAttribute(ar);
            Transaction.AddNewlyCreatedDBObject(ar, true);
        }
    }
    inserted = new { block = insertBlock, handle = br.Handle.ToString() };
}

var blocks = new List<object>();
foreach (ObjectId id in bt)
{
    var btr = (BlockTableRecord)Transaction.GetObject(id, OpenMode.ForRead);
    if (btr.IsLayout || btr.IsAnonymous || btr.IsFromExternalReference) continue;
    var refs = new List<object>();
    foreach (ObjectId rid in btr.GetBlockReferenceIds(true, false).Cast<ObjectId>().Take(50))
    {
        var br = (BlockReference)Transaction.GetObject(rid, OpenMode.ForRead);
        var atts = new Dictionary<string, string>();
        foreach (ObjectId aid in br.AttributeCollection)
        {
            var ar = (AttributeReference)Transaction.GetObject(aid, OpenMode.ForRead);
            atts[ar.Tag] = ar.TextString;
        }
        refs.Add(new { handle = br.Handle.ToString(), x = br.Position.X, y = br.Position.Y, layer = br.Layer, attributes = atts });
    }
    blocks.Add(new { btr.Name, hasAttributes = btr.HasAttributeDefinitions, referenceCount = btr.GetBlockReferenceIds(true, false).Count, references = refs });
}
return new { inserted, blocks };
```

## Usage Notes
- Dynamic block references point to anonymous definitions; `br.DynamicBlockTableRecord` gives the real name.
- Import a block from another DWG: `using var src = new Database(false, true); src.ReadDwgFile(path, FileOpenMode.OpenForReadAndAllShare, true, ""); Database.Insert(name, src, true);`
