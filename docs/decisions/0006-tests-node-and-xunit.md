---
title: "0006 — node:test for the server, contracts and guards; xunit for the plugin's pure logic; the live harness is not a test"
type: decision
status: current
updated: 2026-10-24
sources: [package.json, tests/unit/, plugin/Civil3dMcpPlugin.Tests/Civil3dMcpPlugin.Tests.csproj, TESTS.md]
related: [../workflows/test.md, ../workflows/live-mcp-test.md, ../modules/harness-and-setup.md, ../../../../docs/decisions/0007-tdd-and-one-test-runner.md, ../../../../docs/workflows/tdd-and-test-runner.md]
tags: [testing, tdd, node-test, xunit]
---

# 0006 — Two unit suites, and a live harness that is not a test

**Context.** The repo came with a live harness (`tests/skills_test.cjs`, `runner.cjs`) that needs a running Civil 3D,
and no unit tests. The workspace expects a runnable suite with test-first new logic
([root 0007](../../../../docs/decisions/0007-tdd-and-one-test-runner.md)).

**Decision.**
1. `npm test` builds the server, then runs `node --test "tests/unit/*.test.mjs"`: the port resolution, the temp
   helper, the port contract across plugin/server/setup, and the file-write guards.
2. `dotnet test plugin\Civil3dMcpPlugin.Tests` runs the plugin's pure logic (`PortSetting`, `SavePath`,
   `ScriptSandbox`) by compiling those source files directly (linked `Compile` items), because the plugin project
   references Civil 3D DLLs that load only inside acad.exe. It needs the .NET 10 SDK.
3. Anything that needs Civil 3D is verified live through the MCP server and recorded in
   [live MCP test](../workflows/live-mcp-test.md); it is never reported as tested.
4. `TESTS.md` lists each test and why it exists.

**Why.** node:test needs no new dependency and runs where the server runs; xunit is the workspace's C# framework.

**Rejected.** Mocking the AutoCAD API (huge surface, low value); calling the live harness a test suite (it changes
a drawing and needs a licensed Civil 3D).

**Consequences.** Test code never ships: the bundle is the plugin's publish output only, npm publishes `build/`
only, and the test project lives outside the plugin's folder so its SDK glob does not pick it up.
