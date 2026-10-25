---
name: section_report
category: sections
description: Read cross-section data (offset/elevation points per source) for each sample line of a group; read-only
requires_write: false
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: alignmentName
    type: string
    required: true
  - name: maxSampleLines
    type: int
    required: false
---

## Code Template

```csharp
// ---- parameters ----
var alignmentName = "Eje 1";
var maxSampleLines = 20;
// ---- end parameters ----

Alignment al = null;
foreach (ObjectId id in CivilDoc.GetAlignmentIds())
{
    var a = (Alignment)Transaction.GetObject(id, OpenMode.ForRead);
    if (a.Name == alignmentName) al = a;
}
if (al == null) return new { error = "Alignment not found: " + alignmentName };

var groups = new List<object>();
foreach (ObjectId gid in al.GetSampleLineGroupIds())
{
    var g = (SampleLineGroup)Transaction.GetObject(gid, OpenMode.ForRead);
    var lines = new List<object>();
    foreach (ObjectId slId in g.GetSampleLineIds().Cast<ObjectId>().Take(maxSampleLines))
    {
        var sl = (SampleLine)Transaction.GetObject(slId, OpenMode.ForRead);
        var sections = new List<object>();
        foreach (ObjectId secId in sl.GetSectionIds())
        {
            var sec = (Autodesk.Civil.DatabaseServices.Section)Transaction.GetObject(secId, OpenMode.ForRead);
            var pts = new List<double[]>();
            foreach (SectionPoint sp in sec.SectionPoints) pts.Add(new[] { Math.Round(sp.Location.X, 3), Math.Round(sp.Location.Y, 3) });
            // Min/MaximumElevation throw "not supported" on some section types: compute from the points
            sections.Add(new { name = sec.Name, source = sec.SourceName,
                               minElevation = pts.Count > 0 ? pts.Min(p => p[1]) : (double?)null,
                               maxElevation = pts.Count > 0 ? pts.Max(p => p[1]) : (double?)null, points = pts });
        }
        lines.Add(new { name = sl.Name, station = sl.Station, sections });
    }
    groups.Add(new { group = g.Name, sampleLineCount = g.GetSampleLineIds().Count, lines });
}
return new { alignment = al.Name, groups };
```

## Usage Notes
- Section points are (offset, elevation): X = offset from the centerline, Y = elevation.
- `Section.MinmumElevation` (sic) / `MaximumElevation` throw on some section types in 2027 — the template computes them from the points.
