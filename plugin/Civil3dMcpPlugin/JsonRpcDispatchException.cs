namespace Civil3DMcpPlugin;

/// <summary>
/// Exception type for JSON-RPC dispatch errors, carrying an error code.
/// </summary>
public sealed class JsonRpcDispatchException : Exception
{
  public JsonRpcDispatchException(string code, string message) : base(message)
  {
    Code = code;
  }

  public string Code { get; }
}
