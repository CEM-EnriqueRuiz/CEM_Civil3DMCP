using Civil3DMcpPlugin;
using Xunit;

namespace Civil3dMcpPlugin.Tests;

/// <summary>
/// What ScriptSandbox's text filter refuses today (characterisation, written after the code). It is a filter on the
/// script's text, not a sandbox (docs/modules/plugin.md).
/// </summary>
public class ScriptSandboxTests
{
  [Theory]
  [InlineData("System.Diagnostics.Process.Start(\"cmd\");")]
  [InlineData("System.IO.File.Delete(@\"C:\\x.txt\");")]
  [InlineData("System.IO.Directory.Delete(@\"C:\\x\", true);")]
  [InlineData("using System.Net.Http; return 1;")]
  [InlineData("Microsoft.Win32.Registry.CurrentUser.OpenSubKey(\"x\");")]
  [InlineData("Environment.Exit(0);")]
  public void A_dangerous_call_is_refused(string code)
  {
    var ex = Assert.Throws<JsonRpcDispatchException>(() => ScriptSandbox.Validate(code));
    Assert.Equal("CIVIL3D.SANDBOX_VIOLATION", ex.Code);
  }

  [Fact]
  public void An_empty_script_is_refused()
    => Assert.Equal("CIVIL3D.INVALID_INPUT", Assert.Throws<JsonRpcDispatchException>(() => ScriptSandbox.Validate(" ")).Code);

  [Fact]
  public void A_Civil_3D_query_passes()
    => ScriptSandbox.Validate("return CivilDoc.GetSurfaceIds().Count;");
}
