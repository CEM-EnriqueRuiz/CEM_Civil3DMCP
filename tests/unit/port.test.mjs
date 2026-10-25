// The server's port: 8766 by default, CIVIL3D_PORT overrides it (docs/decisions/0002-own-port-8766.md).
// 8080 is the Revit MCP's port: with Civil 3D open on 8080, a Revit MCP call reached Civil 3D.
import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT_PORT, resolvePort } from "../../build/utils/config.js";

test("the default port is 8766, not the Revit MCP's 8080", () => {
  assert.equal(DEFAULT_PORT, 8766);
  assert.equal(resolvePort(undefined), 8766);
  assert.equal(resolvePort(""), 8766);
});

test("CIVIL3D_PORT overrides the default", () => {
  assert.equal(resolvePort("18766"), 18766);
  assert.equal(resolvePort(" 9001 "), 9001);
});

test("a value that is not a TCP port falls back to the default", () => {
  for (const bad of ["abc", "0", "-1", "65536", "80.5", "8766x"]) {
    assert.equal(resolvePort(bad), 8766, bad);
  }
});
