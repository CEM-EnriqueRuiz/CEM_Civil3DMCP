import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { registerExecuteTool } from "./executeTool.js";
import { registerQueryTool } from "./queryTool.js";
import { registerSkillsTool } from "./skillsTool.js";
import { registerScreenshotTool } from "./screenshotTool.js";
import { registerSaveTool } from "./saveTool.js";

/**
 * Register the tools: 3 code-execution meta-tools plus screenshot and save.
 *
 * - civil3d_execute: Write operations (committed transaction)
 * - civil3d_query: Read-only operations (no commit)
 * - civil3d_skills: Browse/search/read code skill templates
 * - civil3d_screenshot: Image of the drawing for visual verification
 * - civil3d_save: Save / Save As the active drawing
 */
export async function registerTools(server: McpServer) {
  registerExecuteTool(server);
  registerQueryTool(server);
  registerSkillsTool(server);
  registerScreenshotTool(server);
  registerSaveTool(server);
}
