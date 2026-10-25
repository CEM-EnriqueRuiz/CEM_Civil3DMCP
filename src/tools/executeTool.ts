import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withApplicationConnection } from "../utils/ConnectionManager.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("ExecuteTool");

/**
 * civil3d_execute — Executes C# code in Civil 3D with WRITE access.
 * The code runs inside a transaction that gets committed on success.
 *
 * Available globals in the script:
 *   - Document (active AutoCAD document)
 *   - CivilDoc (active Civil 3D document)
 *   - Database (document database)
 *   - Transaction (active transaction — auto-committed)
 *   - Editor (document editor)
 *
 * The script can use all Civil 3D and AutoCAD namespaces (auto-imported).
 * Return a value to send it back as JSON to the AI.
 */
export function registerExecuteTool(server: McpServer) {
  server.tool(
    "civil3d_execute",
    "Execute C# code in Civil 3D with write access. The code runs inside a transaction that is committed on success " +
      "(an exception rolls everything back). Each call runs as the MCPEXEC command = one undo step (the user can type U to revert it; Civil 3D must be idle, Esc any active command). " +
      "Changes are NOT saved to disk — use civil3d_save. " +
      "Write files from a script only to a path the user named; never into an ACC folder (Autodesk Desktop Connector, synced to every colleague) " +
      "nor next to the plugin; scratch files go to System.IO.Path.GetTempPath() + \"Cemengal\\\\Civil3DMCP\". " +
      "Available globals: Document, CivilDoc, Database, Transaction, Editor. " +
      "Auto-imported: System, System.Linq, System.Collections.Generic, System.Text, Autodesk.AutoCAD.{ApplicationServices,DatabaseServices,EditorInput,Geometry,Runtime}, " +
      "Autodesk.Civil, Autodesk.Civil.{ApplicationServices,DatabaseServices,Settings}. Add other namespaces with using directives at the top " +
      "(e.g. using Autodesk.Civil.DatabaseServices.Styles; or Map 3D: using Autodesk.Gis.Map; using Autodesk.Gis.Map.ObjectData;). " +
      "The full AutoCAD .NET API is available too (blocks, layers, layouts, dimensions...). Return a value to get results back as JSON. " +
      "Name clashes: write Autodesk.AutoCAD.DatabaseServices.Entity / DBObject and Autodesk.Civil.DatabaseServices.Surface / Section / Point explicitly. " +
      "Check civil3d_skills first for tested templates. " +
      "Use this for operations that MODIFY the drawing (create, edit, delete objects); verify visually with civil3d_screenshot.",
    {
      code: z.string().describe(
        "C# code to execute. Has access to Document, CivilDoc, Database, Transaction, Editor. " +
          "Example: var id = TinSurface.Create(Database, \"MySurface\"); return new { success = true };"
      ),
      description: z.string().optional().describe(
        "Brief description of what this code does (for logging/audit trail)."
      ),
    },
    async (args) => {
      try {
        log.info("Executing write operation", { description: args.description });
        log.debug("Code", { code: args.code });

        const result = await withApplicationConnection(async (client) =>
          await client.sendCommand("executeCode", {
            code: args.code,
            readOnly: false,
            description: args.description,
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
        log.error("Execute failed", { error: message });
        return {
          content: [{ type: "text" as const, text: `Execution failed: ${message}` }],
          isError: true,
        };
      }
    }
  );
}
