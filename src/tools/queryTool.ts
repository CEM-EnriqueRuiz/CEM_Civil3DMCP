import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withApplicationConnection } from "../utils/ConnectionManager.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("QueryTool");

/**
 * civil3d_query — Executes C# code in Civil 3D in READ-ONLY mode.
 * The transaction is NOT committed — no changes are persisted.
 *
 * Same globals as civil3d_execute but safe for data retrieval.
 * Use this for listing objects, getting properties, analyzing data, etc.
 */
export function registerQueryTool(server: McpServer) {
  server.tool(
    "civil3d_query",
    "Execute C# code in Civil 3D in READ-ONLY mode (the transaction is never committed; no undo step). " +
      "Runs without a document lock: never create or import objects here, not even temporary ones (e.g. a volume surface, subassemblies) - use civil3d_execute. " +
      "Available globals: Document, CivilDoc, Database, Transaction, Editor. " +
      "Auto-imported: System, System.Linq, System.Collections.Generic, System.Text, Autodesk.AutoCAD.{ApplicationServices,DatabaseServices,EditorInput,Geometry,Runtime}, " +
      "Autodesk.Civil, Autodesk.Civil.{ApplicationServices,DatabaseServices,Settings}. Add other namespaces with using directives at the top " +
      "(e.g. using Autodesk.Civil.DatabaseServices.Styles; or Map 3D: using Autodesk.Gis.Map; using Autodesk.Gis.Map.ObjectData;). " +
      "The full AutoCAD .NET API is available too (blocks, layers, layouts, dimensions...). Return a value to get results back as JSON. " +
      "Name clashes: write Autodesk.AutoCAD.DatabaseServices.Entity / DBObject and Autodesk.Civil.DatabaseServices.Surface / Section / Point explicitly. " +
      "Check civil3d_skills first for tested templates. " +
      "Use this for querying data: listing objects, getting properties, analyzing surfaces, etc.",
    {
      code: z.string().describe(
        "C# code to query data. Has access to Document, CivilDoc, Database, Transaction, Editor. " +
          "Example: var surfaces = new List<object>(); " +
          "foreach (ObjectId id in CivilDoc.GetSurfaceIds()) { " +
          "var s = Transaction.GetObject(id, OpenMode.ForRead) as TinSurface; " +
          'surfaces.Add(new { s.Name, s.Layer }); } return surfaces;'
      ),
    },
    async (args) => {
      try {
        log.debug("Executing query", { code: args.code });

        const result = await withApplicationConnection(async (client) =>
          await client.sendCommand("executeCode", {
            code: args.code,
            readOnly: true,
          })
        );

        return {
          content: [
            {
              type: "text" as const,
              text: JSON.stringify(result, null, 2),
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error("Query failed", { error: message });
        return {
          content: [{ type: "text" as const, text: `Query failed: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
