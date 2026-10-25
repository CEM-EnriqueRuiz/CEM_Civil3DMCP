---
name: list_styles
category: styles
description: List available Civil 3D style names per object type (surface, alignment, profile, profile view, section view, point, label sets, parts lists...)
requires_write: false
verified: Civil 3D 2027 (26.0.0.0)
parameters: []
---

## Code Template

```csharp
// ---- parameters ----
var filter = "";        // e.g. "Surface" to only list collections whose name contains it
// ---- end parameters ----

// Walk CivilDoc.Styles (and LabelSetStyles) by reflection: every property that enumerates
// ObjectIds is a style collection. Robust across Civil 3D versions.
var result = new SortedDictionary<string, object>();
void Collect(object root, string prefix)
{
    foreach (var prop in root.GetType().GetProperties())
    {
        if (prop.GetIndexParameters().Length > 0) continue;
        object value;
        try { value = prop.GetValue(root); } catch { continue; }
        if (value is System.Collections.IEnumerable items && !(value is string))
        {
            var key = prefix + prop.Name;
            if (filter != "" && key.IndexOf(filter, StringComparison.OrdinalIgnoreCase) < 0) continue;
            var names = new List<string>();
            try
            {
                foreach (var item in items)
                    if (item is ObjectId id && Transaction.GetObject(id, OpenMode.ForRead) is Autodesk.AutoCAD.DatabaseServices.DBObject o)
                        names.Add(o.GetType().GetProperty("Name")?.GetValue(o)?.ToString() ?? id.ToString());
            }
            catch { continue; }
            if (names.Count > 0) result[key] = names;
        }
        else if (value != null && prop.Name.EndsWith("Styles") && prop.PropertyType.Namespace?.StartsWith("Autodesk.Civil") == true && prefix == "")
            Collect(value, prop.Name + ".");      // e.g. LabelSetStyles.AlignmentLabelSetStyles, LabelStyles...
    }
}
Collect(CivilDoc.Styles, "");
return result;
```

## Usage Notes
- Apply a style: `obj.StyleId = CivilDoc.Styles.SurfaceStyles["Contours 1m and 5m (Design)"];`
- Style names come from the template (.dwt); Spanish templates use Spanish names.
