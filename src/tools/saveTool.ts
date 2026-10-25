import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withApplicationConnection } from "../utils/ConnectionManager.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("SaveTool");

/** civil3d_save — saves the active drawing (civil3d_execute commits to memory only). */
export function registerSaveTool(server: McpServer) {
  server.tool(
    "civil3d_save",
    "Save the active Civil 3D drawing to disk. civil3d_execute changes live only in memory until saved. " +
      "Without 'path' it saves in place (fails for a never-saved drawing such as Drawing1.dwg). " +
      "With 'path' it does Save As to that .dwg (the drawing then continues under the new name); the path must be absolute and its folder must exist. " +
      "Only save when the user asked to, and only where the user asked, or confirm first — saving overwrites the file.",
    {
      path: z.string().optional().describe("Absolute path ending in .dwg for Save As (e.g. C:\\Projects\\copy.dwg). Omit to save in place."),
    },
    async (args) => {
      try {
        const result = await withApplicationConnection(async (client) =>
          await client.sendCommand("saveDrawing", { path: args.path })
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }] };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error("Save failed", { error: message });
        return { content: [{ type: "text" as const, text: `Save failed: ${message}` }], isError: true };
      }
    }
  );
}
