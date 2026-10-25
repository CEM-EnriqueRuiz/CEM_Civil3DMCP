namespace Civil3DMcpPlugin;

/// <summary>
/// The TCP port the plugin listens on: 8766 unless CIVIL3D_PORT names another. 8080 is the Revit MCP's port, and
/// with Civil 3D open on 8080 a Revit MCP call reached Civil 3D (docs/decisions/0002-own-port-8766.md). The server
/// (src/utils/config.ts) and setup_claude.ps1 use the same default; tests/unit/port-contract.test.mjs pins all three.
/// </summary>
public static class PortSetting
{
  public const int Default = 8766;

  /// <summary>The port in <paramref name="value"/>, or <see cref="Default"/> when it is unset or not 1-65535.</summary>
  public static int Resolve(string? value)
    => int.TryParse(value, out var p) && p is >= 1 and <= 65535 ? p : Default;
}
