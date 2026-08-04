#!/usr/bin/env node
/**
 * Publish gate: the checks that only fail at a consumer.
 *
 * Check 4 is the one this package exists for. `@loopingai/core` is the agent
 * runtime and a gateway must not import it, so the two sides of the A2A wire
 * contract can only share code through something that commits its consumers to
 * nothing. "Zero dependencies" is therefore not a preference — it is the
 * property that makes the package safe for both to depend on, and a promise in
 * a README is not a mechanism. One `import { X } from "jose"` and the reason to
 * have split this out is gone, silently, in a patch release.
 *
 *   1. Every `exports` subpath resolves to a file that actually emitted.
 *   2. No relative import in `dist/` omits its `.js` extension (Node ESM throws
 *      `ERR_MODULE_NOT_FOUND` on those; `moduleResolution: "Bundler"` does not).
 *   3. No spec files reached `dist/` — they carry the one bare import in the
 *      repo.
 *   4. `dist/` contains no bare import at all, and the manifest declares no
 *      dependencies of any kind.
 */
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

const failures = [];
const fail = (msg) => failures.push(msg);

const importsIn = (source) =>
  [...source.matchAll(/(?:from|import)\s*\(?\s*"([^"]+)"/g)].map((m) => m[1]);

function* walk(dir) {
  if (!existsSync(dir)) return;
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name);
    if (statSync(full).isDirectory()) yield* walk(full);
    else yield full;
  }
}

// --- 1. every exports target exists -----------------------------------------

let subpaths = 0;
for (const [subpath, value] of Object.entries(pkg.exports ?? {})) {
  const targets = typeof value === "string" ? [value] : Object.values(value);
  for (const target of targets) {
    if (!existsSync(path.join(root, target))) {
      fail(`exports "${subpath}" points at ${target}, which does not exist`);
    }
  }
  subpaths += 1;
}

// --- 2, 3 & 4. what reached dist/ -------------------------------------------

// `.d.ts` too, not just `.js`: a type-only import of a package the manifest
// does not declare breaks a consumer's typecheck rather than its bundle, which
// is a slower and more confusing way to find out.
let modules = 0;
for (const file of walk(path.join(root, "dist"))) {
  const rel = path.relative(root, file);
  if (/\.spec\.(js|d\.ts)$/.test(file)) {
    fail(`spec file shipped to dist: ${rel}`);
  }
  if (!/\.(js|d\.ts)$/.test(file)) continue;
  if (file.endsWith(".js")) modules += 1;
  for (const spec of importsIn(readFileSync(file, "utf8"))) {
    if (spec.startsWith(".")) {
      if (!spec.endsWith(".js")) {
        fail(
          `${rel} imports "${spec}" without a .js extension — Node ESM will ` +
            `throw ERR_MODULE_NOT_FOUND`
        );
      }
    } else {
      fail(
        `${rel} imports "${spec}" — this package must have no dependencies, ` +
          `so that a gateway can depend on it without importing an agent runtime`
      );
    }
  }
}

// --- 4b. …and the manifest says so ------------------------------------------

for (const field of [
  "dependencies",
  "peerDependencies",
  "optionalDependencies"
]) {
  const declared = Object.keys(pkg[field] ?? {});
  if (declared.length > 0) {
    fail(
      `package.json declares ${field}: ${declared.join(", ")} — this package ` +
        `must install nothing into a consumer's tree`
    );
  }
}

// --- report ------------------------------------------------------------------

if (failures.length > 0) {
  console.error(`\n✗ ${pkg.name} is not safe to publish:\n`);
  for (const f of failures) console.error(`  • ${f}`);
  console.error("");
  process.exit(1);
}

// stderr, not stdout: this runs from `prepack`, and `npm pack --json` expects
// stdout to be nothing but its own JSON.
console.error(
  `✓ ${pkg.name}: ${subpaths} subpaths resolve, ${modules} modules emitted, ` +
    `zero dependencies`
);
