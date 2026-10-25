---
name: import_export_points
category: points
description: Import COGO points from a PNEZD text/CSV file, or export points to CSV
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: mode
    type: string
    required: true
    description: import | export
  - name: filePath
    type: string
    required: true
---

## Code Template — import

```csharp
// ---- parameters ----
var filePath = @"C:\datos\puntos.csv";
var formatName = "PNEZD (comma delimited)";   // see list below
// ---- end parameters ----

if (!System.IO.File.Exists(filePath)) return new { error = "File not found: " + filePath };
var formats = PointFileFormatCollection.GetPointFileFormats(Database);
var available = new List<string>();
foreach (PointFileFormat f in formats) available.Add(f.Name);      // names are localized
if (!available.Contains(formatName))
{
    // e.g. "PNEZD (comma delimited)" -> Spanish "PNEZD (delimitado por comas)"
    var key = formatName.Split(' ')[0];
    bool comma = formatName.Contains("comma");
    var match = available.FirstOrDefault(n => n.StartsWith(key + " ") && (n.Contains("com") == comma));
    if (match == null) return new { error = "Format not found: " + formatName, available };
    formatName = match;
}

var before = CivilDoc.CogoPoints.Count;
var count = CogoPointCollection.ImportPoints(filePath, formats[formatName]);   // static in 2027
return new { imported = count, total = CivilDoc.CogoPoints.Count, format = formatName };
```

## Code Template — export

```csharp
// ---- parameters ----
var filePath = @"C:\datos\export_puntos.csv";
var includeHeader = false;      // false keeps the file re-importable as PNEZD
// ---- end parameters ----

var sb = new StringBuilder(includeHeader ? "P,N,E,Z,D\n" : "");
var inv = System.Globalization.CultureInfo.InvariantCulture;
foreach (ObjectId id in CivilDoc.CogoPoints)
{
    var p = (CogoPoint)Transaction.GetObject(id, OpenMode.ForRead);
    sb.AppendLine($"{p.PointNumber},{p.Northing.ToString("0.000", inv)},{p.Easting.ToString("0.000", inv)},{p.Elevation.ToString("0.000", inv)},{p.RawDescription}");
}
System.IO.File.WriteAllText(filePath, sb.ToString());
return new { exported = CivilDoc.CogoPoints.Count, filePath };
```

## Usage Notes
- Format names are localized ("PNEZD (delimitado por comas)" in Spanish); the template maps the English name automatically and lists what exists if it can't.
- Export uses invariant culture (dot decimals) regardless of Windows locale.
