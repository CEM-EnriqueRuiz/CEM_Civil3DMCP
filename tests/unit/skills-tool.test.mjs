// civil3d_skills through the MCP itself: build/index.js over stdio, as Claude starts it. `get` returns each
// parameter as its skill file declares it. Before 2026-11-05 every parameter came back as type "string",
// required false and without its description, because the indented keys under "- name:" were never read.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const client = new Client({ name: "civil3d-skills-test", version: "1.0.0" });

before(async () => {
  await client.connect(new StdioClientTransport({
    command: process.execPath, args: [path.join(repo, "build", "index.js")], stderr: "ignore",
  }));
});
after(() => client.close());

async function getSkill(skillName) {
  const result = await client.callTool({ name: "civil3d_skills", arguments: { action: "get", skillName } });
  assert.notEqual(result.isError, true, result.content[0].text);
  return JSON.parse(result.content[0].text);
}

test("get returns each parameter's type and required flag as the skill file declares them", async () => {
  const skill = await getSkill("surface_elevation");
  assert.deepEqual(skill.parameters, [
    { name: "surfaceName", type: "string", required: true },
    { name: "x", type: "double", required: true },
    { name: "y", type: "double", required: true },
  ]);
});

test("get returns a parameter's description and an optional parameter as not required", async () => {
  const skill = await getSkill("surface_from_points");
  assert.deepEqual(skill.parameters, [
    { name: "surfaceName", type: "string", required: true },
    {
      name: "pointGroupName", type: "string", required: false,
      description: 'Point group to add (e.g. "_All Points"); leave empty to use the xyz list',
    },
  ]);
});
