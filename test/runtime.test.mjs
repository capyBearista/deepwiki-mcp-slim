import test from "node:test";
import assert from "node:assert/strict";
// src/index.mjs connects to DeepWiki on import, so check its SDK imports load instead.
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";

test("MCP SDK entry points used by the CLI load", () => {
  for (const exported of [Client, StreamableHTTPClientTransport, McpServer, StdioServerTransport]) {
    assert.equal(typeof exported, "function");
  }
});
