/**
 * Where the Civil 3D plugin listens. 8766 by default; 8080 is the Revit MCP's port, and with
 * Civil 3D open on 8080 a Revit MCP call reached Civil 3D (docs/decisions/0002-own-port-8766.md).
 * The plugin (PortSetting.Default) and setup_claude.ps1 use the same default; tests pin all three.
 */
export const DEFAULT_PORT = 8766;

/** The port named by CIVIL3D_PORT, or DEFAULT_PORT when it is unset or not a TCP port (1-65535). */
export function resolvePort(value: string | undefined): number {
  const text = (value ?? "").trim();
  if (!/^\d+$/.test(text)) return DEFAULT_PORT;
  const port = Number(text);
  return port >= 1 && port <= 65535 ? port : DEFAULT_PORT;
}
