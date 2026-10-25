---
name: transform_coordinates
category: map
description: Transform XY coordinates between coordinate systems (e.g. ETRS89 UTM 30N <-> WGS84 lat/long) with the Map 3D / MapGuide coordinate library
requires_write: false
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: fromCode
    type: string
    required: true
  - name: toCode
    type: string
    required: true
  - name: points
    type: double[][]
    required: true
---

## Code Template

```csharp
using OSGeo.MapGuide;

// ---- parameters ----
var fromCode = "ETRS89.UTM-30N";       // "" = the drawing's coordinate system
var toCode = "LL84";                   // WGS84 lon/lat in degrees
var points = new double[][] { new[] { 440000.0, 4474000.0 } };
// ---- end parameters ----

if (fromCode == "") fromCode = CivilDoc.Settings.DrawingSettings.UnitZoneSettings.CoordinateSystemCode;
var factory = new MgCoordinateSystemFactory();
var src = factory.CreateFromCode(fromCode);
var dst = factory.CreateFromCode(toCode);
var tf = factory.GetTransform(src, dst);
var output = new List<object>();
foreach (var p in points)
{
    var c = tf.Transform(p[0], p[1]);
    output.Add(new { x = p[0], y = p[1], toX = c.X, toY = c.Y });   // for LL84: toX = longitude, toY = latitude
}
return new { from = fromCode, to = toCode, points = output };
```

## Usage Notes
- Codes are Autodesk coordinate-system library codes (MAPCSLIBRARY): e.g. ETRS89.UTM-30N, ED50-UTM30, LL84, WGS84.PseudoMercator.
- Search codes: `factory.GetCatalog().GetCoordinateSystemDictionary()`.
