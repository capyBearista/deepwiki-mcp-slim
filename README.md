# DeepWiki MCP Clean

A tiny stdio MCP server that exposes DeepWiki's three public wiki tools without
forwarding its verbose MCP initialization instructions (including irrelevant `devin_*` guidance).

This is a narrow, tools-only proof of concept; it does not proxy MCP resources,
prompts, server-to-client notifications, authentication, or cancellation to upstream.

## Install (Node 20+)

Clone or copy into a standalone project directory, e.g. `~/src/deepwiki-mcp-clean`.

```sh
cd ~/src/deepwiki-mcp-clean
npm install
npm link
command -v deepwiki-mcp-clean
```

Do not run the executable interactively expecting output: it waits for stdio MCP requests.
Never log to stdout in an MCP stdio server; stdout belongs to JSON-RPC.

## Claude Code `claude-workflow/.mcp.json`

Replace only the `deepwiki` entry:

```json
"deepwiki": {
  "type": "stdio",
  "command": "deepwiki-mcp-clean",
  "args": []
}
```

The `shared-workflow` plugin distributes its `.mcp.json`, so edit the plugin
repository, not `.agents`' synchronization paths. Its `tests/test_mcp_config.py`
currently assumes every MCP is `http`; adjust the assertion to permit DeepWiki
as stdio, while preserving the other HTTP server checks.

## OpenCode V2 `opencode.jsonc`

Replace only the `mcp.servers.deepwiki` definition:

```jsonc
"deepwiki": {
  "type": "local",
  "command": ["deepwiki-mcp-clean"]
}
```

Keep the `deepwiki` name so OMOS per-agent MCP assignment still matches.

## Oh My Pi (OMP)

OMP can suppress server instructions without a wrapper. Put the following in
`~/.omp/agent/mcp.json` (assuming you want a native OMP definition):

```json
{
  "mcpServers": {
    "deepwiki": {
      "type": "http",
      "url": "https://mcp.deepwiki.com/mcp",
      "instructions": false
    }
  }
}
```

Alternatively use the same `deepwiki-mcp-clean` stdio executable in OMP. OMP's
MCP discovery may import MCP configs from other harnesses; use `/mcp list`
to check which source actually wins.

## Verify after installing dependencies

- Run `npx @modelcontextprotocol/inspector deepwiki-mcp-clean` to inspect tools and call one.
- Expected exactly three names: `ask_wiki_question`, `read_wiki_contents`, `read_wiki_structure`.
- Check OpenCode's next raw request: no `devin_*` server instructions.
- Claude Code: `/mcp` and try a public repository question via DeepWiki.
- OpenCode: `opencode mcp list`, then try a public repository question.
- OMP: `/mcp list` and `/mcp test deepwiki`.

## Limitations

The proxy is a tools-only minimal example, not a fully transparent MCP protocol
relay. It intentionally does not expose other capabilities that an upstream MCP
server may add later; that is useful for keeping a fixed small context surface,
but update the allowlist deliberately if DeepWiki changes public tools.

The source was corrected for the published MCP SDK v2 surface and syntax-checked with `node --check`, but not runtime-tested here:
this environment cannot reach the npm registry or the upstream DeepWiki endpoint.
