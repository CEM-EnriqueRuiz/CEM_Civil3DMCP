---
name: create_simple_corridor
category: corridors
description: Build a basic road corridor - assembly with stock lane + shoulder + daylight subassemblies, corridor on alignment/profile, Top corridor surface
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: alignmentName
    type: string
    required: true
  - name: profileName
    type: string
    required: true
    description: Design (layout) profile
  - name: targetSurface
    type: string
    required: false
    description: Existing ground for daylighting
---

## Code Template

```csharp
// ---- parameters ----
var alignmentName = "Eje 1";
var profileName = "Eje 1 - Rasante";
var targetSurface = "EG";                      // "" = no daylight targets
var corridorName = "Corredor " + alignmentName;
var assemblyName = "Sección tipo " + alignmentName;
var assemblyLocation = new Point3d(-100, -100, 0);
var frequency = 10.0;
// ---- end parameters ----

ObjectId alId = ObjectId.Null, prId = ObjectId.Null, sfId = ObjectId.Null;
foreach (ObjectId id in CivilDoc.GetAlignmentIds())
{
    var a = (Alignment)Transaction.GetObject(id, OpenMode.ForRead);
    if (a.Name != alignmentName) continue;
    alId = id;
    foreach (ObjectId pid in a.GetProfileIds())
        if (((Profile)Transaction.GetObject(pid, OpenMode.ForRead)).Name == profileName) prId = pid;
}
foreach (ObjectId id in CivilDoc.GetSurfaceIds())
    if (((Autodesk.Civil.DatabaseServices.Surface)Transaction.GetObject(id, OpenMode.ForRead)).Name == targetSurface) sfId = id;
if (alId.IsNull) return new { error = "Alignment not found: " + alignmentName };
if (prId.IsNull) return new { error = "Profile not found: " + profileName };

var steps = new List<string>();

// 1. assembly: lane -> shoulder -> daylight on each side, chained to the outermost top point
var asmId = CivilDoc.AssemblyCollection.Add(assemblyName, AssemblyType.UndividedCrownedRoad, assemblyLocation);
var asm = (Autodesk.Civil.DatabaseServices.Assembly)Transaction.GetObject(asmId, OpenMode.ForWrite);
steps.Add("assembly " + asm.Name);

// outermost point of a subassembly (largest |offset|, then highest) = where the next one hooks on
Autodesk.Civil.DatabaseServices.Point Outer(ObjectId saId)
{
    var sa = (Autodesk.Civil.DatabaseServices.Subassembly)Transaction.GetObject(saId, OpenMode.ForRead);
    Autodesk.Civil.DatabaseServices.Point best = null;
    foreach (Autodesk.Civil.DatabaseServices.Point pt in sa.Points)
        if (best == null || Math.Abs(pt.Offset) > Math.Abs(best.Offset) + 1e-6
            || (Math.Abs(Math.Abs(pt.Offset) - Math.Abs(best.Offset)) <= 1e-6 && pt.Elevation > best.Elevation)) best = pt;
    return best;
}

foreach (var side in new[] { SubassemblySideType.Right, SubassemblySideType.Left })
{
    ObjectId Import(string label, string cls)
    {
        var id = CivilDoc.SubassemblyCollection.ImportStockSubassembly(label + " " + side, cls, assemblyLocation);
        ((Autodesk.Civil.DatabaseServices.Subassembly)Transaction.GetObject(id, OpenMode.ForWrite)).Side = side;
        return id;
    }
    var lane = Import("Carril", "Subassembly.LaneSuperelevationAOR");
    asm.AddSubassembly(lane);                                     // hooks to the assembly baseline point
    var shoulder = Import("Arcen", "Subassembly.ShoulderExtendSubbase");
    asm.AddSubassembly(shoulder, Outer(lane));
    if (!sfId.IsNull)
    {
        var daylight = Import("Talud", "Subassembly.BasicSideSlopeCutDitch");
        asm.AddSubassembly(daylight, Outer(shoulder));
    }
}
steps.Add("subassemblies: lane, shoulder" + (sfId.IsNull ? "" : ", daylight") + " x2");

// 2. corridor
var corId = CivilDoc.CorridorCollection.Add(corridorName, "BL " + alignmentName, alId, prId, "RG 1", asmId);
var cor = (Corridor)Transaction.GetObject(corId, OpenMode.ForWrite);
var designProfile = (Profile)Transaction.GetObject(prId, OpenMode.ForRead);
foreach (Baseline b in cor.Baselines)
    foreach (BaselineRegion r in b.BaselineRegions)
    {
        // keep the region inside the design profile (no profile = sections at elevation 0)
        try
        {
            if (r.StartStation < designProfile.StartingStation) r.StartStation = designProfile.StartingStation;
            if (r.EndStation > designProfile.EndingStation) r.EndStation = designProfile.EndingStation;
        }
        catch (System.Exception ex) { steps.Add("region not clipped: " + ex.Message); }
        r.AppliedAssemblySetting.FrequencyAlongTangents = frequency;
        r.AppliedAssemblySetting.FrequencyAlongCurves = frequency;
        if (!sfId.IsNull)
        {
            var targets = r.GetTargets();
            foreach (SubassemblyTargetInfo t in targets)
                if (t.TargetType == SubassemblyLogicalNameType.Surface)
                    t.TargetIds = new ObjectIdCollection { sfId };
            r.SetTargets(targets);
        }
    }
steps.Add("corridor " + cor.Name);

// 3. corridor surface from the Top links (link codes exist only after the first rebuild)
cor.Rebuild();
var linkCodes = cor.GetLinkCodes();
var topCode = linkCodes.FirstOrDefault(c => c == "Top") ?? linkCodes.FirstOrDefault(c => c.IndexOf("Top", StringComparison.OrdinalIgnoreCase) >= 0);
if (topCode == null) return new { corridor = cor.Name, steps, error = "No 'Top' link code; available: " + string.Join(", ", linkCodes) };
var cs = cor.CorridorSurfaces.Add(corridorName + " Top");
cs.AddLinkCode(topCode, true);
try { cs.Boundaries.AddCorridorExtentsBoundary("Extents"); } catch (System.Exception ex) { steps.Add("boundary skipped: " + ex.Message); }
cor.Rebuild();
// corridor surfaces are only (re)triangulated by an explicit rebuild of their TIN
foreach (CorridorSurface s2 in cor.CorridorSurfaces)
    ((TinSurface)Transaction.GetObject(s2.SurfaceId, OpenMode.ForWrite)).Rebuild();
steps.Add("rebuilt corridor + surfaces");

return new { corridor = cor.Name, assembly = asm.Name, surface = cs.Name, linkCodes, steps };
```

## Usage Notes
- Stock subassembly class names are in the Civil 3D Tool Palettes (Subassembly.dll):
  LaneSuperelevationAOR, ShoulderExtendSubbase, BasicLane, BasicShoulder, BasicCurbAndGutter, BasicSidewalk, BasicSideSlopeCutDitch,
  DaylightGeneral, DaylightStandard, DaylightMaxOffset, DaylightBench... (list them: `AppDomain...First(a => a.GetName().Name == "C3DStockSubassemblies").GetExportedTypes()`)
- Side: `sa.Side = SubassemblySideType.Left/Right`. Other parameters via `sa.ParamsDouble[...]`, `sa.ParamsLong[...]`, `sa.ParamsString[...]` (names as in the subassembly properties).
- Attachment: `asm.AddSubassembly(id)` hooks to the assembly; `asm.AddSubassembly(id, point)` hooks to a `Autodesk.Civil.DatabaseServices.Point` of the previous one (here: outermost top point).
- Frequency: `AppliedAssemblySetting.FrequencyAlongTangents / FrequencyAlongCurves` (2027 names).
- This is the most API-sensitive skill: if a step fails, the exception names it — adapt rather than retry blindly.
