using System.Collections.Concurrent;
using System.Reflection;
using Microsoft.CodeAnalysis.CSharp.Scripting;
using Microsoft.CodeAnalysis.Scripting;

namespace Civil3DMcpPlugin;

/// <summary>
/// Compiles and executes C# code snippets using Roslyn.
/// Provides full access to AutoCAD + Civil 3D APIs through ScriptContext globals.
/// Includes script caching for performance.
/// </summary>
public static class RoslynExecutor
{
  /// <summary>Cache of compiled scripts by code hash.</summary>
  private static readonly ConcurrentDictionary<int, Script<object>> _scriptCache = new();

  /// <summary>Max script execution time; CIVIL3D_SCRIPT_TIMEOUT (seconds), default 300.</summary>
  public static TimeSpan Timeout { get; set; } = TimeSpan.FromSeconds(
    int.TryParse(Environment.GetEnvironmentVariable("CIVIL3D_SCRIPT_TIMEOUT"), out var t) && t > 0 ? t : 300);

  /// <summary>
  /// Map 3D (Civil 3D includes it) assemblies. Not imported globally — their type names
  /// (e.g. ObjectData.Table) clash with AutoCAD's — but referenced so scripts can opt in
  /// with e.g. <c>using Autodesk.Gis.Map; using Autodesk.Gis.Map.ObjectData;</c>.
  /// </summary>
  private static readonly string[] OptionalAssemblies =
  {
    "ManagedMapApi", "Autodesk.Map.Platform", "Autodesk.Map.Platform.Core",
    "OSGeo.MapGuide.Foundation", "OSGeo.MapGuide.Geometry", "OSGeo.MapGuide.PlatformBase",
  };
  private static bool _optionalTried;
  public static bool MapApiLoaded =>
    AppDomain.CurrentDomain.GetAssemblies().Any(a => a.GetName().Name == "ManagedMapApi");

  private static void EnsureOptionalReferences()
  {
    if (_optionalTried) return;
    _optionalTried = true;
    try
    {
      var loaded = AppDomain.CurrentDomain.GetAssemblies().Select(a => a.GetName().Name).ToHashSet(StringComparer.OrdinalIgnoreCase);
      var acadDir = Path.GetDirectoryName(Environment.ProcessPath ?? "") ?? "";
      foreach (var name in OptionalAssemblies.Where(n => !loaded.Contains(n)))
      {
        var file = Directory.EnumerateFiles(acadDir, name + ".dll", SearchOption.TopDirectoryOnly).FirstOrDefault()
          ?? Directory.EnumerateDirectories(acadDir)
               .Select(d => Path.Combine(d, name + ".dll")).FirstOrDefault(File.Exists);
        if (file != null)
        {
          try { Assembly.LoadFrom(file); } catch { /* optional */ }
        }
      }
    }
    catch { /* optional */ }
  }

  /// <summary>
  /// Build ScriptOptions with all necessary references and imports.
  /// </summary>
  private static ScriptOptions BuildOptions()
  {
    EnsureOptionalReferences();

    // Collect assemblies from the current AppDomain (Civil 3D loads everything)
    // Skip subassembly runtime assemblies: they declare a namespace called "Subassembly"
    // which would make the Civil class Autodesk.Civil.DatabaseServices.Subassembly ambiguous.
    var loadedAssemblies = AppDomain.CurrentDomain.GetAssemblies()
      .Where(a => !a.IsDynamic && !string.IsNullOrEmpty(a.Location))
      .Where(a => { var n = a.GetName().Name ?? ""; return n != "C3DStockSubassemblies" && !n.StartsWith("Subassembly."); })
      .ToArray();

    var options = ScriptOptions.Default
      .WithReferences(loadedAssemblies)
      .WithImports(
        // System
        "System",
        "System.Linq",
        "System.Collections.Generic",
        "System.Text",
        // AutoCAD
        "Autodesk.AutoCAD.ApplicationServices",
        "Autodesk.AutoCAD.DatabaseServices",
        "Autodesk.AutoCAD.EditorInput",
        "Autodesk.AutoCAD.Geometry",
        "Autodesk.AutoCAD.Runtime",
        // Civil 3D
        "Autodesk.Civil",
        "Autodesk.Civil.ApplicationServices",
        "Autodesk.Civil.DatabaseServices",
        "Autodesk.Civil.Settings"
      )
      .WithAllowUnsafe(false);

    return options;
  }

  /// <summary>
  /// Execute a C# code snippet with the given ScriptContext as globals.
  /// </summary>
  /// <param name="code">C# code to execute</param>
  /// <param name="context">Globals (Document, CivilDoc, Database, Transaction, Editor)</param>
  /// <returns>The script's return value, or null</returns>
  public static async Task<object?> ExecuteAsync(string code, ScriptContext context)
  {
    // Validate with sandbox
    ScriptSandbox.Validate(code);

    var options = BuildOptions();
    var codeHash = code.GetHashCode();

    // Try cache first
    if (!_scriptCache.TryGetValue(codeHash, out var script))
    {
      script = CSharpScript.Create<object>(code, options, typeof(ScriptContext));
      script.Compile(); // Pre-compile for better error messages
      _scriptCache.TryAdd(codeHash, script);
    }

    // Execute with timeout
    using var cts = new CancellationTokenSource(Timeout);

    try
    {
      var result = await script.RunAsync(context, cts.Token);
      return result.ReturnValue;
    }
    catch (OperationCanceledException)
    {
      throw new JsonRpcDispatchException(
        "CIVIL3D.TIMEOUT",
        $"Script execution timed out after {Timeout.TotalSeconds}s."
      );
    }
    catch (CompilationErrorException ex)
    {
      var errors = string.Join("\n", ex.Diagnostics.Select(d => d.ToString()));
      throw new JsonRpcDispatchException(
        "CIVIL3D.COMPILATION_ERROR",
        $"C# compilation failed:\n{errors}"
      );
    }
  }

  /// <summary>Clear the script cache.</summary>
  public static void ClearCache()
  {
    _scriptCache.Clear();
  }
}
