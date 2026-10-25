using Autodesk.AutoCAD.ApplicationServices;
using Autodesk.AutoCAD.DatabaseServices;
using Autodesk.Civil.ApplicationServices;
using App = Autodesk.AutoCAD.ApplicationServices.Application;

namespace Civil3DMcpPlugin;

/// <summary>
/// Helper for executing Civil 3D API operations safely on the main thread.
/// The Civil 3D API is single-threaded — all operations must be marshaled to
/// the main AutoCAD thread via ExecuteInCommandContextAsync.
/// </summary>
public static class CivilExecution
{
  private static SynchronizationContext? _mainThread;

  /// <summary>Call on the AutoCAD main thread (plugin Initialize / commands).</summary>
  public static void CaptureMainThread()
  {
    if (_mainThread != null) return;
    _mainThread = SynchronizationContext.Current
      ?? new System.Windows.Forms.WindowsFormsSynchronizationContext();
  }

  /// <summary>
  /// WinForms Post() queues the callback and sends ONE window message to its marshaling
  /// window; that message drains the whole queue. Civil 3D's Event Viewer / Welcome panel
  /// sometimes swallow it, leaving the work queued until the next Post (seen: a query
  /// waited 108-165 s and finished the instant another request arrived). Re-posting a
  /// no-op every 2 s while work is pending sends a fresh message and drains the queue.
  /// </summary>
  private static async Task NudgeWhilePending(Task pending)
  {
    while (!pending.IsCompleted)
    {
      if (await Task.WhenAny(pending, Task.Delay(2000)) == pending) return;
      try { _mainThread?.Post(static _ => { }, null); } catch { }
    }
  }

  /// <summary>Run <paramref name="work"/> on the AutoCAD main thread and await its completion.</summary>
  private static Task RunOnMainThread(Func<Task> work)
  {
    var ctx = _mainThread ?? throw new InvalidOperationException(
      "Civil3D MCP plugin was not initialised on the AutoCAD main thread.");
    var tcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
    ctx.Post(async _ =>
    {
      try { await work(); tcs.SetResult(); }
      catch (Exception ex) { tcs.SetException(ex); }
    }, null);
    _ = NudgeWhilePending(tcs.Task);
    return tcs.Task;
  }

  /// <summary>
  /// Run work on the AutoCAD main thread in the application context (no command,
  /// no transaction) — for COM calls, saving, window capture.
  /// </summary>
  public static async Task<T> RunOnMainThreadAsync<T>(Func<Task<T>> work)
  {
    T result = default!;
    await RunOnMainThread(async () => { result = await work(); });
    return result;
  }

  /// <summary>
  /// Execute an operation within a proper document lock and transaction.
  /// If <paramref name="write"/> is true, the transaction is committed.
  /// </summary>
  public static async Task<T> ExecuteAsync<T>(
    Func<Document, CivilDocument, Database, Transaction, T> action,
    bool write)
  {
    T? result = default;

    if (!write)
    {
      // Read-only: application context, transaction never committed and NO document
      // lock. Reading needs no lock, and a lock taken in the application context is filed
      // as an (empty) undo step - the user's U would then undo that instead of the last
      // civil3d_execute (verified by hand in Civil 3D 2027).
      await RunOnMainThread(() =>
      {
        var doc = App.DocumentManager.MdiActiveDocument
          ?? throw new JsonRpcDispatchException("CIVIL3D.NO_DRAWING", "No active drawing is open in Civil 3D.");
        var civilDoc = CivilApplication.ActiveDocument
          ?? throw new JsonRpcDispatchException("CIVIL3D.NO_DRAWING", "No active Civil 3D document is available.");
        using var transaction = doc.Database.TransactionManager.StartTransaction();
        result = action(doc, civilDoc, doc.Database, transaction);
        transaction.Abort();
        return Task.CompletedTask;
      });
      return result!;
    }

    // Write: run inside the registered MCPEXEC command. A real command is what AutoCAD
    // files as one undo step, so the user's U (or "UNDO 1") removes exactly one
    // civil3d_execute. (UNDO _BEGIN/_END inside ExecuteInCommandContextAsync did NOT
    // capture the changes in Civil 3D 2027 - verified by hand.)
    var item = new PendingWrite(() =>
    {
      var doc = App.DocumentManager.MdiActiveDocument
        ?? throw new JsonRpcDispatchException("CIVIL3D.NO_DRAWING", "No active drawing is open in Civil 3D.");
      var civilDoc = CivilApplication.ActiveDocument
        ?? throw new JsonRpcDispatchException("CIVIL3D.NO_DRAWING", "No active Civil 3D document is available.");
      using var documentLock = doc.LockDocument();
      using var transaction = doc.Database.TransactionManager.StartTransaction();
      result = action(doc, civilDoc, doc.Database, transaction);
      transaction.Commit();
    });
    lock (Pending) Pending.Enqueue(item);

    var deadline = Task.Delay(StartTimeout); // covers the hop to the main thread too
    var post = RunOnMainThread(() =>
    {
      var doc = App.DocumentManager.MdiActiveDocument;
      if (doc == null)
      {
        item.Abandon();
        throw new JsonRpcDispatchException("CIVIL3D.NO_DRAWING", "No active drawing is open in Civil 3D.");
      }
      doc.SendStringToExecute("_MCPEXEC ", true, false, false);
      return Task.CompletedTask;
    });

    // The command only starts when Civil 3D is idle (no running command, no modal dialog).
    _ = NudgeWhilePending(Task.WhenAny(item.Started.Task, deadline));
    while (true)
    {
      var first = await Task.WhenAny(item.Started.Task, deadline, post);
      if (first == post && !post.IsFaulted) { post = Task.Delay(Timeout.Infinite, CancellationToken.None); continue; }
      if (first == post) { item.Abandon(); await post; } // rethrows NO_DRAWING
      break;
    }
    var started = item.Started.Task.IsCompleted ? item.Started.Task : deadline;
    if (started != item.Started.Task && item.Abandon())
      throw new JsonRpcDispatchException("CIVIL3D.BUSY",
        $"Civil 3D did not start the MCP command within {StartTimeout.TotalSeconds:0}s - a command or dialog is probably active (or the Welcome panel has focus). Press Esc in Civil 3D and retry.");

    await item.Done.Task; // rethrows script exceptions
    return result!;
  }

  private static readonly TimeSpan StartTimeout = TimeSpan.FromSeconds(30);
  private static readonly Queue<PendingWrite> Pending = new();

  private sealed class PendingWrite(Action work)
  {
    private int _state; // 0 queued, 1 running, 2 abandoned
    public readonly TaskCompletionSource Started = new(TaskCreationOptions.RunContinuationsAsynchronously);
    public readonly TaskCompletionSource Done = new(TaskCreationOptions.RunContinuationsAsynchronously);
    public bool Abandon() => Interlocked.CompareExchange(ref _state, 2, 0) == 0;
    public void Run()
    {
      if (Interlocked.CompareExchange(ref _state, 1, 0) != 0) return; // timed out earlier
      Started.TrySetResult();
      try { work(); Done.TrySetResult(); }
      catch (Exception ex) { Done.TrySetException(ex); }
    }
  }

  /// <summary>Body of the MCPEXEC command: runs every queued write (normally one).</summary>
  public static void RunPendingWrites()
  {
    while (true)
    {
      PendingWrite? next;
      lock (Pending) { if (!Pending.TryDequeue(out next)) return; }
      next.Run();
    }
  }

  /// <summary>Execute a read-only operation (no commit).</summary>
  public static Task<T> ReadAsync<T>(
    Func<Document, CivilDocument, Database, Transaction, T> action)
    => ExecuteAsync(action, false);

  /// <summary>Execute a write operation (commits the transaction).</summary>
  public static Task<T> WriteAsync<T>(
    Func<Document, CivilDocument, Database, Transaction, T> action)
    => ExecuteAsync(action, true);
}
