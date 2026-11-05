using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.Runtime;
using App = Autodesk.AutoCAD.ApplicationServices.Application;

[assembly: ExtensionApplication(typeof(Civil3DMcpPlugin.PluginEntry))]
[assembly: CommandClass(typeof(Civil3DMcpPlugin.PluginEntry))]

namespace Civil3DMcpPlugin;

/// <summary>
/// Entry point for the Civil 3D MCP plugin.
/// Loads when Civil 3D starts, from the per-user autoload bundle CEM_Civil3DMCP.bundle (docs/decisions/0004), and
/// starts a TCP socket server that listens for JSON-RPC commands from the MCP server.
/// </summary>
public sealed class PluginEntry : IExtensionApplication
{
  public void Initialize()
  {
    // Initialize runs on the AutoCAD main thread: remember it so TCP requests
    // (which arrive on thread-pool threads) can be marshalled back to it.
    CivilExecution.CaptureMainThread();
    try
    {
      PluginRuntime.StartServer();
      WriteMessage($"Civil3D MCP plugin initialized (port {PluginRuntime.Port}).");
    }
    catch (System.Exception ex)
    {
      WriteMessage($"Civil3D MCP plugin failed to initialize: {ex.Message}");
    }
  }

  public void Terminate()
  {
    PluginRuntime.StopServer();
  }

  /// <summary>Internal: executes queued civil3d_execute writes as one undoable command.</summary>
  [CommandMethod("MCPEXEC", CommandFlags.Modal | CommandFlags.NoHistory | CommandFlags.NoMultiple)]
  public void McpExecCommand() => CivilExecution.RunPendingWrites();

  /// <summary>Manually start the MCP TCP listener.</summary>
  [CommandMethod("C3DMCPSTART")]
  public void StartCommand()
  {
    CivilExecution.CaptureMainThread();
    PluginRuntime.StartServer();
    WriteMessage($"Civil3D MCP listener started on port {PluginRuntime.Port}.");
  }

  /// <summary>Manually stop the MCP TCP listener.</summary>
  [CommandMethod("C3DMCPSTOP")]
  public void StopCommand()
  {
    PluginRuntime.StopServer();
    WriteMessage("Civil3D MCP listener stopped.");
  }

  /// <summary>Check the status of the MCP TCP listener.</summary>
  [CommandMethod("C3DMCPSTATUS")]
  public void StatusCommand()
  {
    var status = PluginRuntime.GetStatus();
    WriteMessage(
      $"Civil3D MCP listener running: {status.IsRunning}; " +
      $"pending: {status.QueueDepth}; " +
      $"active: {status.OperationInProgress}; " +
      $"current: {status.CurrentOperation ?? "<none>"}"
    );
  }

  private static void WriteMessage(string message)
  {
    var doc = App.DocumentManager.MdiActiveDocument;
    doc?.Editor.WriteMessage($"\n{message}");
  }
}
