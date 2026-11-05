// Dev test runner: watches the job queue (*.json, below) and executes each job against the
// Civil 3D plugin (raw TCP) or through the MCP server (stdio), writing results to
// %TEMP%\Cemengal\Civil3DMCP\TestResults\<job>.json. Lets changes be tested without touching the GUI.
// The queue is %TEMP%\Cemengal\Civil3DMCP\Queue (tools/cem-temp.cjs: never next to this script; docs/decisions/0003).
//   job: { "type": "rpc", "method": "executeCode", "params": {...} }
//        { "type": "mcp", "tool": "civil3d_screenshot", "args": {...} }
//        { "type": "stop" }
const net = require("net"), fs = require("fs"), path = require("path");
const root = path.resolve(__dirname, "..");
const temp = require("../tools/cem-temp.cjs").createCemTemp();
const qdir = temp.dir("Queue"), rdir = temp.dir("TestResults");
const port = parseInt(process.env.CIVIL3D_PORT || "8766", 10);

function rpc(method, params, timeoutMs = 330000) {
  return new Promise((resolve) => {
    const s = net.connect(port, "127.0.0.1"); let buf = "";
    const t = setTimeout(() => { s.destroy(); resolve({ error: { message: "runner timeout" } }); }, timeoutMs);
    s.on("connect", () => s.write(JSON.stringify({ jsonrpc: "2.0", id: "t", method, params })));
    s.on("data", (d) => { buf += d; try { const r = JSON.parse(buf); clearTimeout(t); s.end(); resolve(r); } catch {} });
    s.on("error", (e) => { clearTimeout(t); resolve({ error: { message: String(e) } }); });
  });
}

let mcpClient = null;
async function getMcp() {
  if (mcpClient) return mcpClient;
  const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
  const { StdioClientTransport } = await import("@modelcontextprotocol/sdk/client/stdio.js");
  const transport = new StdioClientTransport({
    command: process.execPath, args: [path.join(root, "build", "index.js")],
    env: { ...process.env, CIVIL3D_PORT: String(port) }, stderr: "pipe",
  });
  const c = new Client({ name: "civil3d-test-runner", version: "1.0.0" });
  await c.connect(transport);
  mcpClient = c; return c;
}

async function runJob(name, job) {
  const t0 = Date.now(); let out;
  try {
    if (job.type === "rpc") out = await rpc(job.method, job.params || {});
    else if (job.type === "mcp") {
      const c = await getMcp();
      if (job.tool === "__list") out = await c.listTools();
      else {
        out = await c.callTool({ name: job.tool, arguments: job.args || {} }, undefined, { timeout: 330000 });
        (out.content || []).forEach((p, i) => {
          if (p.type === "image") {
            const f = temp.write("TestResults", `${name}_${i}.png`, Buffer.from(p.data, "base64"));
            p.data = `<${p.data.length} base64 chars saved to ${f}>`;
          }
        });
      }
    } else if (job.type === "reload_mcp") { if (mcpClient) await mcpClient.close().catch(() => {}); mcpClient = null; out = { ok: true }; }
    else if (job.type === "stop") { out = { stopped: true }; }
    else out = { error: "unknown job type" };
  } catch (e) { out = { error: { message: String(e && e.stack || e) } }; }
  temp.write("TestResults", name + ".json", JSON.stringify({ ms: Date.now() - t0, ...out }, null, 2));
  if (job.type === "stop") process.exit(0);
}

let busy = false;
setInterval(async () => {
  temp.write("TestResults", "_alive.json", JSON.stringify({ at: new Date().toISOString(), port }));
  if (busy) return; busy = true;
  try {
    const files = fs.readdirSync(qdir).filter((f) => f.endsWith(".json")).sort();
    for (const f of files) {
      const p = path.join(qdir, f); let job;
      try { job = JSON.parse(fs.readFileSync(p, "utf8")); } catch { continue; } // partially written
      fs.unlinkSync(p);
      console.log(new Date().toISOString(), "job", f);
      await runJob(f.replace(/\.json$/, ""), job);
    }
  } finally { busy = false; }
}, 700);
console.log("Civil 3D MCP test runner watching", qdir, "port", port);
