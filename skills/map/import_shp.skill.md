---
name: import_shp
category: map
description: Import a Shapefile (or other FDO/GIS format supported by MAPIMPORT) as AutoCAD objects with attributes as object data
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: filePath
    type: string
    required: true
---

## Code Template

```csharp
using Autodesk.Gis.Map;
using Autodesk.Gis.Map.ImportExport;

// ---- parameters ----
var filePath = @"C:\gis\parcelas.shp";
var layerPrefix = "GIS_";
// ---- end parameters ----

if (!System.IO.File.Exists(filePath)) return new { error = "File not found: " + filePath };
var importer = HostMapApplicationServices.Application.Importer;
importer.Init("SHP", filePath);
var layers = new List<string>();
foreach (InputLayer il in importer)
{
    // FDO layer names look like "Default:parcelas" - ':' etc. are invalid in AutoCAD layer / OD table names
    var clean = System.Text.RegularExpressions.Regex.Replace(il.Name.Split(':').Last(), @"[<>/\\"":;?*|,=`\s]", "_");
    il.SetLayerName(LayerNameType.LayerNameDirect, layerPrefix + clean);
    il.SetDataMapping(ImportDataMapping.NewObjectDataOnly, "OD_" + clean);
    layers.Add(il.Name + " -> " + layerPrefix + clean);
}
importer.ImportPolygonsAsClosedPolylines = true;
var res = importer.Import(true);
return new { layers, imported = res.EntitiesImported, notTransformed = res.EntitiesSkippedCouldNotTransform };
```

## Usage Notes
- Coordinates are imported as-is; the SHP must already be in the drawing's coordinate system
  (or use Map 3D's MAPIMPORT dialog with transformation).
- Experimental: if the importer refuses to run inside the plugin's transaction, use
  `Document.SendStringToExecute("_MAPIMPORT ", true, false, false)` and let the user pick the file.
