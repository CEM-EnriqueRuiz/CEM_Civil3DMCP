---
name: surface_volume
category: surfaces
description: Cut/fill volumes between two surfaces (base vs comparison) via a temporary TIN volume surface (run with civil3d_execute)
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: baseSurface
    type: string
    required: true
    description: Existing ground surface name
  - name: comparisonSurface
    type: string
    required: true
    description: Proposed / design surface name
  - name: keepVolumeSurface
    type: bool
    required: false
    description: true keeps the volume surface in the drawing (default false = erased after reading)
---

## Code Template

```csharp
// ---- parameters ----
var baseSurface = "EG";
var comparisonSurface = "FG";
var volumeSurfaceName = "VOL " + baseSurface + "-" + comparisonSurface;
var keepVolumeSurface = false;
// ---- end parameters ----

ObjectId baseId = ObjectId.Null, compId = ObjectId.Null;
foreach (ObjectId id in CivilDoc.GetSurfaceIds())
{
    var s = (Autodesk.Civil.DatabaseServices.Surface)Transaction.GetObject(id, OpenMode.ForRead);
    if (s.Name.Equals(baseSurface, StringComparison.OrdinalIgnoreCase)) baseId = id;
    if (s.Name.Equals(comparisonSurface, StringComparison.OrdinalIgnoreCase)) compId = id;
}
if (baseId.IsNull) return new { error = "Base surface not found: " + baseSurface };
if (compId.IsNull) return new { error = "Comparison surface not found: " + comparisonSurface };

// A TIN volume surface computes the volumes. Creating it needs civil3d_execute
// (queries run without a document lock); it is erased again unless keepVolumeSurface.
var volId = TinVolumeSurface.Create(volumeSurfaceName, baseId, compId);
var vol = (TinVolumeSurface)Transaction.GetObject(volId, OpenMode.ForWrite);
var p = vol.GetVolumeProperties();
if (!keepVolumeSurface) vol.Erase();

return new {
    baseSurface, comparisonSurface,
    cut = p.UnadjustedCutVolume,
    fill = p.UnadjustedFillVolume,
    net = p.UnadjustedNetVolume,          // fill - cut: negative = net cut (excess material)
    adjustedCut = p.AdjustedCutVolume,     // after cut/fill factors
    adjustedFill = p.AdjustedFillVolume,
    volumeSurfaceKept = keepVolumeSurface
};
```

## Usage Notes
- One civil3d_execute = one undo step; with keepVolumeSurface=false the drawing is unchanged.
- Volumes are in drawing units cubed (m³ for metric drawings).
- Surfaces must overlap; areas outside the overlap are ignored.
