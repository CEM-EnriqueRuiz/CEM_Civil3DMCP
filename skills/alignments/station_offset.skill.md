---
name: station_offset
category: alignments
description: Convert between station+offset and X,Y coordinates along an alignment
requires_write: false
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: alignmentName
    type: string
    required: true
  - name: station
    type: double
    required: false
    description: Station value (for station-to-point conversion)
  - name: offset
    type: double
    required: false
    description: Offset from centerline (for station-to-point)
  - name: x
    type: double
    required: false
    description: X coordinate (for point-to-station conversion)
  - name: y
    type: double
    required: false
    description: Y coordinate (for point-to-station conversion)
---

## Code Template — Station to Point

```csharp
// ---- parameters ----
var alignmentName = "Eje 1";
double station = 100.0;
double offset = 0.0;          // negative = left
// ---- end parameters ----

Alignment alignment = null;
foreach (ObjectId id in CivilDoc.GetAlignmentIds())
{
    var a = Transaction.GetObject(id, OpenMode.ForRead) as Alignment;
    if (a != null && a.Name.Equals(alignmentName, StringComparison.OrdinalIgnoreCase))
    { alignment = a; break; }
}
if (alignment == null) return new { error = "Alignment not found: " + alignmentName };

double x = 0, y = 0;
alignment.PointLocation(station, offset, ref x, ref y);

return new { alignmentName = alignment.Name, station, offset, x, y };
```

## Code Template — Point to Station

```csharp
// ---- parameters ----
var alignmentName = "Eje 1";
double x = 1000.0;
double y = 2000.0;
// ---- end parameters ----

Alignment alignment = null;
foreach (ObjectId id in CivilDoc.GetAlignmentIds())
{
    var a = Transaction.GetObject(id, OpenMode.ForRead) as Alignment;
    if (a != null && a.Name.Equals(alignmentName, StringComparison.OrdinalIgnoreCase))
    { alignment = a; break; }
}
if (alignment == null) return new { error = "Alignment not found: " + alignmentName };

double station = 0, offset = 0;
alignment.StationOffset(x, y, ref station, ref offset);

return new { alignmentName = alignment.Name, x, y, station, offset };
```
