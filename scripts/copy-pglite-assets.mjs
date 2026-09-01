#!/usr/bin/env node
/**
 * Nitro's Vercel bundle inlines PGLite JS under `_libs/` but does not copy the
 * sibling `pglite.data` / `pglite.wasm` files the WASM loader opens by path.
 * Local `vite preview` of that output has no DATABASE_URL, so auth bootstrap
 * needs those files next to the bundled module.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const srcDir = join(root, "node_modules/@electric-sql/pglite/dist");
const destDir = join(root, ".vercel/output/functions/__server.func/_libs");
const files = ["pglite.data", "pglite.wasm", "initdb.wasm"];

if (!existsSync(join(root, ".vercel/output/functions"))) {
  console.log("[pglite-assets] no vercel function output — skip");
  process.exit(0);
}

mkdirSync(destDir, { recursive: true });
for (const file of files) {
  const from = join(srcDir, file);
  if (!existsSync(from)) continue;
  copyFileSync(from, join(destDir, file));
  console.log(`[pglite-assets] copied ${file}`);
}
