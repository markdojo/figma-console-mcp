# Figma Console MCP - Fork

[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A fork of [southleft/figma-console-mcp](https://github.com/southleft/figma-console-mcp) focused on **local mode** with enhancements for design token synchronization workflows.

## What's Different in This Fork

This fork extends the upstream project with features optimized for **CSS ↔ Figma variable synchronization**:

### New Features

**`outputPath` Parameter** (v1.3.1)
- Added to `figma_get_variables` and `figma_get_library_variables`
- Write large variable datasets directly to JSON files
- Bypasses MCP token limits for design systems with 1000+ variables
- Files integrate directly with token sync tools

```javascript
// Export all variables to a file (no token limits)
figma_get_variables({ outputPath: "/tmp/figma-vars.json" })

// Export library primitives for alias resolution
figma_get_library_variables({ outputPath: "/tmp/figma-library.json" })
```

**Batch Variable Operations** (v1.3.0)
- `figma_batch_create_variables` - Create multiple variables in one call
- `figma_batch_update_variables` - Update 50+ variables per batch (EXPERIMENTAL)
- Reduces sync time from minutes to seconds for large token sets

**Branch URL Support** (v1.3.0)
- `figma_get_variables` now handles Figma branch URLs
- Both path-based (`/branch/{branchKey}`) and query-based (`?branch-id=`) formats

---

## Installation (Local Mode Only)

This fork is local-only. For remote/SSE deployment, use the [upstream project](https://github.com/southleft/figma-console-mcp).

### Prerequisites
- Node.js 18+
- Figma Desktop
- [Figma Personal Access Token](https://www.figma.com/developers/api#access-tokens)

### Setup

```bash
git clone https://github.com/markdojo/figma-console-mcp.git
cd figma-console-mcp
npm install
npm run build:local
```

### Configure Your MCP Client

Add to your MCP config (e.g., `claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "figma-console-local": {
      "command": "node",
      "args": ["/path/to/figma-console-mcp/dist/local.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

### Launch Figma with Debug Port

```bash
# macOS
open -a "Figma" --args --remote-debugging-port=9222

# Windows
cmd /c "%LOCALAPPDATA%\Figma\Figma.exe" --remote-debugging-port=9222
```

---

## Desktop Bridge Plugin

Required for variable management and design creation tools.

1. Download from [Releases](https://github.com/markdojo/figma-console-mcp/releases)
2. Figma → Plugins → Development → Import plugin from manifest
3. Run the plugin in your Figma file

---

## Key Tools

| Tool | Description |
|------|-------------|
| `figma_get_variables` | Extract variables with optional `outputPath` for large exports |
| `figma_get_library_variables` | Get all library primitives with `outputPath` support |
| `figma_batch_create_variables` | Bulk create variables |
| `figma_batch_update_variables` | Bulk update variables (EXPERIMENTAL) |
| `figma_execute` | Run Figma Plugin API code |

**[Full Tool Reference](docs/tools.md)**

---

## Upstream

For complete documentation, remote mode, OAuth setup, and general features, see the upstream project:

- **Upstream Repo:** [github.com/southleft/figma-console-mcp](https://github.com/southleft/figma-console-mcp)
- **Upstream Docs:** [docs.figma-console-mcp.southleft.com](https://docs.figma-console-mcp.southleft.com)

---

## License

MIT - See [LICENSE](LICENSE)
