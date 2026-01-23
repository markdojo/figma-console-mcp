# Figma Console MCP Server

[![MCP](https://img.shields.io/badge/MCP-Compatible-blue)](https://modelcontextprotocol.io/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Fork with enhanced library variable support** - This fork focuses on **Local Mode** improvements, specifically 100% reliable ID resolution for library variables. For **Remote Mode** (Cloudflare Workers), use the [original repository](https://github.com/southleft/figma-console-mcp).

> **Model Context Protocol server** that provides AI assistants with **real-time console access, visual debugging, design system extraction, and design creation** for Figma.

## What is this?

Figma Console MCP connects AI assistants (like Claude) to Figma, enabling:

- **🐛 Plugin debugging** - Capture console logs, errors, and stack traces
- **📸 Visual debugging** - Take screenshots for context
- **🎨 Design system extraction** - Pull variables, components, and styles
- **✏️ Design creation** - Create UI components, frames, and layouts directly in Figma
- **🔧 Variable management** - Create, update, rename, and delete design tokens
- **⚡ Real-time monitoring** - Watch logs as plugins execute
- **🔄 Local Mode with enhanced library variables** - This fork focuses on Local Git installation with improved library variable support

---

## ⚡ Quick Start

> **⚠️ Important:** This fork's improvements (100% reliable library variable ID resolution) **only work in Local Mode**. For Remote Mode (Cloudflare Workers/SSE), use the [original repository](https://github.com/southleft/figma-console-mcp).

### Choose Your Installation Method

This fork supports **Local Mode only** with enhanced library variable support:

| Method | Setup | Auth | Best For |
|--------|-------|------|----------|
| **[Local Git](#for-plugin-developers-local-mode)** | git clone (15 min) | None* | ✅ **This fork - Enhanced library variables** |

*No API token needed for `figma_get_library_variables` (uses Desktop Bridge plugin)

**For Remote Mode or NPX:** Use the [original repository](https://github.com/southleft/figma-console-mcp) which provides Remote SSE (OAuth, zero-setup) and NPX package distribution.

---

### For Plugin Developers: Local Mode (This Fork)

**This fork is optimized for Local Mode** with enhanced library variable support:

**Use this fork if you:**
- ✅ Need **100% reliable ID resolution for library variables** (this fork's main improvement)
- ✅ Are creating aliases to library variables and need reliable IDs
- ✅ Are developing Figma plugins (need zero-latency console debugging)
- ✅ Need variables WITHOUT Enterprise plan (via Desktop Bridge plugin)
- ✅ Need reliable component descriptions (Figma API has bugs, plugin bypasses them)
- ✅ Want direct access to Figma Desktop state

**⚠️ Important:** The **Desktop Bridge plugin ONLY works in Local Mode**. Remote mode cannot access it because the plugin requires direct connection to Figma Desktop via `localhost:9222`.

**Setup time:** 10-15 minutes

---

### For Plugin Developers: Local Mode (This Fork)

**This fork is optimized for Local Mode with enhanced library variable support:**

**Use this fork if you:**
- ✅ Need **100% reliable ID resolution for library variables** (this fork's main improvement)
- ✅ Are creating aliases to library variables and need reliable IDs
- ✅ Are developing Figma plugins (need zero-latency console debugging)
- ✅ Need variables WITHOUT Enterprise plan (via Desktop Bridge plugin)
- ✅ Need reliable component descriptions (Figma API has bugs, plugin bypasses them)
- ✅ Want direct access to Figma Desktop state

**⚠️ Important:** The **Desktop Bridge plugin ONLY works in Local Mode**. Remote mode cannot access it because the plugin requires direct connection to Figma Desktop via `localhost:9222`.

**Setup time:** 10-15 minutes

#### Prerequisites
- Node.js 18+ installed
- Figma Desktop installed
- Git installed
- Terminal/command line access

#### Step 1: Install the MCP Server

```bash
# Clone the repository
git clone https://github.com/markdojo/figma-console-mcp.git
cd figma-console-mcp

# Install dependencies
npm install

# Build for local mode
npm run build:local
```

#### Step 2: Configure Claude Desktop

> **💡 No API Token Required!** The `figma_get_library_variables` tool (this fork's main improvement) uses the Desktop Bridge plugin and **does NOT require a Figma API token**. However, if you want to use other tools that access Figma files via URL (like `figma_get_variables`), you'll need a token. See [Optional: Get API Token](#optional-step-get-figma-api-token) below.

**macOS:** Edit `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** Edit `%APPDATA%\Claude\claude_desktop_config.json`

Add this configuration:

```json
{
  "mcpServers": {
    "figma-console-local": {
      "command": "node",
      "args": ["/absolute/path/to/figma-console-mcp/dist/local.js"]
    }
  }
}
```

**Important:**
- Replace `/absolute/path/to/figma-console-mcp` with the actual absolute path where you cloned the repo
- Use forward slashes `/` even on Windows
- **No API token needed** for `figma_get_library_variables` (uses Desktop Bridge plugin)

**Optional:** Only needed for REST API tools (like `figma_get_variables` for remote files). Your main tool `figma_get_library_variables` works without a token. If you need REST API access, add:

```json
{
  "mcpServers": {
    "figma-console-local": {
      "command": "node",
      "args": ["/absolute/path/to/figma-console-mcp/dist/local.js"],
      "env": {
        "FIGMA_ACCESS_TOKEN": "figd_YOUR_TOKEN_HERE"
      }
    }
  }
}
```

#### Step 3: Launch Figma Desktop with Remote Debugging

**⚠️ CRITICAL:** Quit Figma completely first, then restart it with the debug flag:

**macOS:**
```bash
open -a "Figma" --args --remote-debugging-port=9222
```

**Windows (CMD or PowerShell):**
```
cmd /c "%LOCALAPPDATA%\Figma\Figma.exe" --remote-debugging-port=9222
```

#### Step 4: Restart Claude Desktop

Quit Claude Desktop completely and relaunch it. The MCP server will connect automatically.

#### Step 5: Verify Setup

1. **Check debug port is working:**
   - Open Chrome browser
   - Visit: http://localhost:9222
   - You should see inspectable Figma pages

2. **Test in Claude Desktop:**
   - Look for 🔌 icon showing "figma-console-local: connected"
   - Ask Claude: "Check Figma status"
   - Should show: "✅ Figma Desktop connected"

**📖 For more details:** See [Complete Setup Guide](docs/SETUP.md)

#### Optional: Figma API Token (Only for REST API Tools)

**⚠️ Not needed for `figma_get_library_variables`!** This fork's main feature uses Desktop Bridge plugin (no token required).

**Only add a token if you want to use REST API tools** like:
- `figma_get_variables` (for accessing files via URL)
- `figma_get_file_data` (for remote file access)
- `figma_get_component` (for remote component access)

**To add token (optional):**
1. Visit https://www.figma.com/developers/api#access-tokens
2. Generate a token
3. Add it to your Claude Desktop config as shown in Step 2 above

---

> **💡 For Remote Mode (Cloudflare Workers/SSE):** This fork's improvements only work in Local Mode. For Remote Mode with OAuth, use the [original repository](https://github.com/southleft/figma-console-mcp).

---

## 📊 Installation Method Comparison

| Feature | Remote SSE (Original) | Local Git (This Fork) |
|---------|----------------------|----------------------|
| **Setup** | 2 minutes | 15 minutes |
| **Prerequisites** | None | Figma restart + git |
| **Authentication** | OAuth (automatic) | None* (Desktop Bridge) |
| **Console logs** | ✅ | ✅ (zero latency) |
| **API access** | ✅ | ✅ |
| **Desktop Bridge plugin** | ❌ | ✅ |
| **AI-Assisted Design Creation** | ❌ | ✅ (via plugin) |
| **Variables (no Enterprise)** | ❌ | ✅ (via plugin, no token needed) |
| **Library Variables (100% IDs)** | ❌ | ✅ (this fork's improvement) |
| **Reliable descriptions** | ⚠️ (API bugs) | ✅ (via plugin) |
| **Source code access** | ❌ | ✅ |
| **Distribution** | URL | git clone |

**📖 [Complete Feature Comparison](docs/MODE_COMPARISON.md)**

---

## 🎯 Test Your Connection

After setup, try these prompts:

**Basic test (both modes):**
```
Navigate to https://www.figma.com and check status
```

**Design system test (requires auth):**
```
Get design variables from [your Figma file URL]
```

**Plugin test (Local Mode only):**
```
Show me the primary font for [your theme name]
```

---

## 🔐 Authentication

### Remote Mode - OAuth (Automatic)

When you first use design system tools:
1. Browser opens automatically to Figma authorization page
2. Click "Allow" to authorize (one-time)
3. Token stored securely and refreshed automatically
4. Works with Free, Pro, and Enterprise Figma plans

### Local Mode - Personal Access Token (Manual)

1. Visit https://www.figma.com/developers/api#access-tokens
2. Generate token
3. Add to MCP config as `FIGMA_ACCESS_TOKEN` environment variable

---

## 🛠️ Available Tools

### Navigation & Status
- `figma_navigate` - Open Figma URLs
- `figma_get_status` - Check connection status

### Console Debugging
- `figma_get_console_logs` - Retrieve console logs
- `figma_watch_console` - Real-time log streaming
- `figma_clear_console` - Clear log buffer
- `figma_reload_plugin` - Reload current page

### Visual Debugging
- `figma_take_screenshot` - Capture UI screenshots

### Design System Extraction
- `figma_get_variables` - Extract design tokens/variables
- `figma_get_component` - Get component data (metadata or reconstruction spec)
- `figma_get_component_for_development` - Component + image
- `figma_get_component_image` - Just the image
- `figma_get_styles` - Color, text, effect styles
- `figma_get_file_data` - Full file structure
- `figma_get_file_for_plugin` - Optimized file data

### ✏️ Design Creation (Local Mode + Desktop Bridge)
- `figma_execute` - **Power tool**: Run any Figma Plugin API code to create designs
  - Create frames, shapes, text, components
  - Apply auto-layout, styles, effects
  - Build complete UI mockups programmatically

### 🔧 Variable Management (Local Mode + Desktop Bridge)
- `figma_create_variable_collection` - Create new variable collections with modes
- `figma_create_variable` - Create COLOR, FLOAT, STRING, or BOOLEAN variables
- `figma_update_variable` - Update variable values in specific modes
- `figma_rename_variable` - Rename variables while preserving values
- `figma_delete_variable` - Delete variables
- `figma_delete_variable_collection` - Delete collections and all their variables
- `figma_add_mode` - Add modes to collections (e.g., "Dark", "Mobile")
- `figma_rename_mode` - Rename existing modes

#### ⚡ Batch Variable Operations (High Performance)

These tools dramatically reduce API calls and execution time for syncing large sets of variables (e.g., design tokens):

- `figma_batch_create_variables` - Create multiple variables in one call (13 variables → 1 call instead of 13 calls)
- `figma_batch_update_variables` - Update 50+ variable values across modes in one call (2431 updates → ~50 calls instead of 2431 calls)
- `figma_validate_variable_sync` - Pre-flight validation to catch errors before execution (checks for conflicts, missing modes, type mismatches)
- `figma_check_variables_exist` - Check which variables exist to enable smart sync (determine create vs update operations)

**Performance Impact:**
- **Before:** 2444+ individual calls, 10-15 minutes execution time
- **After:** ~53 batch calls, under 1 minute execution time
- **Improvement:** 98% reduction in API calls, 98% reduction in time

**Example Usage:**

<details>
<summary>Batch Create Variables</summary>

```json
{
  "collectionId": "VariableCollectionId:123:456",
  "variables": [
    {
      "name": "Border/action/primary",
      "type": "COLOR",
      "valuesByMode": {
        "123:0": "#FF0000",
        "123:1": "#00FF00"
      },
      "description": "Primary action border color"
    },
    {
      "name": "Border/action/secondary",
      "type": "COLOR",
      "valuesByMode": {
        "123:0": "#0000FF",
        "123:1": "#FFFF00"
      }
    }
  ],
  "options": { "atomic": true }
}
```
</details>

<details>
<summary>Batch Update Variables</summary>

```json
{
  "updates": [
    {
      "variableId": "VariableID:123:456",
      "modeId": "123:0",
      "value": "#FF0000"
    },
    {
      "variableId": "VariableID:123:457",
      "modeId": "123:0",
      "value": { "type": "VARIABLE_ALIAS", "id": "VariableID:789:012" }
    }
  ],
  "options": { "continueOnError": true }
}
```
</details>

<details>
<summary>Validate Variable Sync</summary>

```json
{
  "collectionName": "brand-semantic",
  "variables": [
    {
      "name": "Border/action/primary",
      "type": "COLOR",
      "modes": ["Default", "Light", "Dark"],
      "action": "update"
    }
  ]
}
```
</details>

<details>
<summary>Check Variables Exist</summary>

```json
{
  "collectionName": "brand-semantic",
  "variableNames": ["Border/action/primary", "Surface/decorative/blue"]
}
```
</details>

**💡 Creating Aliases to Library Variables:** To create variables that alias to variables from published libraries (e.g., primitive tokens), use `figma_execute` with the pattern documented in [TOOLS.md](docs/TOOLS.md#creating-aliases-to-library-variables). Library variable IDs have a special format that requires using `getVariableByIdAsync()` to resolve them correctly.

**📖 [Detailed Tool Documentation](docs/TOOLS.md)**

---

## 📖 Example Prompts

### Plugin Debugging
```
Navigate to my Figma plugin and show me any console errors
Watch the console for 30 seconds while I test my plugin
Get the last 20 console logs
```

### Design System Extraction
```
Get all design variables from https://figma.com/design/abc123
Extract color styles and show me the CSS exports
Get the Button component with a visual reference image
Get the Badge component in reconstruction format for programmatic creation
```

### Design Creation (Local Mode)
```
Create a success notification card with a checkmark icon and message
Design a button component with hover and disabled states
Build a navigation bar with logo, menu items, and user avatar
Create a modal dialog with header, content area, and action buttons
```

### Variable Management (Local Mode)
```
Create a new color collection called "Brand Colors" with Light and Dark modes
Add a primary color variable with value #3B82F6 for Light and #60A5FA for Dark
Rename the "Default" mode to "Light Theme"
Add a "High Contrast" mode to the existing collection
```

### Visual Debugging
```
Take a screenshot of the current Figma canvas
Navigate to this file and capture what's on screen
```

**📖 [More Use Cases & Examples](docs/USE_CASES.md)**

---

## 🎨 AI-Assisted Design Creation

> **⚠️ Local Mode Only:** This feature requires the Desktop Bridge plugin and only works with [Local Mode installation](#for-plugin-developers-local-mode). Remote Mode is read-only and cannot create or modify designs.

One of the most powerful capabilities of this MCP server is the ability to **design complete UI components and pages directly in Figma through natural language conversation** with any MCP-compatible AI assistant like Claude Desktop or Claude Code.

### What's Possible

**Create original designs from scratch:**
```
Design a login card with email and password fields, a "Forgot password?" link,
and a primary Sign In button. Use 32px padding, 16px border radius, and subtle shadow.
```

**Leverage existing component libraries:**
```
Build a dashboard header using the Avatar component for the user profile,
Button components for actions, and Badge components for notifications.
```

**Generate complete page layouts:**
```
Create a settings page with a sidebar navigation, a main content area with form fields,
and a sticky footer with Save and Cancel buttons.
```

### How It Works

1. **You describe what you want** in plain English
2. **The AI searches your component library** using `figma_search_components` to find relevant building blocks
3. **Components are instantiated** with proper variants and properties via `figma_instantiate_component`
4. **Custom elements are created** using the full Figma Plugin API via `figma_execute`
5. **Visual validation** automatically captures screenshots and iterates until the design looks right

### Who Benefits

| Role | Use Case |
|------|----------|
| **Designers** | Rapidly prototype ideas without manual frame-by-frame construction. Explore variations quickly by describing changes. |
| **Developers** | Generate UI mockups during planning discussions. Create visual specs without switching to design tools. |
| **Product Managers** | Sketch out feature concepts during ideation. Communicate visual requirements directly to stakeholders. |
| **Design System Teams** | Test component flexibility by generating compositions. Identify gaps in component coverage. |
| **Agencies** | Speed up initial concept delivery. Iterate on client feedback in real-time during calls. |

### Example Workflows

**Brand New Design:**
> "Create a notification toast with an icon on the left, title and description text, and a dismiss button. Use our brand colors."

The AI creates custom frames, applies your design tokens, and builds the component from scratch.

**Component Composition:**
> "Build a user profile card using the Avatar component (large size), two Button components (Edit Profile and Settings), and a Badge for the user's status."

The AI searches your library, finds the exact components, and assembles them with proper spacing and alignment.

**Design Iteration:**
> "The spacing feels too tight. Increase the gap between sections to 24px and make the heading larger."

The AI modifies the existing design, takes a screenshot to verify, and continues iterating until you're satisfied.

### Visual Validation

The AI automatically follows a validation workflow after creating designs:

1. **Create** → Execute the design code
2. **Screenshot** → Capture the result
3. **Analyze** → Check alignment, spacing, and visual balance
4. **Iterate** → Fix any issues detected
5. **Verify** → Final screenshot to confirm

This ensures designs aren't just technically correct—they *look* right.

---

## 🎨 Desktop Bridge Plugin (Local Mode Only)

The **Figma Desktop Bridge** plugin enables powerful capabilities:

### Read Operations
- ✅ Variables without Enterprise API
- ✅ Reliable component descriptions (bypasses API bugs)
- ✅ Multi-mode support (Light/Dark/Brand variants)

### Write Operations
- ✅ **Design Creation** - Create frames, shapes, text, components via `figma_execute`
- ✅ **Variable Management** - Full CRUD operations on variables and collections
- ✅ **Mode Management** - Add and rename modes for multi-theme support

**⚠️ Plugin Limitation:** Only works in Local Mode. Remote mode cannot access it.

**Setup:**
1. Install Local Mode MCP
2. Download plugin from [Releases](https://github.com/markdojo/figma-console-mcp/releases/latest)
3. Import plugin: Figma Desktop → Plugins → Development → Import plugin from manifest
4. Run plugin in your Figma file
5. Ask Claude: "Create a button component" or "Show me the design variables"

**📖 [Desktop Bridge Documentation](figma-desktop-bridge/README.md)**

---

## 🚀 Advanced Topics

- **[Setup Guide](docs/SETUP.md)** - Complete setup guide for all MCP clients
- **[Self-Hosting](docs/SELF_HOSTING.md)** - Deploy your own instance on Cloudflare
- **[Architecture](docs/ARCHITECTURE.md)** - How it works under the hood
- **[OAuth Setup](docs/OAUTH_SETUP.md)** - Configure OAuth for self-hosted deployments
- **[Troubleshooting](docs/TROUBLESHOOTING.md)** - Common issues and solutions

---

## 🤝 vs. Figma Official MCP

**Figma Console MCP (This Project)** - Debugging & data extraction
- ✅ Real-time console logs from Figma plugins
- ✅ Screenshot capture and visual debugging
- ✅ Error stack traces and runtime monitoring
- ✅ Raw design data extraction (JSON)
- ✅ Works remotely or locally

**Figma Official Dev Mode MCP** - Code generation
- ✅ Generates React/HTML code from designs
- ✅ Tailwind/CSS class generation
- ✅ Component boilerplate scaffolding

**Use both together** for the complete workflow: generate code with Official MCP, then debug and extract data with Console MCP.

---

## 🛤️ Roadmap

- [ ] **Real-time collaboration** - Multi-user debugging sessions
- [ ] **Component screenshot diffs** - Visual regression testing
- [ ] **Batch operations** - Process multiple files at once
- [ ] **Design linting** - Automated compliance checks
- [ ] **Plugin template generation** - Generate plugin boilerplate

**📖 [Full Roadmap](docs/ROADMAP.md)**

---

## 💻 Development

```bash
git clone https://github.com/markdojo/figma-console-mcp.git
cd figma-console-mcp
npm install

# Local mode development
npm run dev:local

# Cloud mode development
npm run dev

# Build
npm run build
```

**📖 [Development Guide](docs/ARCHITECTURE.md)**

---

## 📄 License

MIT - See [LICENSE](LICENSE) file for details.

---

## 🔗 Links

- 📖 [Full Documentation](docs/)
- 🐛 [Report Issues](https://github.com/markdojo/figma-console-mcp/issues)
- 💬 [Discussions](https://github.com/markdojo/figma-console-mcp/discussions)

---

## 🙏 Credits & Acknowledgments

This project is a fork of [figma-console-mcp](https://github.com/southleft/figma-console-mcp) by [southleft](https://github.com/southleft).

### When to Use This Fork vs Original

**Use this fork if:**
- ✅ You need **Local Mode** with enhanced library variable support
- ✅ You're creating aliases to library variables and need 100% reliable IDs
- ✅ You're developing plugins and need the Desktop Bridge plugin features

**Use the [original repository](https://github.com/southleft/figma-console-mcp) if:**
- ✅ You need **Remote Mode** (Cloudflare Workers/SSE with OAuth)
- ✅ You want zero-setup via Remote SSE endpoint
- ✅ You don't need the enhanced library variable features

**Original Project:**
- Repository: https://github.com/southleft/figma-console-mcp
- License: MIT

**Improvements in this fork:**
- ✅ 100% reliable ID resolution for library variables via `importVariableByKeyAsync`
- ✅ Enhanced method tracking and summary statistics
- ✅ Removed ineffective code paths for cleaner implementation
- ⚠️ **Local Mode only** - Remote Mode improvements not included

We're grateful to the original maintainers for building this excellent MCP server!
- 🌐 [Model Context Protocol](https://modelcontextprotocol.io/)
- 🎨 [Figma API](https://www.figma.com/developers/api)
