---
name: xrefs
category: cad
description: List external references (DWG xrefs) with path, status and whether overlaid; optionally attach a DWG as overlay
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: attachPath
    type: string
    required: false
---

## Code Template

```csharp
// ---- parameters ----
var attachPath = "";               // e.g. @"C:\proyecto\topografia.dwg" ("" = list only)
var attachName = "";               // block name for the xref
// ---- end parameters ----

object attached = null;
if (!string.IsNullOrEmpty(attachPath))
{
    if (!System.IO.File.Exists(attachPath)) return new { error = "File not found: " + attachPath };
    var name = string.IsNullOrEmpty(attachName) ? System.IO.Path.GetFileNameWithoutExtension(attachPath) : attachName;
    var xid = Database.OverlayXref(attachPath, name);
    var br = new BlockReference(Point3d.Origin, xid);
    var ms = (BlockTableRecord)Transaction.GetObject(SymbolUtilityServices.GetBlockModelSpaceId(Database), OpenMode.ForWrite);
    ms.AppendEntity(br); Transaction.AddNewlyCreatedDBObject(br, true);
    attached = new { name, handle = br.Handle.ToString() };
}

var xrefs = new List<object>();
var bt = (BlockTable)Transaction.GetObject(Database.BlockTableId, OpenMode.ForRead);
foreach (ObjectId id in bt)
{
    var btr = (BlockTableRecord)Transaction.GetObject(id, OpenMode.ForRead);
    if (!btr.IsFromExternalReference) continue;
    xrefs.Add(new { btr.Name, path = btr.PathName, status = btr.XrefStatus.ToString(), overlay = btr.IsFromOverlayReference });
}
return new { attached, xrefs };
```

## Usage Notes
- Data shortcuts (Civil 3D references of surfaces/alignments) are not xrefs; they appear as normal Civil objects marked as references.
