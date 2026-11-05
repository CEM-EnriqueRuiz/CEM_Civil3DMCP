---
title: "Test: the Node and xunit suites, what they cover and what they cannot"
type: workflow
updated: 2026-11-05
sources: [package.json, tests/unit/, src/utils/ConnectionManager.ts, src/tools/skillsTool.ts, plugin/Civil3dMcpPlugin.Tests/, TESTS.md]
related: [../decisions/0006-tests-node-and-xunit.md, live-mcp-test.md, ../../../../docs/workflows/tdd-and-test-runner.md]
tags: [testing, tdd]
---

# Test

```powershell
npm test                                             # tsc, then node --test "tests/unit/*.test.mjs" (32 tests)
dotnet test plugin\Civil3dMcpPlugin.Tests -v minimal  # xunit, net10.0 (24 tests)
```

| Suite | File | Covers |
|---|---|---|
| node | `tests/unit/port.test.mjs` | `resolvePort`: 8766 default, override, invalid values |
| node | `tests/unit/port-contract.test.mjs` | plugin, server and setup agree on 8766; setup persists only another port; no `8080` left in code |
| node | `tests/unit/cem-temp.test.mjs` | the temp helper: location, kinds, daily logs, names that cannot leave, ACC root refused, age and size pruning, once per process, locked files, never throws |
| node | `tests/unit/connection.test.mjs` | `withApplicationConnection` against a fake loopback plugin: the result, and no false connect-timeout warning after a successful call |
| node | `tests/unit/skills-tool.test.mjs` | `civil3d_skills get` through the MCP client: each parameter's type, required flag and description as declared |
| node | `tests/unit/no-acc-writes.test.mjs` | the 0031 guard: no ACC path, no path from the assembly, every write through a helper or on the allow-list, the screenshot through `CemTempFolder`, the bundle ships `CEM_CSharpExtended.dll` |
| xunit | `PortSettingTests` | the plugin's port |
| xunit | `SavePathTests` | Save As path: absolute, `.dwg`, existing folder, normalised; relative and drive-relative refused |
| xunit | `ScriptSandboxTests` | what the text filter refuses today (characterisation) |

`tests/unit/code-files.mjs` lists the files the guards scan: plugin C#, server TypeScript, scripts; never `build/`,
`node_modules/`, `bin/`/`obj/`, the test folders or the docs. TDD: new logic starts red, for the right reason
([tdd-and-test-runner](../../../../docs/workflows/tdd-and-test-runner.md)); record each new test in `TESTS.md`.

**Cannot cover:** anything that needs acad.exe (the Civil 3D API, threading, undo, capture, COM save). That is the
[live MCP test](live-mcp-test.md), reported separately and never as "tested".
