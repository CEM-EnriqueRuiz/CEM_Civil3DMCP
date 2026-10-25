using Autodesk.AutoCAD.ApplicationServices;
using App = Autodesk.AutoCAD.ApplicationServices.Application;

namespace Civil3DMcpPlugin;

/// <summary>Saves the active drawing (Save, or Save As when a path is given).</summary>
public static class DrawingFile
{
  public static Task<object?> SaveAsync(string? path)
  {
    return CivilExecution.RunOnMainThreadAsync<object?>(() =>
    {
      var doc = App.DocumentManager.MdiActiveDocument
        ?? throw new JsonRpcDispatchException("CIVIL3D.NO_DRAWING", "No active drawing is open in Civil 3D.");
      dynamic acDoc = doc.GetAcadDocument();   // 2027: extension method (DocumentExtension)
      bool named = ((string)acDoc.FullName).Length > 0;

      if (string.IsNullOrWhiteSpace(path))
      {
        if (!named)
          throw new JsonRpcDispatchException("CIVIL3D.INVALID_INPUT",
            $"'{doc.Name}' has never been saved; pass a full path ending in .dwg.");
        acDoc.Save();
      }
      else
      {
        acDoc.SaveAs(SavePath.Validate(path));
      }

      return Task.FromResult<object?>(new
      {
        saved = true,
        name = (string)acDoc.Name,
        fullName = (string)acDoc.FullName,
      });
    });
  }
}

/// <summary>Test/automation helpers that do not need an open drawing.</summary>
public static class Automation
{
  /// <summary>Opens a new drawing from a template (default: the QNEW template) and activates it.</summary>
  public static Task<object?> NewDrawingAsync(string? template)
  {
    return CivilExecution.RunOnMainThreadAsync<object?>(() =>
    {
      var dm = App.DocumentManager;
      if (string.IsNullOrWhiteSpace(template))
      {
        dynamic prefs = App.Preferences;
        string qnew = prefs.Files.QNewTemplateFile;
        string dir = prefs.Files.TemplateDwgPath;
        template = !string.IsNullOrWhiteSpace(qnew) && File.Exists(qnew) ? qnew
          : Directory.Exists(dir)
            ? Directory.EnumerateFiles(dir, "*.dwt").OrderByDescending(f => f.Contains("Civil", StringComparison.OrdinalIgnoreCase)).FirstOrDefault()
            : null;
      }
      var doc = dm.Add(template ?? "");
      dm.MdiActiveDocument = doc;
      return Task.FromResult<object?>(new { drawing = doc.Name, template });
    });
  }
}
