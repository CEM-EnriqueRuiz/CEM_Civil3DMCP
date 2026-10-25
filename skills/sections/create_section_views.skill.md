---
name: create_section_views
category: sections
description: Create one section view per sample line of a group, laid out in a grid starting at a base point
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: alignmentName
    type: string
    required: true
---

## Code Template

```csharp
// ---- parameters ----
var alignmentName = "Eje 1";
var basePoint = new Point3d(0, -400, 0);
var columns = 5;
var spacingX = 60.0;
var spacingY = 40.0;
// ---- end parameters ----

Alignment al = null;
foreach (ObjectId id in CivilDoc.GetAlignmentIds())
{
    var a = (Alignment)Transaction.GetObject(id, OpenMode.ForRead);
    if (a.Name == alignmentName) al = a;
}
if (al == null) return new { error = "Alignment not found: " + alignmentName };
var gids = al.GetSampleLineGroupIds();
if (gids.Count == 0) return new { error = "No sample line group on " + alignmentName };
var g = (SampleLineGroup)Transaction.GetObject(gids[0], OpenMode.ForRead);

int i = 0; var views = new List<string>();
foreach (ObjectId slId in g.GetSampleLineIds())
{
    var sl = (SampleLine)Transaction.GetObject(slId, OpenMode.ForRead);
    var loc = new Point3d(basePoint.X + (i % columns) * spacingX, basePoint.Y - (i / columns) * spacingY, 0);
    var svId = SectionView.Create("SV " + sl.Name, slId, loc);
    views.Add(((SectionView)Transaction.GetObject(svId, OpenMode.ForRead)).Name);
    i++;
}
return new { group = g.Name, sectionViews = views.Count, names = views };
```

## Usage Notes
- Spacing depends on swath width and vertical exaggeration; check with civil3d_screenshot and adjust.
