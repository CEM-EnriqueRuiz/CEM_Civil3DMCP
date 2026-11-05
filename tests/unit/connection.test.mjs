// withApplicationConnection (src/utils/ConnectionManager.ts) against a fake plugin on a loopback port: the connect
// timeout belongs to the connect only. Before 2026-11-05 its timer was never cleared, so every successful tool call
// logged a false "Connection timed out" warning CIVIL3D_CONNECT_TIMEOUT ms later.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import net from "node:net";

// A fake plugin: one JSON-RPC request per connection, answered with { pong: true }.
const plugin = net.createServer((socket) => {
  let buffer = "";
  socket.on("data", (data) => {
    buffer += data;
    try {
      const request = JSON.parse(buffer);
      socket.end(JSON.stringify({ jsonrpc: "2.0", id: request.id, result: { pong: true } }));
    } catch { /* incomplete JSON: wait for more */ }
  });
});
await new Promise((resolve) => plugin.listen(0, "127.0.0.1", resolve));
after(() => plugin.close());

// ConnectionManager reads these when it is imported.
process.env.CIVIL3D_HOST = "127.0.0.1";
process.env.CIVIL3D_PORT = String(plugin.address().port);
process.env.CIVIL3D_CONNECT_TIMEOUT = "150";
// SocketClient keeps each command's timer until it fires; a short one lets this process exit quickly.
process.env.CIVIL3D_COMMAND_TIMEOUT = "1000";
const { withApplicationConnection } = await import("../../build/utils/ConnectionManager.js");

const logged = [];
const consoleError = console.error;
console.error = (...args) => logged.push(args.join(" "));
after(() => { console.error = consoleError; });

test("a successful call returns the plugin's result and logs no connect timeout afterwards", async () => {
  const result = await withApplicationConnection((client) => client.sendCommand("ping"));
  assert.deepEqual(result, { pong: true });

  await new Promise((resolve) => setTimeout(resolve, 400)); // well past CIVIL3D_CONNECT_TIMEOUT
  assert.deepEqual(logged.filter((line) => line.includes("timed out")), []);
});
