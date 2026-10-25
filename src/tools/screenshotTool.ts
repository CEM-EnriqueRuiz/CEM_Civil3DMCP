import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { withApplicationConnection } from "../utils/ConnectionManager.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("ScreenshotTool");

/**
 * civil3d_screenshot — returns an image of what Civil 3D is showing so the AI
 * can visually verify the result of civil3d_execute (labels, styles, layout...).
 */
export function registerScreenshotTool(server: McpServer) {
  server.tool(
    "civil3d_screenshot",
    "Capture an image of the active Civil 3D drawing to visually check results " +
      "(geometry, labels, styles). Use after civil3d_execute to verify, then fix what looks wrong. " +
      "mode 'view' (default) renders the current viewport off-screen and works even if Civil 3D is covered by other windows; " +
      "'drawing' grabs the drawing window as displayed; 'window' grabs the whole Civil 3D window incl. ribbon. " +
      "Set zoomExtents=true to zoom to everything first (this changes the user's view). " +
      "To frame a specific area, first set the view via civil3d_execute (e.g. Editor.SetCurrentView).",
    {
      mode: z.enum(["view", "drawing", "window"]).optional().describe("Capture mode (default 'view')."),
      zoomExtents: z.boolean().optional().describe("Zoom extents before capturing (default false)."),
      width: z.number().int().min(200).max(4000).optional().describe("Render width for 'view' mode (default 1600)."),
      height: z.number().int().min(200).max(4000).optional().describe("Render height for 'view' mode (default 1000)."),
      maxSize: z.number().int().min(200).max(4000).optional().describe("Longest side of the returned image in px (default 1600)."),
    },
    async (args) => {
      try {
        const result: any = await withApplicationConnection(async (client) =>
          await client.sendCommand("captureView", {
            mode: args.mode ?? "view",
            zoomExtents: args.zoomExtents ?? false,
            width: args.width,
            height: args.height,
            maxSize: args.maxSize,
          })
        );
        return {
          content: [
            { type: "image" as const, data: result.base64, mimeType: result.mimeType ?? "image/png" },
            {
              type: "text" as const,
              text: `Captured ${result.drawing} (${result.mode}, ${result.width}x${result.height}). Saved to ${result.savedTo}`,
            },
          ],
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log.error("Screenshot failed", { error: message });
        return { content: [{ type: "text" as const, text: `Screenshot failed: ${message}` }], isError: true };
      }
    }
  );
}
