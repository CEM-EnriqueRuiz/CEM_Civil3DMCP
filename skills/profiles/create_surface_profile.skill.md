---
name: create_surface_profile
category: profiles
description: Create an existing-ground profile by sampling a surface along an alignment
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: alignmentName
    type: string
    required: true
  - name: surfaceName
    type: string
    required: true
---

## Code Template

```csharp
// ---- parameters ----
var alignmentName = "Eje 1";
var surfaceName = "EG";
var profileName = alignmentName + " - " + surfaceName;
// ---- end parameters ----

ObjectId alId = ObjectId.Null, sfId = ObjectId.Null;
foreach (ObjectId id in CivilDoc.GetAlignmentIds())
    if (((Alignment)Transaction.GetObject(id, OpenMode.ForRead)).Name == alignmentName) alId = id;
foreach (ObjectId id in CivilDoc.GetSurfaceIds())
    if (((Autodesk.Civil.DatabaseServices.Surface)Transaction.GetObject(id, OpenMode.ForRead)).Name == surfaceName) sfId = id;
if (alId.IsNull) return new { error = "Alignment not found: " + alignmentName };
if (sfId.IsNull) return new { error = "Surface not found: " + surfaceName };

var styleId = CivilDoc.Styles.ProfileStyles[0];
var labelSetId = CivilDoc.Styles.LabelSetStyles.ProfileLabelSetStyles[0];
var profId = Profile.CreateFromSurface(profileName, alId, sfId, Database.Clayer, styleId, labelSetId);
var prof = (Profile)Transaction.GetObject(profId, OpenMode.ForRead);

return new { profile = prof.Name, type = prof.ProfileType.ToString(),
             startStation = prof.StartingStation, endStation = prof.EndingStation,
             minElevation = prof.ElevationMin, maxElevation = prof.ElevationMax };
```

## Usage Notes
- The profile only covers stations where the alignment is over the surface.
- To see it, create a profile view (create_profile_view).
