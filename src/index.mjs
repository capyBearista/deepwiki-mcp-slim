#!/usr/bin/env node
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";

const allowed = new Set([
  "ask_wiki_question",
  "read_wiki_contents",
  "read_wiki_structure",
]);

// Use the public DeepWiki transport. Its initialization instructions are deliberately
// not forwarded to the local MCP server exposed to the coding harness.
const upstream = new Client({ name: "deepwiki-mcp-clean", version: "0.1.0" });
await upstream.connect(
  new StreamableHTTPClientTransport(new URL("https://mcp.deepwiki.com/mcp")),
);

// Low-level Server preserves the upstream tools' JSON Schemas and return values;
// no local server instructions are set or advertised.
const mcp = new McpServer({ name: "deepwiki-mcp-clean", version: "0.1.1" });
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
