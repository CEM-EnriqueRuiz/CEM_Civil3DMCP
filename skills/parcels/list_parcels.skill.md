---
name: list_parcels
category: parcels
description: List sites and their parcels with area and perimeter
requires_write: false
verified: Civil 3D 2027 (26.0.0.0)
parameters: []
---

## Code Template

```csharp
var sites = new List<object>();
foreach (ObjectId sid in CivilDoc.GetSiteIds())
{
    var site = (Site)Transaction.GetObject(sid, OpenMode.ForRead);
    var parcels = new List<object>();
    foreach (ObjectId pid in site.GetParcelIds())
    {
        var p = (Parcel)Transaction.GetObject(pid, OpenMode.ForRead);
        double? perimeter = null;
        try { perimeter = (double?)p.GetType().GetProperty("Perimeter")?.GetValue(p); } catch { }
        parcels.Add(new { p.Name, number = p.Number, area = p.Area, perimeter, style = p.StyleName });
    }
    sites.Add(new { site = site.Name, parcelCount = parcels.Count, parcels });
}
return new { siteCount = sites.Count, sites };
```

## Usage Notes
- Areas are in drawing units² (m²). The "site" parcel enclosing everything is included by Civil 3D.
- Creating parcels: draw closed polylines and use the UI command CreateParcelFromObjects
  (`Document.SendStringToExecute("_CreateParcelFromObjects ", ...)`) — there is no simple API call.
