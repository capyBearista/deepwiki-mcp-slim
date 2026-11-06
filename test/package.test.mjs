import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const root = new URL("../", import.meta.url);
const pkg = JSON.parse(readFileSync(new URL("package.json", root), "utf8"));

test("npm package is public and exposes the intended CLI", () => {
  assert.equal(pkg.name, "@capybearista/deepwiki-mcp-clean");
  assert.equal(pkg.private, undefined);
  assert.equal(pkg.publishConfig.access, "public");
  assert.deepEqual(pkg.files, ["src/"]);
  assert.equal(pkg.bin["deepwiki-mcp-clean"], "./src/index.mjs");
});

test("CLI source is present with an executable Node shebang", () => {
  const entrypoint = readFileSync(new URL("src/index.mjs", root), "utf8");
  assert.match(entrypoint, /^#!\/usr\/bin\/env node\n/);
  assert.match(entrypoint, /new URL\("\.\.\/package\.json", import\.meta\.url\)/);
});
