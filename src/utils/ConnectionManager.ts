import { ApplicationClientConnection } from "./SocketClient.js";
import { createLogger } from "./logger.js";
import { resolvePort } from "./config.js";

const log = createLogger("ConnectionManager");

const CIVIL3D_HOST = process.env.CIVIL3D_HOST ?? "localhost";
const CIVIL3D_PORT = resolvePort(process.env.CIVIL3D_PORT);
if (process.env.CIVIL3D_PORT && String(CIVIL3D_PORT) !== process.env.CIVIL3D_PORT.trim()) {
  log.warn("CIVIL3D_PORT is not a TCP port; using the default", { value: process.env.CIVIL3D_PORT, port: CIVIL3D_PORT });
}
const CONNECT_TIMEOUT_MS = parseInt(process.env.CIVIL3D_CONNECT_TIMEOUT ?? "5000", 10);

/**
 * Opens a short-lived connection to the Civil 3D plugin, runs the given
 * operation, and tears the connection down afterwards.
 */
export async function withApplicationConnection<T>(
  operation: (client: ApplicationClientConnection) => Promise<T>
): Promise<T> {
  const appClient = new ApplicationClientConnection(CIVIL3D_HOST, CIVIL3D_PORT);

  try {
    if (!appClient.isConnected) {
      await new Promise<void>((resolve, reject) => {
        // The timeout covers the connect only: once it succeeds or fails, its timer must not fire.
        let timer: NodeJS.Timeout | undefined;
        const settle = () => {
          clearTimeout(timer);
          appClient.socket.removeListener("connect", onConnect);
          appClient.socket.removeListener("error", onError);
        };

        const onConnect = () => {
          settle();
          resolve();
        };

        const onError = (error: any) => {
          settle();
          log.error("Connection failed", { host: CIVIL3D_HOST, port: CIVIL3D_PORT });
          reject(
            new Error(
              `Failed to connect to Civil 3D plugin at ${CIVIL3D_HOST}:${CIVIL3D_PORT}. ` +
                `Make sure Civil 3D is running and the MCP plugin is loaded (NETLOAD).`
            )
          );
        };

        appClient.socket.on("connect", onConnect);
        appClient.socket.on("error", onError);

        appClient.connect();

        timer = setTimeout(() => {
          settle();
          log.warn("Connection timed out", {
            host: CIVIL3D_HOST,
            port: CIVIL3D_PORT,
            timeoutMs: CONNECT_TIMEOUT_MS,
          });
          reject(
            new Error(
              `Connection to Civil 3D plugin timed out after ${CONNECT_TIMEOUT_MS}ms. ` +
                `Verify the plugin is running on ${CIVIL3D_HOST}:${CIVIL3D_PORT}.`
            )
          );
        }, CONNECT_TIMEOUT_MS);
      });
    }

    return await operation(appClient);
  } finally {
    appClient.disconnect();
  }
}
