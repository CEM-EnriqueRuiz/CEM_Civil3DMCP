using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;
using Autodesk.AutoCAD.ApplicationServices;
using CEM_CSharpExtended.Hosting;
using App = Autodesk.AutoCAD.ApplicationServices.Application;

namespace Civil3DMcpPlugin;

/// <summary>
/// Captures what Civil 3D is showing so the AI can check its own work.
/// Modes:
///   view    - Document.CapturePreviewImage: renders the active viewport off-screen
///             (works even when other windows cover Civil 3D).
///   drawing - the active drawing window as displayed (PrintWindow).
///   window  - the whole Civil 3D main window incl. ribbon/palettes (PrintWindow).
/// </summary>
public static class ViewCapture
{
  [DllImport("user32.dll")] private static extern bool GetWindowRect(IntPtr hWnd, out RECT rect);
  [DllImport("user32.dll")] private static extern bool PrintWindow(IntPtr hWnd, IntPtr hdc, uint flags);
  [StructLayout(LayoutKind.Sequential)] private struct RECT { public int Left, Top, Right, Bottom; }
  private const uint PW_RENDERFULLCONTENT = 0x2;

  public static Task<object?> CaptureAsync(string mode, int width, int height, bool zoomExtents, int maxSize)
  {
    return CivilExecution.RunOnMainThreadAsync<object?>(async () =>
    {
      var doc = App.DocumentManager.MdiActiveDocument
        ?? throw new JsonRpcDispatchException("CIVIL3D.NO_DRAWING", "No active drawing is open in Civil 3D.");

      if (zoomExtents)
      {
        using (doc.LockDocument())
        {
          dynamic acad = App.AcadApplication;
          acad.ZoomExtents();
        }
        await Task.Delay(400); // let the graphics system repaint before capturing
      }

      Bitmap bmp;
      string usedMode = mode;
      switch (mode)
      {
        case "window":
          bmp = CaptureHwnd(App.MainWindow.Handle);
          break;
        case "drawing":
          bmp = CaptureHwnd(doc.Window.Handle);
          break;
        default:
          usedMode = "view";
          bmp = doc.CapturePreviewImage((uint)width, (uint)height);
          break;
      }

      using (bmp)
      using (var scaled = Downscale(bmp, maxSize))
      {
        // %TEMP%\Cemengal\Civil3DMCP\Screenshots\capture_<stamp>.png, pruned once per process (root decision 0031,
        // docs/decisions/0003): never under ACC, never next to the DLL, never left to accumulate.
        var file = CemTempFolder.NewArtifactFile(PluginRuntime.TempApp, "Screenshots", "capture", ".png");
        scaled.Save(file, ImageFormat.Png);
        var bytes = File.ReadAllBytes(file);
        return new
        {
          mode = usedMode,
          drawing = doc.Name,
          width = scaled.Width,
          height = scaled.Height,
          mimeType = "image/png",
          savedTo = file,
          base64 = Convert.ToBase64String(bytes),
        };
      }
    });
  }

  private static Bitmap CaptureHwnd(IntPtr hwnd)
  {
    if (!GetWindowRect(hwnd, out var r) || r.Right - r.Left < 10 || r.Bottom - r.Top < 10)
      throw new JsonRpcDispatchException("CIVIL3D.CAPTURE_FAILED", "Civil 3D window is minimized or not visible.");
    var bmp = new Bitmap(r.Right - r.Left, r.Bottom - r.Top, PixelFormat.Format32bppArgb);
    using (var g = Graphics.FromImage(bmp))
    {
      var hdc = g.GetHdc();
      bool ok;
      try { ok = PrintWindow(hwnd, hdc, PW_RENDERFULLCONTENT); }
      finally { g.ReleaseHdc(hdc); }
      if (!ok) g.CopyFromScreen(r.Left, r.Top, 0, 0, bmp.Size); // fallback: what is on screen
    }
    return bmp;
  }

  private static Bitmap Downscale(Bitmap src, int maxSize)
  {
    var scale = Math.Min(1.0, (double)maxSize / Math.Max(src.Width, src.Height));
    var w = Math.Max(1, (int)(src.Width * scale));
    var h = Math.Max(1, (int)(src.Height * scale));
    var dst = new Bitmap(w, h, PixelFormat.Format24bppRgb);
    using var g = Graphics.FromImage(dst);
    g.InterpolationMode = InterpolationMode.HighQualityBicubic;
    g.DrawImage(src, 0, 0, w, h);
    return dst;
  }
}
