import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
// Load the SDK modules the CLI uses, so a load-time failure under Bun fails the suite.
import "@modelcontextprotocol/client";
import "@modelcontextprotocol/server";
import "@modelcontextprotocol/server/stdio";

// Bundling resolves every import and export in the CLI without running it
// (running it would connect to DeepWiki).
test("CLI imports resolve under Bun", async () => {
  const entrypoint = fileURLToPath(new URL("../src/index.mjs", import.meta.url));
  const result = await Bun.build({ entrypoints: [entrypoint], target: "bun", throw: false });
  assert.ok(result.success, result.logs.map((log) => log.message).join("\n"));
});
