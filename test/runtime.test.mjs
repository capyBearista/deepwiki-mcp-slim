import test from "node:test";
import assert from "node:assert/strict";

// Bundling resolves every import and export in the CLI without running it
// (running it would connect to DeepWiki).
test("CLI imports resolve under Bun", async () => {
  const entrypoint = new URL("../src/index.mjs", import.meta.url).pathname;
  const result = await Bun.build({ entrypoints: [entrypoint], target: "bun", throw: false });
  assert.ok(result.success, result.logs.map((log) => log.message).join("\n"));
});
