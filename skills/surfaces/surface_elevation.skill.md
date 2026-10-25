---
name: surface_elevation
category: surfaces
description: Get the elevation of a surface at a specific X,Y coordinate
requires_write: false
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: surfaceName
    type: string
    required: true
  - name: x
    type: double
    required: true
  - name: y
    type: double
    required: true
---

## Code Template

```csharp
// ---- parameters ----
var surfaceName = "EG";
double x = 1000.0;
double y = 2000.0;
// ---- end parameters ----

// Find the surface by name
Autodesk.Civil.DatabaseServices.Surface targetSurface = null;
foreach (ObjectId id in CivilDoc.GetSurfaceIds())
{
    var s = Transaction.GetObject(id, OpenMode.ForRead) as Autodesk.Civil.DatabaseServices.Surface;
    if (s != null && s.Name.Equals(surfaceName, StringComparison.OrdinalIgnoreCase))
    {
        targetSurface = s;
        break;
    }
}

if (targetSurface == null)
    return new { error = "Surface not found: " + surfaceName };

double elevation = targetSurface.FindElevationAtXY(x, y);

return new {
    surfaceName = targetSurface.Name,
    x, y, elevation
};
```

## Usage Notes
- Throws exception if the point is outside the surface boundary
- Coordinates must be in the drawing's coordinate system
- Works with both TIN and Grid surfaces
