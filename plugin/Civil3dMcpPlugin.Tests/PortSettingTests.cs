using Civil3DMcpPlugin;
using Xunit;

namespace Civil3dMcpPlugin.Tests;

/// <summary>
/// The plugin's port: 8766 by default, CIVIL3D_PORT overrides it (docs/decisions/0002-own-port-8766.md). On 8080, the
/// Revit MCP's port, a Revit MCP call reached Civil 3D. The server and setup_claude.ps1 agree (tests/unit/port-contract).
/// </summary>
public class PortSettingTests
{
  [Fact]
  public void The_default_is_8766_not_the_Revit_MCP_8080()
  {
    Assert.Equal(8766, PortSetting.Default);
    Assert.Equal(8766, PortSetting.Resolve(null));
    Assert.Equal(8766, PortSetting.Resolve(""));
  }

  [Theory]
  [InlineData("18766", 18766)]
  [InlineData(" 9001 ", 9001)]
  public void CIVIL3D_PORT_overrides_the_default(string value, int expected)
    => Assert.Equal(expected, PortSetting.Resolve(value));

  [Theory]
  [InlineData("abc")]
  [InlineData("0")]
  [InlineData("-1")]
  [InlineData("65536")]
  [InlineData("80.5")]
  [InlineData("8766x")]
  public void A_value_that_is_not_a_TCP_port_falls_back_to_the_default(string value)
    => Assert.Equal(8766, PortSetting.Resolve(value));
}
