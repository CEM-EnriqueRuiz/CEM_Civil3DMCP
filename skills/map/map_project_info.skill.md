---
name: map_project_info
category: map
description: Map 3D - current coordinate system of the drawing, object data tables (fields, number of attached records) and whether Map 3D API is available
requires_write: false
verified: Civil 3D 2027 (26.0.0.0)
parameters: []
---

## Code Template

```csharp
using Autodesk.Gis.Map;
using Autodesk.Gis.Map.ObjectData;

var project = HostMapApplicationServices.Application.ActiveProject;
var tables = project.ODTables;
var names = tables.GetTableNames();

// count records per table on model-space entities
var counts = new Dictionary<string, int>();
var ms = (BlockTableRecord)Transaction.GetObject(SymbolUtilityServices.GetBlockModelSpaceId(Database), OpenMode.ForRead);
foreach (string n in names) counts[n] = 0;
foreach (ObjectId id in ms)
    foreach (string n in names)
    {
        using var recs = tables[n].GetObjectTableRecords(0, id, Autodesk.Gis.Map.Constants.OpenMode.OpenForRead, false);
        counts[n] += recs.Count;
    }

var list = new List<object>();
foreach (string n in names)
{
    var t = tables[n];
    var fields = new List<object>();
    for (int i = 0; i < t.FieldDefinitions.Count; i++)
        fields.Add(new { t.FieldDefinitions[i].Name, type = t.FieldDefinitions[i].Type.ToString() });
    list.Add(new { table = n, t.Description, fields, records = counts[n] });
}

return new {
    coordinateSystem = project.Projection,          // Autodesk CS code, "" if none
    civilCoordinateSystem = CivilDoc.Settings.DrawingSettings.UnitZoneSettings.CoordinateSystemCode,
    objectDataTables = list
};
```

## Usage Notes
- Map 3D namespaces are not auto-imported (their `Table`/`Record` names clash with AutoCAD) — keep the `using` lines at the very top.
- Set the coordinate system: `project.Projection = "ETRS89.UTM-30N";` (needs civil3d_execute).
