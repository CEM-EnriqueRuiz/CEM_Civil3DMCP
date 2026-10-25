namespace Civil3DMcpPlugin;

/// <summary>
/// Checks the Save As path civil3d_save was given: the drawing is saved only where the user asked
/// (docs/decisions/0005-save-only-where-the-user-asked.md). A relative or drive-relative path would resolve against
/// acad.exe's working folder, a place nobody chose, so only an absolute .dwg path in an existing folder is accepted.
/// </summary>
public static class SavePath
{
  /// <summary>The normalised full path, or a CIVIL3D.INVALID_INPUT error saying why it is refused.</summary>
  public static string Validate(string path)
  {
    path = path?.Trim() ?? "";
    if (!path.EndsWith(".dwg", StringComparison.OrdinalIgnoreCase))
      throw new JsonRpcDispatchException("CIVIL3D.INVALID_INPUT", "Path must end with .dwg");
    if (!Path.IsPathFullyQualified(path))
      throw new JsonRpcDispatchException("CIVIL3D.INVALID_INPUT",
        $"Path must be absolute (a drive or UNC path, e.g. C:\\Projects\\copy.dwg): {path}");
    var full = Path.GetFullPath(path);
    var dir = Path.GetDirectoryName(full);
    if (string.IsNullOrEmpty(dir) || !Directory.Exists(dir))
      throw new JsonRpcDispatchException("CIVIL3D.INVALID_INPUT", $"Folder does not exist: {dir}");
    return full;
  }
}
