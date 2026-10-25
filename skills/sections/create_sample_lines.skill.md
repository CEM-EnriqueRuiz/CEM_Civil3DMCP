---
name: create_sample_lines
category: sections
description: Create a sample line group along an alignment with sample lines every N units, sampling the chosen surfaces (and corridors)
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: alignmentName
    type: string
    required: true
  - name: interval
    type: double
    required: true
  - name: leftWidth
    type: double
    required: false
  - name: rightWidth
    type: double
    required: false
---

## Code Template

```csharp
// ---- parameters ----
var alignmentName = "Eje 1";
var groupName = "SL " + alignmentName;
var interval = 20.0;
var leftWidth = 15.0;
var rightWidth = 15.0;
// ---- end parameters ----

Alignment al = null;
foreach (ObjectId id in CivilDoc.GetAlignmentIds())
{
    var a = (Alignment)Transaction.GetObject(id, OpenMode.ForRead);
    if (a.Name == alignmentName) al = a;
}
if (al == null) return new { error = "Alignment not found: " + alignmentName };

var groupId = SampleLineGroup.Create(groupName, al.ObjectId);
var group = (SampleLineGroup)Transaction.GetObject(groupId, OpenMode.ForWrite);

int n = 0;
for (double st = al.StartingStation; st <= al.EndingStation + 1e-6; st += interval)
{
    double st2 = Math.Min(st, al.EndingStation);
    double xl = 0, yl = 0, xr = 0, yr = 0;
    al.PointLocation(st2, -leftWidth, ref xl, ref yl);
    al.PointLocation(st2, rightWidth, ref xr, ref yr);
    var pts = new Point2dCollection { new Point2d(xl, yl), new Point2d(xr, yr) };
    SampleLine.Create("SL " + st2.ToString("0+000.00"), groupId, pts);
    n++;
}

// sample every available source (surfaces, corridors, corridor surfaces)
var sources = new List<string>();
foreach (SectionSource src in group.GetSectionSources())
{
    src.IsSampled = true;
    sources.Add(src.SourceType + ":" + ((Autodesk.AutoCAD.DatabaseServices.Entity)Transaction.GetObject(src.SourceId, OpenMode.ForRead)).GetType().Name);
}

return new { group = group.Name, sampleLines = n, sampledSources = sources };
```

## Usage Notes
- Sample lines are perpendicular when built from left/right offsets as above.
- Create surfaces/corridors BEFORE the sample lines, or re-run the `IsSampled` loop afterwards.
- Section data: see section_report; drawings: create_section_views.
