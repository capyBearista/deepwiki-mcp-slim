#!/usr/bin/env node
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";
import { filterDevinInstructions } from "./filter-instructions.mjs";

const allowed = new Set([
  "ask_wiki_question",
  "read_wiki_contents",
  "read_wiki_structure",
]);

// Preserve public DeepWiki instructions, excluding Devin-specific guidance.
const upstream = new Client({ name: "deepwiki-mcp-clean", version: "0.1.0" });
await upstream.connect(
  new StreamableHTTPClientTransport(new URL("https://mcp.deepwiki.com/mcp")),
);

// Forward the selectively filtered upstream instructions during initialization.
const instructions = filterDevinInstructions(upstream.getInstructions());
const mcp = new McpServer(
  { name: "deepwiki-mcp-clean", version: "0.1.2" },
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
