# Tests: traceability

One line per test file: what it verifies and why. Commands and scope: [docs/workflows/test.md](docs/workflows/test.md).
Never shipped: the bundle is the plugin's publish output only, and npm publishes `build/` only.

| Test | Verifies | Why |
|---|---|---|
| `tests/unit/port.test.mjs` | `resolvePort`: default 8766, `CIVIL3D_PORT` override, invalid values fall back | docs/decisions/0002 (8080 is the Revit MCP's port; `abc` gave `NaN`) |
| `tests/unit/port-contract.test.mjs` | plugin, server and `setup_claude.ps1` agree on 8766; setup persists only another port; no `8080` in code; harness fallbacks | docs/decisions/0002 |
| `tests/unit/cem-temp.test.mjs` | `tools/cem-temp.cjs`: `%TEMP%\Cemengal\Civil3DMCP`, kinds, daily logs, names stay inside, ACC root refused, 7-day and 50 MB pruning once per process, locked files skipped, never throws, `write`, `appendLog` | docs/decisions/0003, root 0031 |
| `tests/unit/no-acc-writes.test.mjs` | no code names an ACC path or derives a path from its assembly; every write goes through a helper or an allow-listed call site; the screenshot uses `CemTempFolder`; the bundle ships `CEM_CSharpExtended.dll` | docs/decisions/0003, root 0031 §7 (the guard) |
| `plugin/Civil3dMcpPlugin.Tests/PortSettingTests.cs` | the plugin's `PortSetting` | docs/decisions/0002 |
| `plugin/Civil3dMcpPlugin.Tests/SavePathTests.cs` | Save As path: absolute `.dwg`, existing folder, normalised; relative and drive-relative refused | docs/decisions/0005 |
| `plugin/Civil3dMcpPlugin.Tests/ScriptSandboxTests.cs` | what `ScriptSandbox` refuses today (characterisation, written after the code) | docs/modules/plugin.md |

The live harness (`tests/skills_test.cjs`, `runner.cjs`, `run_all.ps1`, `test_plugin.cjs`) drives a running Civil 3D
and is not a test suite (docs/decisions/0006).
