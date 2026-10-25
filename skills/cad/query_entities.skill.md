---
name: query_entities
category: cad
description: Find model-space entities filtered by type, layer and/or a bounding window; returns handle, type, layer, extents (and length/area when available)
requires_write: false
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: typeFilter
    type: string
    required: false
    description: .NET class name e.g. Polyline, Line, BlockReference, Alignment, TinSurface ("" = all)
  - name: layerFilter
    type: string
    required: false
---

## Code Template

```csharp
// ---- parameters ----
var typeFilter = "";            // e.g. "Polyline"
var layerFilter = "";           // e.g. "C-ROAD*" (wildcards)
double[] window = null;         // e.g. new[] { xmin, ymin, xmax, ymax }
var limit = 300;
// ---- end parameters ----

var rx = string.IsNullOrEmpty(layerFilter) ? null
    : new System.Text.RegularExpressions.Regex("^" + System.Text.RegularExpressions.Regex.Escape(layerFilter).Replace("\\*", ".*").Replace("\\?", ".") + "$",
                                                System.Text.RegularExpressions.RegexOptions.IgnoreCase);
var ms = (BlockTableRecord)Transaction.GetObject(SymbolUtilityServices.GetBlockModelSpaceId(Database), OpenMode.ForRead);
var found = new List<object>(); int total = 0;
foreach (ObjectId id in ms)
{
    var e = (Autodesk.AutoCAD.DatabaseServices.Entity)Transaction.GetObject(id, OpenMode.ForRead);
    var type = e.GetType().Name;
    if (typeFilter != "" && !type.Equals(typeFilter, StringComparison.OrdinalIgnoreCase)) continue;
    if (rx != null && !rx.IsMatch(e.Layer)) continue;
    Extents3d? ext = null;
    try { ext = e.GeometricExtents; } catch { }
    if (window != null && (ext == null || ext.Value.MaxPoint.X < window[0] || ext.Value.MinPoint.X > window[2]
                           || ext.Value.MaxPoint.Y < window[1] || ext.Value.MinPoint.Y > window[3])) continue;
    total++;
    if (found.Count >= limit) continue;
    double? length = null, area = null;
    if (e is Curve c) { try { length = c.GetDistanceAtParameter(c.EndParam); } catch { } try { if (c.Closed) area = c.Area; } catch { } }
    found.Add(new { handle = e.Handle.ToString(), type, e.Layer,
                    min = ext == null ? null : new[] { ext.Value.MinPoint.X, ext.Value.MinPoint.Y },
                    max = ext == null ? null : new[] { ext.Value.MaxPoint.X, ext.Value.MaxPoint.Y }, length, area });
}
return new { total, returned = found.Count, entities = found };
```

## Usage Notes
- Handles feed other skills (polylineHandle, curveHandle, breaklineHandles...).
- Civil 3D objects report their .NET class (Alignment, TinSurface, CogoPoint, FeatureLine, Corridor...).
