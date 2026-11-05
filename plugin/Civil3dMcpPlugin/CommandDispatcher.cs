using System.Text.Json.Nodes;
using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.Civil.ApplicationServices;
using App = Autodesk.AutoCAD.ApplicationServices.Application;

namespace Civil3DMcpPlugin;

/// <summary>
/// Routes JSON-RPC methods: executeCode (Roslyn), getCivil3DHealth,
/// captureView (screenshot), saveDrawing, newDrawing and ping.
/// </summary>
public static class CommandDispatcher
{
  public static async Task<object?> DispatchAsync(
    string method,
    JsonObject? parameters,
    CancellationToken cancellationToken)
  {
    return method switch
    {
      "executeCode" => await ExecuteCodeAsync(parameters),
      "getCivil3DHealth" => await GetHealthAsync(),
      "captureView" => await ViewCapture.CaptureAsync(
        PluginRuntime.GetOptionalString(parameters, "mode") ?? "view",
        PluginRuntime.GetOptionalInt(parameters, "width") ?? 1600,
        PluginRuntime.GetOptionalInt(parameters, "height") ?? 1000,
        PluginRuntime.GetOptionalBool(parameters, "zoomExtents") ?? false,
        PluginRuntime.GetOptionalInt(parameters, "maxSize") ?? 1600),
      "saveDrawing" => await DrawingFile.SaveAsync(PluginRuntime.GetOptionalString(parameters, "path")),
      "newDrawing" => await Automation.NewDrawingAsync(PluginRuntime.GetOptionalString(parameters, "template")),
      "ping" => new { pong = true, pluginVersion = PluginRuntime.Version, hasDrawing = App.DocumentManager.MdiActiveDocument != null },

      _ => throw new JsonRpcDispatchException(
        "CIVIL3D.INVALID_INPUT",
        $"Unknown method '{method}'. Available: executeCode, getCivil3DHealth, captureView, saveDrawing, newDrawing, ping"
      ),
    };
  }

  /// <summary>
  /// Execute C# code via Roslyn in the Civil 3D context.
  /// </summary>
  private static async Task<object?> ExecuteCodeAsync(JsonObject? parameters)
  {
    var code = PluginRuntime.GetRequiredString(parameters, "code");
    var readOnly = parameters?["readOnly"]?.GetValue<bool>() ?? false;
    var description = PluginRuntime.GetOptionalString(parameters, "description") ?? "Script execution";

    // Log the execution
    System.Diagnostics.Debug.WriteLine($"[C3D-MCP] {(readOnly ? "QUERY" : "EXECUTE")}: {description}");

    // Execute on Civil 3D main thread with proper document locking
    return await CivilExecution.ExecuteAsync((doc, civilDoc, db, tr) =>
    {
      var context = new ScriptContext(doc, civilDoc, db, tr);

      // Run the Roslyn script synchronously: we are already on the main thread (the MCPEXEC command for a write,
      // the application context for a query). Blocking it is safe only while the script itself never awaits
      // (docs/concepts/known-gaps.md).
      var task = RoslynExecutor.ExecuteAsync(code, context);
      task.Wait();

      return task.Result;
    }, write: !readOnly);
  }

  /// <summary>Health check — verifies the plugin is alive and Civil 3D is responsive.</summary>
  private static Task<object?> GetHealthAsync()
  {
    return CivilExecution.ReadAsync<object?>((doc, civilDoc, db, tr) =>
    {
      return new
      {
        connected = true,
        drawingName = doc.Name,
        mode = "code_execution",
        roslyn = true,
        pluginVersion = PluginRuntime.Version,
        acadVersion = App.Version.ToString(),
        product = App.GetSystemVariable("PRODUCT")?.ToString(),
        mapApiLoaded = RoslynExecutor.MapApiLoaded,
        scriptTimeoutSeconds = RoslynExecutor.Timeout.TotalSeconds,
      };
    });
  }
}
