---
name: object_data
category: map
description: Map 3D object data - read the OD records of an entity, or create an OD table and attach a record with values to entities
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: entityHandles
    type: string[]
    required: true
  - name: tableName
    type: string
    required: false
---

## Code Template — read

```csharp
using Autodesk.Gis.Map;
using Autodesk.Gis.Map.ObjectData;

// ---- parameters ----
var entityHandles = new[] { "2A4" };
// ---- end parameters ----

var tables = HostMapApplicationServices.Application.ActiveProject.ODTables;
var result = new List<object>();
foreach (var h in entityHandles)
{
    var id = Database.GetObjectId(false, new Handle(Convert.ToInt64(h, 16)), 0);
    var data = new List<object>();
    foreach (string n in tables.GetTableNames())
    {
        var t = tables[n];
        using var recs = t.GetObjectTableRecords(0, id, Autodesk.Gis.Map.Constants.OpenMode.OpenForRead, false);
        foreach (Record rec in recs)
        {
            var values = new Dictionary<string, string>();
            for (int i = 0; i < rec.Count; i++)
            {
                var mv = rec[i];
                values[t.FieldDefinitions[i].Name] = mv.Type switch
                {
                    Autodesk.Gis.Map.Constants.DataType.Integer => mv.Int32Value.ToString(),
                    Autodesk.Gis.Map.Constants.DataType.Real => mv.DoubleValue.ToString(System.Globalization.CultureInfo.InvariantCulture),
                    _ => mv.StrValue,
                };
            }
            data.Add(new { table = n, values });
        }
    }
    result.Add(new { handle = h, data });
}
return result;
```

## Code Template — create table and attach

```csharp
using Autodesk.Gis.Map;
using Autodesk.Gis.Map.ObjectData;
using Autodesk.Gis.Map.Constants;

// ---- parameters ----
var tableName = "PARCELAS";
var entityHandles = new[] { "2A4" };
var values = new Dictionary<string, string> { ["REF"] = "P-001", ["USO"] = "Residencial" };
// ---- end parameters ----

var project = HostMapApplicationServices.Application.ActiveProject;
var tables = project.ODTables;
if (!tables.IsTableDefined(tableName))
{
    var defs = project.MapUtility.NewODFieldDefinitions();
    int col = 0;
    foreach (var k in values.Keys)
        defs.AddColumn(FieldDefinition.Create(k, k, DataType.Character), col++);
    tables.Add(tableName, defs, tableName, true);
}
var table = tables[tableName];
foreach (var h in entityHandles)
{
    var id = Database.GetObjectId(false, new Handle(Convert.ToInt64(h, 16)), 0);
    var rec = Record.Create();
    table.InitRecord(rec);
    for (int i = 0; i < table.FieldDefinitions.Count; i++)
        if (values.TryGetValue(table.FieldDefinitions[i].Name, out var v)) rec[i].Assign(v);
    table.AddRecord(rec, id);
}
return new { table = tableName, attachedTo = entityHandles.Length };
```

## Usage Notes
- Text fields use DataType.Character; numbers DataType.Integer / DataType.Real (Assign an int/double).
- OD tables travel with the DWG and export to SHP attributes (MAPEXPORT).
