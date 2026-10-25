// Talks to the Civil 3D plugin directly over TCP (same protocol as the MCP server). The log goes to
// %TEMP%\Cemengal\Civil3DMCP\test_plugin-yyyyMMdd.log (tools/cem-temp.cjs; docs/decisions/0003), never next to this file.
const net = require("net");
const temp = require("./tools/cem-temp.cjs").createCemTemp();
const port = parseInt(process.env.CIVIL3D_PORT || "8766", 10);
const out = (s) => { console.log(s); temp.appendLog("test_plugin", `${new Date().toISOString()} ${s}`); };
function call(method, params) {
  return new Promise((resolve) => {
    const s = net.connect(port, "127.0.0.1"); let buf = "";
    const t = setTimeout(() => { s.destroy(); resolve({ error: "timeout" }); }, 60000);
    s.on("connect", () => s.write(JSON.stringify({ jsonrpc: "2.0", id: "1", method, params })));
    s.on("data", (d) => { buf += d; try { const r = JSON.parse(buf); clearTimeout(t); s.end(); resolve(r); } catch {} });
    s.on("error", (e) => { clearTimeout(t); resolve({ error: String(e) }); });
  });
}
(async () => {
  out("port " + port);
  out("health: " + JSON.stringify(await call("getCivil3DHealth", {})));
  out("query: " + JSON.stringify(await call("executeCode", { readOnly: true,
    code: "return new { doc = Document.Name, surfaces = CivilDoc.GetSurfaceIds().Count, alignments = CivilDoc.GetAlignmentIds().Count, points = CivilDoc.CogoPoints.Count, units = CivilDoc.Settings.DrawingSettings.UnitZoneSettings.DrawingUnits.ToString() };" })));
})();
