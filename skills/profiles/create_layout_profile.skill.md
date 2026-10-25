---
name: create_layout_profile
category: profiles
description: Create a design (layout) profile from a list of PVIs (station, elevation), optionally with symmetric vertical curves
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: alignmentName
    type: string
    required: true
  - name: pvis
    type: double[][]
    required: true
    description: "[[station, elevation], ...] in station order"
  - name: curveLength
    type: double
    required: false
    description: Length of the parabolic curve at each interior PVI (0 = none)
---

## Code Template

```csharp
// ---- parameters ----
var alignmentName = "Eje 1";
var profileName = alignmentName + " - Rasante";
var pvis = new double[][] {
    new[] {   0.0, 100.0 },
    new[] { 150.0, 104.0 },
    new[] { 300.0, 101.0 },
};
var curveLength = 60.0;     // 0 = sharp PVIs
// ---- end parameters ----

ObjectId alId = ObjectId.Null;
foreach (ObjectId id in CivilDoc.GetAlignmentIds())
    if (((Alignment)Transaction.GetObject(id, OpenMode.ForRead)).Name == alignmentName) alId = id;
if (alId.IsNull) return new { error = "Alignment not found: " + alignmentName };

var styleId = CivilDoc.Styles.ProfileStyles[0];
var labelSetId = CivilDoc.Styles.LabelSetStyles.ProfileLabelSetStyles[0];
var profId = Profile.CreateByLayout(profileName, alId, Database.Clayer, styleId, labelSetId);
var prof = (Profile)Transaction.GetObject(profId, OpenMode.ForWrite);

// fixed tangents between consecutive PVIs
for (int i = 0; i < pvis.Length - 1; i++)
    prof.Entities.AddFixedTangent(new Point2d(pvis[i][0], pvis[i][1]), new Point2d(pvis[i + 1][0], pvis[i + 1][1]));

var curveErrors = new List<string>();
if (curveLength > 0)
{
    // free symmetric parabola at each interior PVI
    for (int i = 1; i < pvis.Length - 1; i++)
    {
        try
        {
            var pvi = prof.PVIs.GetPVIAt(pvis[i][0], pvis[i][1]);
            prof.Entities.AddFreeSymmetricParabolaByPVIAndCurveLength(pvi, curveLength);
        }
        catch (System.Exception ex) { curveErrors.Add($"PVI {pvis[i][0]}: {ex.Message}"); }
    }
}

var pviList = new List<object>();
foreach (ProfilePVI p in prof.PVIs)
{
    double? gIn = null, gOut = null;                 // undefined at the first / last PVI
    try { gIn = p.GradeIn; } catch { }
    try { gOut = p.GradeOut; } catch { }
    pviList.Add(new { station = p.Station, elevation = p.Elevation, gradeIn = gIn, gradeOut = gOut, type = p.PVIType.ToString() });
}

return new { profile = prof.Name, entities = prof.Entities.Count, pvis = pviList, curveErrors };
```

## Usage Notes
- Grades are returned as ratios (0.02 = 2 %).
- Elevation at a station: `prof.ElevationAt(station)`.
