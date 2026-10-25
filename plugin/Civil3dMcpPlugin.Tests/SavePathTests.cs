using Civil3DMcpPlugin;
using Xunit;

namespace Civil3dMcpPlugin.Tests;

/// <summary>
/// civil3d_save's Save As path: the drawing is saved only where the user asked (docs/decisions/0005). A relative path
/// would resolve against acad.exe's working folder, a place nobody chose, so only an absolute .dwg path in an existing
/// folder is accepted.
/// </summary>
public sealed class SavePathTests : IDisposable
{
  private readonly string _folder = Directory.CreateTempSubdirectory("c3d-savepath-").FullName;

  public void Dispose() => Directory.Delete(_folder, recursive: true);

  [Fact]
  public void An_absolute_dwg_path_in_an_existing_folder_is_accepted()
  {
    var path = Path.Combine(_folder, "copy.dwg");
    Assert.Equal(path, SavePath.Validate(path));
  }

  [Fact]
  public void The_accepted_path_is_normalised()
  {
    var path = Path.Combine(_folder, "sub", "..", "copy.DWG");
    Assert.Equal(Path.Combine(_folder, "copy.DWG"), SavePath.Validate(path));
  }

  [Fact]
  public void A_relative_path_is_refused_even_when_its_folder_exists_under_the_working_folder()
  {
    var previous = Environment.CurrentDirectory;
    Directory.CreateDirectory(Path.Combine(_folder, "sub"));
    Environment.CurrentDirectory = _folder;
    try
    {
      Refused(Path.Combine("sub", "copy.dwg"), "absolute");
      Refused("copy.dwg", "absolute");
    }
    finally
    {
      Environment.CurrentDirectory = previous;
    }
  }

  [Fact]
  public void A_drive_relative_path_is_refused()
    => Refused(Path.GetPathRoot(_folder)!.TrimEnd('\\', '/') + "copy.dwg", "absolute");

  [Fact]
  public void A_path_that_is_not_a_dwg_is_refused()
    => Refused(Path.Combine(_folder, "copy.dxf"), ".dwg");

  [Fact]
  public void A_missing_folder_is_refused()
    => Refused(Path.Combine(_folder, "missing", "copy.dwg"), "does not exist");

  [Fact]
  public void An_empty_path_is_refused()
    => Refused("  ", ".dwg");

  private static void Refused(string path, string because)
  {
    var ex = Assert.Throws<JsonRpcDispatchException>(() => SavePath.Validate(path));
    Assert.Equal("CIVIL3D.INVALID_INPUT", ex.Code);
    Assert.Contains(because, ex.Message);
  }
}
