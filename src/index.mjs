#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { filterUnavailableToolInstructions } from "./filter-instructions.mjs";

const { version } = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const allowed = new Set([
  "ask_wiki_question",
  "read_wiki_contents",
  "read_wiki_structure",
]);

// Preserve DeepWiki instructions, excluding guidance for unavailable tools.
const upstream = new Client({ name: "deepwiki-mcp-clean", version });
await upstream.connect(
  new StreamableHTTPClientTransport(new URL("https://mcp.deepwiki.com/mcp")),
);

// Forward the selectively filtered upstream instructions during initialization.
const instructions = filterUnavailableToolInstructions(upstream.getInstructions());
const mcp = new McpServer(
  { name: "deepwiki-mcp-clean", version },
  { instructions },
);
// Use the documented underlying protocol server for precise tool forwarding.
const server = mcp.server;
server.registerCapabilities({ tools: {} });

server.setRequestHandler("tools/list", async () => {
  const { tools } = await upstream.listTools();
  return { tools: tools.filter((tool) => allowed.has(tool.name)) };
});

server.setRequestHandler("tools/call", async ({ params }) => {
  if (!allowed.has(params.name)) {
    throw new Error(`Tool not exposed: ${params.name}`);
  }
  return upstream.callTool({
    name: params.name,
    arguments: params.arguments ?? {},
  });
});

await server.connect(new StdioServerTransport());
server.onclose = () => { void upstream.close(); };
