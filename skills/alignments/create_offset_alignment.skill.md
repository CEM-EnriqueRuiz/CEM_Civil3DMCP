---
name: create_offset_alignment
category: alignments
description: Create an offset alignment (e.g. edge of pavement) at a constant offset from a parent alignment
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: parentAlignment
    type: string
    required: true
  - name: offset
    type: double
    required: true
    description: Negative = left, positive = right
---

## Code Template

```csharp
// ---- parameters ----
var parentAlignment = "Eje 1";
var offset = -3.5;                                 // left edge, 3.5 m
var newName = parentAlignment + (offset < 0 ? " Izq " : " Der ") + Math.Abs(offset);
// ---- end parameters ----

ObjectId parentId = ObjectId.Null;
foreach (ObjectId id in CivilDoc.GetAlignmentIds())
    if (((Alignment)Transaction.GetObject(id, OpenMode.ForRead)).Name == parentAlignment) parentId = id;
if (parentId.IsNull) return new { error = "Alignment not found: " + parentAlignment };

var styleId = CivilDoc.Styles.AlignmentStyles[0];
var id2 = Alignment.CreateOffsetAlignment(newName, parentId, offset, styleId);
var al = (Alignment)Transaction.GetObject(id2, OpenMode.ForRead);
return new { alignment = al.Name, length = al.Length, offset };
```

## Usage Notes
- Offset alignments stay dynamic with the parent.
- For widenings use the Offset Alignment parameters in the UI or add widening regions.
