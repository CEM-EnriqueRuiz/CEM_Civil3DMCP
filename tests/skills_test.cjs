// End-to-end test of the Civil 3D MCP plugin + every skill template.
// Builds a small road project in a SCRATCH drawing (refuses to run on a saved/named drawing),
// runs each skill with test parameters, takes screenshots, and writes report.md to
// %TEMP%\Cemengal\Civil3DMCP\TestResults (tools/cem-temp.cjs: never next to this script, pruned; docs/decisions/0003).
//
// usage: node tests/skills_test.cjs [--mark-verified] [--only=name1,name2]
const net = require("net"), fs = require("fs"), path = require("path"), os = require("os");
const temp = require("../tools/cem-temp.cjs").createCemTemp();
const ROOT = path.resolve(__dirname, ".."), SKILLS = path.join(ROOT, "skills"), OUT = temp.dir("TestResults");
const PORT = parseInt(process.env.CIVIL3D_PORT || "8766", 10);
const args = process.argv.slice(2);
const MARK = args.includes("--mark-verified");
const ONLY = (args.find((a) => a.startsWith("--only=")) || "").slice(7).split(",").filter(Boolean);
const TMP = temp.dir("TestData"); // fixtures the skills read, the points export and the scratch drawing's save-as

// ---------- plugin RPC ----------
function rpc(method, params, timeoutMs = 330000) {
  return new Promise((resolve) => {
    const s = net.connect(PORT, "127.0.0.1"); let buf = "";
    const t = setTimeout(() => { s.destroy(); resolve({ error: { message: "test timeout" } }); }, timeoutMs);
    s.on("connect", () => s.write(JSON.stringify({ jsonrpc: "2.0", id: "t", method, params })));
    s.on("data", (d) => { buf += d; try { const r = JSON.parse(buf); clearTimeout(t); s.end(); resolve(r); } catch {} });
    s.on("error", (e) => { clearTimeout(t); resolve({ error: { message: "cannot reach plugin on port " + PORT + ": " + e.message } }); });
  });
}
const run = (code, readOnly) => rpc("executeCode", { code, readOnly, description: "skills_test" });

// ---------- skill files ----------
function loadSkills() {
  const map = {};
  (function walk(d) {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".skill.md")) {
        const raw = fs.readFileSync(p, "utf8").replace(/\r\n/g, "\n");
        const name = (raw.match(/^name:\s*(.+)$/m) || [])[1].trim();
        const blocks = [...raw.matchAll(/```csharp\n([\s\S]*?)```/g)].map((m) => m[1]);
        map[name] = { file: p, blocks };
      }
    }
  })(SKILLS);
  return map;
}
// replace "<decl> name = <anything>;" inside the parameters block
function applyParams(code, overrides) {
  const start = code.indexOf("// ---- parameters ----"), end = code.indexOf("// ---- end parameters ----");
  if (start < 0 || end < 0) { if (Object.keys(overrides).length) throw new Error("template has no parameters block"); return code; }
  let block = code.slice(start, end);
  for (const [k, v] of Object.entries(overrides)) {
    const re = new RegExp(`(^|\\n)(\\s*[\\w\\[\\]<>?,.()\\s]*?\\b${k}\\s*=\\s*)([\\s\\S]*?);(?=\\s*(//[^\\n]*)?\\n)`);
    if (!re.test(block)) throw new Error(`parameter '${k}' not found in template`);
    block = block.replace(re, (m, a, b) => `${a}${b}${v};`);
  }
  return code.slice(0, start) + block + code.slice(end);
}
const cs = (s) => JSON.stringify(s);                     // C# string literal (JSON escaping is compatible)
const arr2 = (a) => `new double[][] { ${a.map((r) => `new[] { ${r.map((x) => x.toFixed(3)).join(", ")} }`).join(", ")} }`;

// ---------- test plan ----------
const ctx = {};
const T = (skill, opts = {}) => ({ skill, block: 0, mode: "query", params: {}, ...opts });
const C = (label, code, opts = {}) => ({ label, code, mode: "execute", ...opts });
const plan = [
  C("fixture: guard scratch drawing", `return new { named = Document.IsNamedDrawing, name = Document.Name };`, { mode: "query",
    check: (r) => { if (r.named && !process.env.FORCE_NAMED) throw new Error(`ABORT: active drawing '${r.name}' is a saved drawing; open a new empty drawing (or set FORCE_NAMED=1)`); } }),
  T("drawing_info"),
  C("fixture: 336 ground points (desc TN)", `
    var n = 0;
    for (double x = 0; x <= 400; x += 20) for (double y = -100; y <= 200; y += 20)
    {
        double z = 100 + 0.02 * x + 3 * Math.Sin(y / 40.0) + 2 * Math.Cos(x / 70.0);
        var id = CivilDoc.CogoPoints.Add(new Point3d(x, y, z), true);
        ((CogoPoint)Transaction.GetObject(id, OpenMode.ForWrite)).RawDescription = "TN"; n++;
    }
    return new { n };`),
  T("create_cogo_points", { mode: "execute", params: { points: `new[] { (e: 395.0, n: 195.0, z: 108.0, d: "TOPO") }` } }),
  T("list_cogo_points"),
  T("point_groups", { mode: "execute", params: { groupName: cs("TN"), rawDescriptions: cs("TN*") } }),
  T("surface_from_points", { mode: "execute", params: { surfaceName: cs("EG"), pointGroupName: cs("TN") } }),
  T("create_tin_surface", { mode: "execute", params: { surfaceName: cs("FG"), xyz: arr2([[0, -100, 101], [400, -100, 109], [400, 200, 109], [0, 200, 101], [200, 50, 104]]) } }),
  T("list_surfaces"),
  T("surface_elevation", { params: { surfaceName: cs("EG"), x: "100.0", y: "50.0" } }),
  T("surface_sample_along", { params: { surfaceName: cs("EG"), gridStep: "100.0", gridMax: "new double[] { 400, 200 }" } }),
  T("surface_volume", { mode: "execute", params: { baseSurface: cs("EG"), comparisonSurface: cs("FG") } }),
  T("create_polyline", { mode: "execute", params: { vertices: arr2([[20, -80], [380, -80], [380, 180], [20, 180]]), closed: "true" }, save: (r) => (ctx.boundary = r.handle) }),
  T("create_polyline", { block: 1, mode: "execute", params: { vertices: arr2([[50, 0, 103], [350, 0, 108]]) }, save: (r) => (ctx.breakline = r.handle) }),
  T("surface_breaklines_boundary", { mode: "execute", params: () => ({ surfaceName: cs("FG"), breaklineHandles: `new[] { ${cs(ctx.breakline)} }`, boundaryHandle: cs(ctx.boundary) }) }),
  T("create_alignment_from_polyline", { mode: "execute", params: { alignmentName: cs("Eje 1"), vertices: arr2([[10, 10], [150, 60], [300, 30], [390, 90]]) }, save: (r) => (ctx.alignment = r.handle) }),
  T("list_alignments"),
  T("alignment_geometry", { params: { alignmentName: cs("Eje 1"), stationInterval: "50.0" } }),
  T("station_offset", { params: { alignmentName: cs("Eje 1"), station: "100.0", offset: "-5.0" } }),
  T("station_offset", { block: 1, params: { alignmentName: cs("Eje 1"), x: "150.0", y: "60.0" } }),
  T("create_offset_alignment", { mode: "execute", params: { parentAlignment: cs("Eje 1"), offset: "-3.5" } }),
  T("create_surface_profile", { mode: "execute", params: { alignmentName: cs("Eje 1"), surfaceName: cs("EG") } }),
  T("create_layout_profile", { mode: "execute", params: { alignmentName: cs("Eje 1"), pvis: arr2([[0, 101], [150, 104.5], [300, 104], [403.5, 108]]), curveLength: "60.0" } }),
  T("profile_report", { params: { alignmentName: cs("Eje 1"), stationInterval: "50.0" } }),
  T("create_profile_view", { mode: "execute", params: { alignmentName: cs("Eje 1"), insertPoint: "new Point3d(0, -300, 0)" }, save: (r) => (ctx.pv = r.handle) }),
  T("zoom_to_area", { params: () => ({ handle: cs(ctx.pv) }) }),
  { label: "screenshot view (profile view)", rpc: ["captureView", { mode: "view", width: 1400, height: 900 }], shot: "profile_view" },
  T("feature_line_from_polyline", { mode: "execute", pre: C("", `
      var pl = new Polyline(); pl.AddVertexAt(0, new Point2d(60, 120), 0, 0, 0); pl.AddVertexAt(1, new Point2d(340, 140), 0, 0, 0);
      var ms = (BlockTableRecord)Transaction.GetObject(SymbolUtilityServices.GetBlockModelSpaceId(Database), OpenMode.ForWrite);
      ms.AppendEntity(pl); Transaction.AddNewlyCreatedDBObject(pl, true); return new { handle = pl.Handle.ToString() };`),
    params: (pre) => ({ polylineHandle: cs(pre.handle), featureLineName: cs("FL Test"), surfaceName: cs("EG") }) }),
  T("list_feature_lines"),
  T("labels", { mode: "execute", params: { surfaceName: cs("EG"), alignmentName: cs("Eje 1"), spotPoints: arr2([[100, 100], [250, 0]]) } }),
  T("list_styles"),
  T("create_pipe_run", { mode: "execute", params: { networkName: cs("Saneamiento Test"), surfaceName: cs("EG"), points: arr2([[40, -60, 99], [120, -60, 98.5], [200, -50, 98]]) } }),
  T("list_pipe_networks"),
  T("create_simple_corridor", { mode: "execute", params: { alignmentName: cs("Eje 1"), profileName: cs("Eje 1 - Rasante"), targetSurface: cs("EG") } }),
  T("list_corridors"),
  T("corridor_rebuild", { mode: "execute", params: { frequency: "20.0" } }),
  T("surface_volume", { mode: "execute", label: "volume EG vs corridor top", params: { baseSurface: cs("EG"), comparisonSurface: cs("Corredor Eje 1 Top") } }),
  T("create_sample_lines", { mode: "execute", params: { alignmentName: cs("Eje 1"), interval: "50.0" } }),
  T("section_report", { params: { alignmentName: cs("Eje 1"), maxSampleLines: "3" } }),
  T("create_section_views", { mode: "execute", params: { alignmentName: cs("Eje 1"), basePoint: "new Point3d(0, -500, 0)" } }),
  T("earthwork_report", { params: { surfaceName: cs("EG") } }),
  T("road_quick_start"),
  T("list_parcels"),
  T("layers", { mode: "execute", params: { layerName: cs("MCP-TEST"), aci: "1" } }),
  T("blocks_attributes", { mode: "execute", pre: C("", `
      var bt = (BlockTable)Transaction.GetObject(Database.BlockTableId, OpenMode.ForWrite);
      if (!bt.Has("MCP_TAG")) {
        var btr = new BlockTableRecord { Name = "MCP_TAG" }; bt.Add(btr); Transaction.AddNewlyCreatedDBObject(btr, true);
        var c = new Circle(Point3d.Origin, Vector3d.ZAxis, 2); btr.AppendEntity(c); Transaction.AddNewlyCreatedDBObject(c, true);
        var ad = new AttributeDefinition(new Point3d(3, 0, 0), "", "REF", "Ref?", Database.Textstyle) { Height = 1.5 };
        btr.AppendEntity(ad); Transaction.AddNewlyCreatedDBObject(ad, true);
      } return new { ok = true };`),
    params: { insertBlock: cs("MCP_TAG"), insertPoint: "new Point3d(150, 60, 0)", attributeValues: `new Dictionary<string, string> { ["REF"] = "PK 0+150" }` } }),
  T("text_and_dimensions", { mode: "execute" }),
  T("query_entities", { params: { typeFilter: cs("Polyline") } }),
  T("layouts", { mode: "execute", params: { newLayout: cs("MCP Test") } }),
  T("xrefs"),
  T("import_export_points", { block: 1, params: { filePath: cs(path.join(TMP, "export.csv")) } }),
  T("import_export_points", { mode: "execute", pre: { file: true },
    params: () => { const f = temp.write("TestData", "import.csv", "9001,50,50,105,IMP\n9002,60,60,105.5,IMP\n"); return { filePath: cs(f) }; } }),
  T("map_project_info"),
  T("transform_coordinates", { params: { fromCode: cs("ETRS89.UTM-30N"), toCode: cs("LL84") } }),
  T("object_data", { block: 1, mode: "execute", params: () => ({ tableName: cs("MCP_TEST"), entityHandles: `new[] { ${cs(ctx.boundary)} }` }) }),
  T("object_data", { block: 0, params: () => ({ entityHandles: `new[] { ${cs(ctx.boundary)} }` }) }),
  T("import_shp", { mode: "execute", pre: { shp: true }, params: () => ({ filePath: cs(path.join(TMP, "puntos.shp")) }) }),
  T("zoom_to_area", { label: "zoom extents" }),
  { label: "screenshot view (all)", rpc: ["captureView", { mode: "view", zoomExtents: true }], shot: "all_view" },
  { label: "screenshot drawing window", rpc: ["captureView", { mode: "drawing" }], shot: "all_drawing" },
  { label: "screenshot main window", rpc: ["captureView", { mode: "window", maxSize: 1400 }], shot: "all_window" },
  { label: "undo: one execute = one undo step", undo: true },
  { label: "save as temp dwg", rpc: ["saveDrawing", { path: path.join(TMP, "mcp_skills_test.dwg") }] },
];

// minimal point shapefile (2 points) for import_shp
function writeShp(stem) {
  const pts = [[100, 50], [200, 80]];
  const shpLen = 100 + pts.length * 28, shxLen = 100 + pts.length * 8;
  const hdr = (len) => { const b = Buffer.alloc(100); b.writeInt32BE(9994, 0); b.writeInt32BE(len / 2, 24); b.writeInt32LE(1000, 28); b.writeInt32LE(1, 32);
    b.writeDoubleLE(100, 36); b.writeDoubleLE(50, 44); b.writeDoubleLE(200, 52); b.writeDoubleLE(80, 60); return b; };
  const shp = [hdr(shpLen)], shx = [hdr(shxLen)];
  pts.forEach((p, i) => { const r = Buffer.alloc(28); r.writeInt32BE(i + 1, 0); r.writeInt32BE(10, 4); r.writeInt32LE(1, 8); r.writeDoubleLE(p[0], 12); r.writeDoubleLE(p[1], 20); shp.push(r);
    const x = Buffer.alloc(8); x.writeInt32BE((100 + i * 28) / 2, 0); x.writeInt32BE(10, 4); shx.push(x); });
  temp.write("TestData", stem + ".shp", Buffer.concat(shp)); temp.write("TestData", stem + ".shx", Buffer.concat(shx));
  // dbf: one char field NAME(10)
  const h = Buffer.alloc(32 + 32 + 1); h.writeUInt8(3, 0); h.writeUInt8(126, 1); h.writeUInt8(1, 2); h.writeUInt8(1, 3);
  h.writeUInt32LE(pts.length, 4); h.writeUInt16LE(65, 8); h.writeUInt16LE(11, 10);
  h.write("NAME", 32, "ascii"); h.write("C", 43, "ascii"); h.writeUInt8(10, 48); h.writeUInt8(0x0d, 64);
  const recs = pts.map((p, i) => Buffer.from(" " + ("PT" + (i + 1)).padEnd(10), "ascii"));
  temp.write("TestData", stem + ".dbf", Buffer.concat([h, ...recs, Buffer.from([0x1a])]));
}

// ---------- runner ----------
(async () => {
  const skills = loadSkills();
  const results = []; const used = {}; let aborted = false;
  const health = await rpc("getCivil3DHealth", {});
  if (health.error) { console.error("Plugin not reachable:", health.error.message); temp.write("TestResults", "report.md", "# Plugin not reachable\n\n" + health.error.message); process.exit(1); }

  for (const step of plan) {
    if (aborted) break;
    const label = step.label || (step.skill + (step.block ? `[${step.block}]` : ""));
    if (ONLY.length && step.skill && !ONLY.includes(step.skill) && !(step.label || "").startsWith("fixture")) continue;
    const t0 = Date.now(); let ok = false, detail = "", result = null;
    try {
      if (step.rpc) {
        const r = await rpc(step.rpc[0], step.rpc[1]);
        if (r.error) throw new Error(r.error.message);
        result = r.result;
        if (step.shot && result.base64) {
          const f = temp.write("TestResults", `shot_${step.shot}.png`, Buffer.from(result.base64, "base64"));
          detail = `${result.width}x${result.height} → ${path.basename(f)}`; result = { ...result, base64: `<${result.base64.length} chars>` };
        }
      } else if (step.undo) {
        const count = `var ms=(BlockTableRecord)Transaction.GetObject(SymbolUtilityServices.GetBlockModelSpaceId(Database),OpenMode.ForRead); return ms.Cast<ObjectId>().Count();`;
        const c0 = (await run(count, true)).result;
        await run(`var ms=(BlockTableRecord)Transaction.GetObject(SymbolUtilityServices.GetBlockModelSpaceId(Database),OpenMode.ForWrite);
                   foreach (var x in new[]{0.0, 10.0}) { var l=new Line(new Point3d(x,-700,0),new Point3d(x+5,-700,0)); ms.AppendEntity(l); Transaction.AddNewlyCreatedDBObject(l,true);} return 2;`, false);
        const c1 = (await run(count, true)).result;
        await run(`Document.SendStringToExecute("_.U ", true, false, false); return 0;`, true);
        await new Promise((r) => setTimeout(r, 3000));
        const c2 = (await run(count, true)).result;
        result = { before: c0, afterExecute: c1, afterU: c2 };
        if (c1 !== c0 + 2) throw new Error("execute did not add 2 entities");
        detail = c2 === c0 ? "U removed both lines → one execute = one undo step" : `U left ${c2 - c0} of 2 lines → undo granularity differs`;
        if (c2 !== c0) throw new Error(detail);
      } else {
        let code = step.code;
        let preResult = null;
        if (step.pre) {
          if (step.pre.code) { const r = await run(step.pre.code, false); if (r.error) throw new Error("pre-step: " + r.error.message); preResult = r.result; }
          if (step.pre.shp) writeShp("puntos");
        }
        if (step.skill) {
          const sk = skills[step.skill]; if (!sk) throw new Error("skill not found");
          const block = sk.blocks[step.block]; if (!block) throw new Error("code block " + step.block + " not found");
          const params = typeof step.params === "function" ? step.params(preResult) : step.params;
          code = applyParams(block, params || {});
          used[step.skill] = used[step.skill] || { file: sk.file, ok: true };
        }
        const r = await run(code, step.mode !== "execute");
        if (r.error) throw new Error(r.error.message);
        result = r.result;
        if (result && result.error) throw new Error("skill returned error: " + JSON.stringify(result));
        if (step.check) step.check(result);
        if (step.save) step.save(result);
      }
      ok = true;
    } catch (e) {
      detail = String(e.message || e);
      if (detail.startsWith("ABORT")) aborted = true;
      if (step.skill && used[step.skill]) used[step.skill].ok = false;
      if (step.skill && !used[step.skill]) used[step.skill] = { file: (skills[step.skill] || {}).file, ok: false };
    }
    const ms = Date.now() - t0;
    console.log(`${ok ? "PASS" : "FAIL"}  ${label}  (${ms} ms) ${ok ? "" : detail.split("\n")[0]}`);
    results.push({ label, skill: step.skill, ok, ms, detail, result });
  }

  // report
  const pass = results.filter((r) => r.ok).length;
  let md = `# Civil 3D MCP skills test\n\n${new Date().toISOString()} — plugin ${JSON.stringify(health.result)}\n\n**${pass}/${results.length} passed**\n\n| | step | ms | detail |\n|---|---|---|---|\n`;
  for (const r of results) md += `| ${r.ok ? "✅" : "❌"} | ${r.label} | ${r.ms} | ${(r.detail || "").replace(/\|/g, "\\|").replace(/\n/g, "<br>").slice(0, 600)} |\n`;
  md += "\n## Results\n\n";
  for (const r of results) md += `### ${r.ok ? "✅" : "❌"} ${r.label}\n\n\`\`\`json\n${JSON.stringify(r.result, null, 1)?.slice(0, 1500)}\n\`\`\`\n\n`;
  temp.write("TestResults", "report.md", md);
  temp.write("TestResults", "report.json", JSON.stringify({ health: health.result, results }, null, 1));

  if (MARK) {
    const ver = "Civil 3D 2027 (" + ((health.result && health.result.acadVersion) || "?") + ")";
    for (const [name, u] of Object.entries(used)) {
      if (!u.file) continue;
      const raw = fs.readFileSync(u.file, "utf8");
      const next = raw.replace(/^verified:.*$/m, `verified: ${u.ok ? ver : "no"}`);
      if (next !== raw) fs.writeFileSync(u.file, next);
    }
  }
  console.log(`\n${pass}/${results.length} passed — report: ${path.join(OUT, "report.md")}`);
})();
