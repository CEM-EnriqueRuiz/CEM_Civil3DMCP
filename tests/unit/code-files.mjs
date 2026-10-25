// The code files the guard tests scan: every shipped or runnable source of this repo (plugin C#, server TypeScript,
// scripts), never build output, dependencies, the test results or these unit tests themselves.
import { readdirSync } from "node:fs";
import path from "node:path";

const SKIP_DIRS = new Set([".git", "node_modules", "build", "bin", "obj", "C_References", "docs", "skills", "results", "queue", "unit", ".claude", ".agents"]);
const CODE = /\.(cs|ts|cjs|js|mjs|ps1|bat|cmd|csproj)$/i;

/** A line without its comment: `//` and `///` (C#, JS), a JSDoc ` * ` line, `#` (PowerShell), `rem` and `::` (batch). */
export function noComment(text) {
  return text.replace(/\/\/.*$/, "").replace(/^\s*(#|\*|\/\*|rem\b|::).*$/i, "");
}

export function codeFiles(repo) {
  const out = [];
  const walk = (dir) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name) && !e.name.endsWith(".Tests")) walk(path.join(dir, e.name));
      } else if (CODE.test(e.name)) {
        out.push(path.relative(repo, path.join(dir, e.name)).split(path.sep).join("/"));
      }
    }
  };
  walk(repo);
  return out.sort();
}
