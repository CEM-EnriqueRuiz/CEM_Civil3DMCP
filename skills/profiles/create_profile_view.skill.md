---
name: create_profile_view
category: profiles
description: Create a profile view (graph) for an alignment at an insertion point; all its profiles are drawn in it
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: alignmentName
    type: string
    required: true
  - name: insertX
    type: double
    required: false
  - name: insertY
    type: double
    required: false
---

## Code Template

```csharp
// ---- parameters ----
var alignmentName = "Eje 1";
var insertPoint = new Point3d(0, -200, 0);     // lower-left corner of the view
var viewName = alignmentName + " - PV";
var styleName = "";                            // "" = first profile view style
var bandSetName = "";                          // "" = first band set
// ---- end parameters ----

ObjectId alId = ObjectId.Null;
foreach (ObjectId id in CivilDoc.GetAlignmentIds())
    if (((Alignment)Transaction.GetObject(id, OpenMode.ForRead)).Name == alignmentName) alId = id;
if (alId.IsNull) return new { error = "Alignment not found: " + alignmentName };

var styleId = string.IsNullOrEmpty(styleName) ? CivilDoc.Styles.ProfileViewStyles[0] : CivilDoc.Styles.ProfileViewStyles[styleName];
var bandId = string.IsNullOrEmpty(bandSetName) ? CivilDoc.Styles.ProfileViewBandSetStyles[0] : CivilDoc.Styles.ProfileViewBandSetStyles[bandSetName];
var pvId = ProfileView.Create(alId, insertPoint, viewName, bandId, styleId);
var pv = (ProfileView)Transaction.GetObject(pvId, OpenMode.ForRead);
var ext = pv.GeometricExtents;

return new { profileView = pv.Name, handle = pv.Handle.ToString(),
             extents = new { min = new[] { ext.MinPoint.X, ext.MinPoint.Y }, max = new[] { ext.MaxPoint.X, ext.MaxPoint.Y } } };
```

## Usage Notes
- Place views away from plan geometry (e.g. below it) to keep the drawing readable.
- Use the returned extents with zoom_to_area + civil3d_screenshot to check the result.
