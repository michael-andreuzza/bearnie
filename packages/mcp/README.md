# Bearnie MCP Server

An MCP (Model Context Protocol) server that enables AI assistants like Claude, GitHub Copilot, and others to interact with the Bearnie UI component library.

## Features

- **List Components**: Browse all available Bearnie components (including the barrel export)
- **Search Components**: Find components by name, description, or category
- **Get Component Details**: View component source code and dependencies
- **Add Components**: Install components directly to your Astro project

## Installation

```bash
npm install -g @bearnie/mcp
```

Or use npx:

```bash
npx @bearnie/mcp
```

## Configuration

### VS Code (GitHub Copilot)

Add to your VS Code settings or `.vscode/mcp.json`:

```json
{
  "mcpServers": {
    "bearnie": {
      "command": "npx",
      "args": ["@bearnie/mcp"]
    }
  }
}
```

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "bearnie": {
      "command": "npx",
      "args": ["@bearnie/mcp"]
    }
  }
}
```

### Cursor

Add to your Cursor MCP settings:

```json
{
  "mcpServers": {
    "bearnie": {
      "command": "npx",
      "args": ["@bearnie/mcp"]
    }
  }
}
```

## Available Tools

### `list_components`

Lists all available Bearnie components grouped by category.

**Example prompt:** "What Bearnie components are available?"

### `search_components`

Search for components by name, description, or category.

**Parameters:**

- `query` (string): Search term

**Example prompt:** "Find Bearnie components for forms"

### `get_component`

Get detailed information about a specific component, including its source code.

**Parameters:**

- `name` (string): Component name (e.g., "button", "accordion", "barrel")

**Example prompt:** "Show me the Bearnie button component"

### `add_component`

Add a component to your Astro project. Creates files in `src/components/bearnie/`, utilities in `src/utils/`, and styles in `src/styles/`.

**Parameters:**

- `name` (string): Component name to add
- `cwd` (string, optional): Working directory

**Example prompts:**

- "Add the accordion component to my project"
- "Add the barrel export for named imports"

Install components first, then add `barrel` last for `import { Button, Card } from "@/components/bearnie"`.

### `add_components`

Add multiple components in one step. Resolves registry dependencies and installs `barrel` last when included.

**Parameters:**

- `names` (string[]): Component names to add
- `cwd` (string, optional): Working directory

**Example prompt:** "Add button, card, and barrel to my project"

### `list_installed`

List the Bearnie components already installed in the project, and whether each one is up to date with the registry, modified locally, or missing files. To update an outdated component, run `add_component` with its name (this overwrites local files with the registry version).

Styles are compared against the theme recorded in `bearnie.json` (`default` or any Tailwind accent color, e.g. `blue`, `rose`, `emerald`). Installing a theme entry such as `styles-blue` via `add_component` switches the theme and updates `bearnie.json`.

**Parameters:**

- `cwd` (string, optional): Working directory

**Example prompts:**

- "Which Bearnie components does this project use?"
- "Are my Bearnie components up to date?"

## Dependency Installation

When a component needs npm packages, the server installs them automatically using your project's package manager, detected from the lockfile (npm, pnpm, yarn, or bun). It also respects custom directories from `bearnie.json` if present.

## Environment Variables

| Variable | Description |
| -------- | ----------- |
| `BEARNIE_REGISTRY_URL` | Override the default registry URL (default: `https://bearnie.dev/registry`) |
| `BEARNIE_REGISTRY_PATH` | Local file path to registry (for development) |

## Development

From the monorepo root:

```bash
npm install
npm run build:packages
```

Test with a local registry:

```bash
BEARNIE_REGISTRY_PATH=./public/registry npx @bearnie/mcp
```

## License

MIT
