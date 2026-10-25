---
name: layouts
category: cad
description: List paper-space layouts (with viewports and plot settings) or create a new layout with a viewport showing a model-space window
requires_write: true
verified: Civil 3D 2027 (26.0.0.0)
parameters:
  - name: newLayout
    type: string
    required: false
    description: Empty = list only
---

## Code Template

```csharp
// ---- parameters ----
var newLayout = "";                                   // "" = list only
var modelWindow = new[] { 0.0, 0.0, 300.0, 200.0 };  // xmin, ymin, xmax, ymax shown in the viewport
var viewportBox = new[] { 20.0, 20.0, 400.0, 277.0 }; // paper units (mm on A3)
// ---- end parameters ----

object created = null;
if (!string.IsNullOrEmpty(newLayout))
{
    var lm = LayoutManager.Current;
    var layoutId = lm.CreateLayout(newLayout);
    var layout = (Layout)Transaction.GetObject(layoutId, OpenMode.ForRead);
    var ps = (BlockTableRecord)Transaction.GetObject(layout.BlockTableRecordId, OpenMode.ForWrite);
    double w = viewportBox[2] - viewportBox[0], h = viewportBox[3] - viewportBox[1];
    var vp = new Viewport { CenterPoint = new Point3d(viewportBox[0] + w / 2, viewportBox[1] + h / 2, 0), Width = w, Height = h };
    ps.AppendEntity(vp); Transaction.AddNewlyCreatedDBObject(vp, true);
    double mw = modelWindow[2] - modelWindow[0], mh = modelWindow[3] - modelWindow[1];
    vp.ViewCenter = new Point2d(modelWindow[0] + mw / 2, modelWindow[1] + mh / 2);
    vp.CustomScale = Math.Min(w / mw, h / mh);          // paper units per model unit
    // a viewport can only be switched on while its layout is current (else eNotInPaperspace)
    var previous = lm.CurrentLayout;
    lm.CurrentLayout = newLayout;
    vp.On = true;
    lm.CurrentLayout = previous;
    created = new { layout = newLayout, scale = "1:" + Math.Round(1 / vp.CustomScale, 2) };
}

var layouts = new List<(int tab, object info)>();
var dict = (DBDictionary)Transaction.GetObject(Database.LayoutDictionaryId, OpenMode.ForRead);
foreach (DBDictionaryEntry de in dict)
{
    var lay = (Layout)Transaction.GetObject(de.Value, OpenMode.ForRead);
    var vps = new List<object>();
    if (!lay.ModelType)
        foreach (ObjectId vid in lay.GetViewports())
        {
            var vp = (Viewport)Transaction.GetObject(vid, OpenMode.ForRead);
            if (vp.Number == 1) continue;  // the paper-space viewport itself
            vps.Add(new { handle = vp.Handle.ToString(), scale = vp.CustomScale, center = new[] { vp.ViewCenter.X, vp.ViewCenter.Y } });
        }
    layouts.Add((lay.TabOrder, new { lay.LayoutName, tab = lay.TabOrder, model = lay.ModelType, device = lay.PlotConfigurationName, paper = lay.CanonicalMediaName, viewports = vps }));
}
return new { created, layouts = layouts.OrderBy(l => l.tab).Select(l => l.info) };
```

## Usage Notes
- New layouts inherit page setup defaults; set paper/plotter with a PlotSettingsValidator.
- Plan/profile sheets for alignments are better made with Civil 3D's Plan Production (View Frames) in the UI.
