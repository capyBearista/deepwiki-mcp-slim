# DeepWiki MCP Slim

A small, unofficial [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) proxy for [DeepWiki](https://deepwiki.com/). It exposes the three public DeepWiki wiki tools while removing instructions about unavailable private-mode and Devin tools.

**Keep the useful DeepWiki instructions, without advertising tools the agent cannot use.**

## Why this exists

DeepWiki's public MCP endpoint exposes three wiki tools, but its server initialization instructions can mention additional tools that are not available through that endpoint. Coding agents may receive those instructions even though the tools are absent from their tool list.

This proxy gives an MCP client a smaller, consistent view:

| | Direct DeepWiki | DeepWiki MCP Slim |
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
deepwiki-mcp-slim (local Bun process)
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

- [Bun](https://bun.sh/) **1.4 or newer** (Node.js is not supported)
- Network access to `https://mcp.deepwiki.com/mcp`
- An MCP client that can launch a **stdio** server

No DeepWiki API key is required for the public endpoint used by this project. This proxy does not implement private-mode or upstream OAuth authentication.

## Installation

The package is published to npm but runs on Bun only: its executable starts with `#!/usr/bin/env bun`. You do not need to clone this repository on each machine. Choose one of the following approaches.

### Option A: Global install

Recommended when you prefer quick, predictable startup:

```bash
bun add -g deepwiki-mcp-slim
deepwiki-mcp-slim
```

The command starts a stdio MCP server and waits for a client to connect. **It is normal for it to print nothing**; stop it with Ctrl+C if you launched it manually. In your harness configuration, use the command `deepwiki-mcp-slim` without launching it yourself.

Upgrade intentionally with:

```bash
bun add -g deepwiki-mcp-slim@latest
```

Make sure Bun's global bin directory (`bun pm bin -g`) is on your `PATH`.

### Option B: Run with bunx

No global install or clone required:

```bash
bunx deepwiki-mcp-slim@0.2.0
```

This installs the requested package into Bun's cache when needed, then starts the MCP server. Use that command in the harness configuration instead of running it manually.

**Version pinning is recommended for coding agents.** Without the explicit `@0.2.0` version, a later launch can resolve a newer release unexpectedly.

| | Global install | bunx with pinned version |
| --- | --- | --- |
| One-time installation | Required on each machine | Not required |
| Launch overhead | Lower | Package resolution/cache checks |
| Offline reliability | Installed command works; DeepWiki still needs network | Also requires the package to be present in Bun's cache |
| Updates | You choose when to reinstall | You choose when to change the version in config |
| Best fit | Frequently launched local agents | Shared, portable MCP configurations |

Neither method removes the proxy's requirement to contact DeepWiki's upstream HTTPS service.

### Install from source (development)

```bash
git clone https://github.com/capyBearista/deepwiki-mcp-slim.git
cd deepwiki-mcp-slim
bun install --frozen-lockfile
bun test
bun link
```

`bun link` makes the local checkout's executable available to harnesses using the same Bun installation.

### Notes on environments

Bun 1.4+ must be installed in **each environment where your coding harness runs** (for example, native Windows and WSL are separate environments). Ensure the harness can find `bun`, `bunx`, or `deepwiki-mcp-slim` on its `PATH`. You can inspect the resolved command with `command -v` on Linux/macOS or `where.exe` on Windows.

If launching a source checkout fails with a permission-denied error (such as `EACCES`) on Linux, check the executable bit:

```bash
ls -l src/index.mjs
chmod +x src/index.mjs
```

The repository tracks `src/index.mjs` as executable. Global installs receive the package manager's platform-specific executable linking/shims.

## Configure a coding harness

Configure **`deepwiki-mcp-slim` as a local/stdio server named `deepwiki`**. Replace any existing DeepWiki connection rather than registering both, or your agent may still receive the unfiltered server instructions.

For **bunx** instead of a global install, replace the command with `["bunx", "deepwiki-mcp-slim@0.2.0"]` in OpenCode, or use `"command": "bunx", "args": ["deepwiki-mcp-slim@0.2.0"]` in other stdio MCP clients. In either case, make sure the harness can find the executable on `PATH`.

### OpenCode V2

In `opencode.jsonc`, replace the `deepwiki` entry under **`mcp.servers`**:

```jsonc
{
  "mcp": {
    "servers": {
      "deepwiki": {
        "type": "local",
        "command": ["deepwiki-mcp-slim"]
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
      "command": "deepwiki-mcp-slim",
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
      "command": "deepwiki-mcp-slim",
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
- **Command:** `deepwiki-mcp-slim`
- **Server name:** `deepwiki` (recommended for compatibility)

No always-running daemon or separate HTTP port is needed. The coding harness starts and stops its own local proxy process.

## Verification

First, run the unit tests:

```bash
bun test
```

These test the instruction filter, package metadata, and that the CLI's imports resolve under Bun; they do not start the server. To check that the installed server starts and reaches DeepWiki, send it one `initialize` request:

```bash
echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"check","version":"0"}}}' | deepwiki-mcp-slim
```

The reply should report `"version":"0.2.0"` and include instructions with useful wiki guidance but no `devin_*`, `list_wiki_repos`, or `generate_wiki` references. Then, in your coding harness, check that:

1. The `deepwiki` server lists exactly `ask_wiki_question`, `read_wiki_contents`, and `read_wiki_structure`.
2. Calling one public wiki tool returns a response from DeepWiki.

**The live end-to-end behavior has not been verified by the repository's unit tests.** Run these checks after installation.

## Limitations

- **Tools only:** MCP prompts, resources, server-to-client notifications, cancellation, and upstream authentication are not transparently proxied.
- **Text-based filter:** The filter removes matching instruction lines, not semantic paragraphs. If DeepWiki changes its instruction format, irrelevant text could remain or a useful matching line could be removed.
- **Fixed allowlist:** New DeepWiki tools will not appear automatically. Review and explicitly add them when appropriate.
- **Upstream dependency:** Connection and tool execution depend on the availability and behavior of DeepWiki's public MCP endpoint.
- **Not an access-control boundary:** This project removes unwanted tool exposure and guidance; it does not sandbox or verify content returned by DeepWiki.

## Development

```bash
bun install --frozen-lockfile
bun test
```

The local MCP server reads its version from `package.json` instead of a separate hardcoded value.

| File | Responsibility |
| --- | --- |
| `src/index.mjs` | Connects to DeepWiki, registers the local MCP server, and forwards allowlisted tools |
| `src/filter-instructions.mjs` | Filters unavailable-tool instructions |
| `test/filter-instructions.test.mjs` | Regression tests for instruction filtering |
| `test/package.test.mjs` | Checks package metadata and the CLI entrypoint |
| `test/runtime.test.mjs` | Loads the MCP SDK under Bun and bundles the CLI to check its imports resolve, without running it |

The executable uses stdout for the MCP JSON-RPC protocol. If you add diagnostic logging, send it to **stderr**, never stdout.

This project is not affiliated with DeepWiki or Devin.
