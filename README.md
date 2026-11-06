# DeepWiki MCP Clean

A small, unofficial [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) proxy for [DeepWiki](https://deepwiki.com/). It exposes the three public DeepWiki wiki tools while removing instructions about unavailable private-mode and Devin tools.

**Keep the useful DeepWiki instructions, without advertising tools the agent cannot use.**

## Why this exists

DeepWiki's public MCP endpoint exposes three wiki tools, but its server initialization instructions can mention additional tools that are not available through that endpoint. Coding agents may receive those instructions even though the tools are absent from their tool list.

This proxy gives an MCP client a smaller, consistent view:

| | Direct DeepWiki | DeepWiki MCP Clean |
| --- | --- | --- |
| Public wiki tools | 3 | Same 3 |
| General DeepWiki instructions | Included | Preserved |
| `devin_*` references | May be included | Removed |
| `list_wiki_repos` and `generate_wiki` references | May be included | Removed |
| Tool arguments and responses | From DeepWiki | Forwarded unchanged |

The proxy **does not run DeepWiki locally**. It connects to `https://mcp.deepwiki.com/mcp` for every local MCP server process.

## How it works

```text
Coding agent (OpenCode / Claude Code / OMP / another MCP client)
       |
       | MCP over stdio
       v
deepwiki-mcp-clean (local Node.js process)
       |   - allowlist public tools
       |   - filter initialization instructions
       |   - forward tool calls and responses
       |
       | MCP over Streamable HTTP
       v
https://mcp.deepwiki.com/mcp
```

On startup, the proxy connects to DeepWiki, reads its initialization instructions, removes lines referring to unavailable tools, and advertises the remaining instructions to the local MCP client. It then forwards requests for these three tools:

| Tool | Purpose |
| --- | --- |
| `ask_wiki_question` | Ask a question about a repository |
| `read_wiki_contents` | Read repository wiki content |
| `read_wiki_structure` | Explore the structure of a repository's wiki |

The filter currently removes any instruction **line** containing a `devin_*` name, `list_wiki_repos`, or `generate_wiki`. It also removes the observed Devin OAuth/organization preface because that line refers to `devin_*`.

This is a **fixed tool allowlist**, not automatic discovery of all future public DeepWiki tools.

## Requirements

- Node.js **20 or newer** and npm
- Network access to `https://mcp.deepwiki.com/mcp`
- An MCP client that can launch a **stdio** server

No DeepWiki API key is required for the public endpoint used by this project. This proxy does not implement private-mode or upstream OAuth authentication.

## Installation

Clone the repository and install its locked dependencies:

```bash
git clone https://github.com/capyBearista/deepwiki-mcp-clean.git
cd deepwiki-mcp-clean
npm ci
npm link
```

Check that the executable resolves:

```bash
command -v deepwiki-mcp-clean
npm test
```

`npm link` makes the `deepwiki-mcp-clean` command available to programs using the same Node/npm installation. Install or link it separately in each environment where a coding harness runs (for example, Windows and WSL are separate environments).

**Linux/WSL troubleshooting:** If your MCP client reports `spawn deepwiki-mcp-clean EACCES`, confirm the entrypoint is executable:

```bash
ls -l src/index.mjs
chmod +x src/index.mjs
```

The repository tracks that file as executable; the `chmod` command is a recovery step if permissions were lost during copying or extraction.

## Configure a coding harness

Configure **`deepwiki-mcp-clean` as a local/stdio server named `deepwiki`**. Replace any existing DeepWiki connection rather than registering both, or your agent may still receive the unfiltered server instructions.

If your coding harness does not inherit npm's executable directory in its `PATH`, use the absolute path returned by `command -v deepwiki-mcp-clean`.

### OpenCode V2

In `opencode.jsonc`, replace the `deepwiki` entry under **`mcp.servers`**:

```jsonc
{
  "mcp": {
    "servers": {
      "deepwiki": {
        "type": "local",
        "command": ["deepwiki-mcp-clean"]
      }
    }
  }
}
```

Merge this into your existing configuration; do not replace unrelated MCP servers. Retaining the `deepwiki` server name also preserves references to that server in agent-specific MCP assignments.

See the [OpenCode V2 MCP documentation](https://opencode.ai/v2/docs/mcp-servers).

### Claude Code (including plugins)

For a regular MCP configuration or a plugin's `.mcp.json`, replace the existing `deepwiki` entry:

```json
{
  "mcpServers": {
    "deepwiki": {
      "type": "stdio",
      "command": "deepwiki-mcp-clean",
      "args": []
    }
  }
}
```

If DeepWiki is supplied by a **Claude Code plugin**, change the plugin's own `.mcp.json`; editing an unrelated user-level MCP entry won't replace the plugin-bundled server. Each machine running the plugin must also have the executable installed. Repository tests or validation scripts that require all MCPs to be HTTP must be updated to permit this stdio server.

See [Claude Code documentation](https://code.claude.com/docs/).

### Oh My Pi (OMP)

In `~/.omp/agent/mcp.json`:

```json
{
  "mcpServers": {
    "deepwiki": {
      "type": "stdio",
      "command": "deepwiki-mcp-clean",
      "args": []
    }
  }
}
```

OMP also supports `instructions: false` on a direct HTTP DeepWiki connection, **but that removes all server instructions**, not just the irrelevant ones. Use this proxy if you want to retain the useful instructions. Check `/mcp list` to ensure OMP selected the intended server when multiple configuration sources exist.

See [OMP MCP configuration](https://github.com/can1357/oh-my-pi/blob/main/docs/mcp-config.md).

### Other environments

Any MCP client supporting local stdio servers can launch the same executable. The essential settings are:

- **Transport:** stdio
- **Command:** `deepwiki-mcp-clean`
- **Server name:** `deepwiki` (recommended for compatibility)

No always-running daemon or separate HTTP port is needed. The coding harness starts and stops its own local proxy process.

## Verification

First, run the unit tests:

```bash
npm test
```

These test the instruction filter only. To inspect the running MCP server:

```bash
npx @modelcontextprotocol/inspector deepwiki-mcp-clean
```

Connect through the Inspector and check:

1. `tools/list` contains exactly `ask_wiki_question`, `read_wiki_contents`, and `read_wiki_structure`.
2. Server initialization instructions still contain useful wiki guidance, with no `devin_*`, `list_wiki_repos`, or `generate_wiki` references.
3. Calling one public wiki tool returns a response from DeepWiki.

**The live end-to-end behavior has not been verified by the repository's unit tests.** The Inspector check is an integration test you should run after installation.

## Limitations

- **Tools only:** MCP prompts, resources, server-to-client notifications, cancellation, and upstream authentication are not transparently proxied.
- **Text-based filter:** The filter removes matching instruction lines, not semantic paragraphs. If DeepWiki changes its instruction format, irrelevant text could remain or a useful matching line could be removed.
- **Fixed allowlist:** New DeepWiki tools will not appear automatically. Review and explicitly add them when appropriate.
- **Upstream dependency:** Connection and tool execution depend on the availability and behavior of DeepWiki's public MCP endpoint.
- **Not an access-control boundary:** This project removes unwanted tool exposure and guidance; it does not sandbox or verify content returned by DeepWiki.

## Development

```bash
npm ci
npm test
node --check src/index.mjs
```

| File | Responsibility |
| --- | --- |
| `src/index.mjs` | Connects to DeepWiki, registers the local MCP server, and forwards allowlisted tools |
| `src/filter-instructions.mjs` | Filters unavailable-tool instructions |
| `test/filter-instructions.test.mjs` | Regression tests for instruction filtering |

The executable uses stdout for the MCP JSON-RPC protocol. If you add diagnostic logging, send it to **stderr**, never stdout.

## Status

Early-stage, focused utility. The goal is deliberately narrow: **make the public DeepWiki MCP easier for coding agents to use without losing its useful initialization instructions**.

This project is not affiliated with DeepWiki or Devin.
