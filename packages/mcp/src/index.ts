#!/usr/bin/env node
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs-extra";
import path from "path";
import {
  detectPackageManager,
  fetchComponent,
  fetchIndex,
  getUsageExample,
  installCommandFor,
  installComponents,
  installNpmDependencies,
  listInstalledComponents,
} from "./install.js";

async function reportNpmInstall(
  projectRoot: string,
  dependencies: string[],
): Promise<string> {
  if (dependencies.length === 0) return "";

  const result = await installNpmDependencies(projectRoot, dependencies);

  if (result.error) {
    const pm = detectPackageManager(projectRoot);
    const { command, args } = installCommandFor(pm);
    return (
      `## NPM Dependencies\n\n` +
      `Automatic install failed (${result.error}). Install manually:\n\n` +
      `\`\`\`bash\n${command} ${args.join(" ")} ${dependencies.join(" ")}\n\`\`\`\n\n`
    );
  }

  if (result.installed.length === 0) {
    return `## NPM Dependencies\n\nAll required packages (${dependencies.join(", ")}) were already installed.\n\n`;
  }

  return `## NPM Dependencies\n\nInstalled: ${result.installed.join(", ")}\n\n`;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8"),
) as { version: string };

function findProjectRoot(startDir: string): string | null {
  let dir = startDir;
  while (dir !== path.parse(dir).root) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir;
    }
    dir = path.dirname(dir);
  }
  return null;
}

const server = new McpServer({
  name: "bearnie",
  version: pkg.version,
});

server.tool(
  "list_components",
  "List all available Bearnie UI components with their descriptions and categories",
  {},
  async () => {
    const index = await fetchIndex();
    if (!index) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not fetch component registry. Please check your internet connection.",
          },
        ],
      };
    }

    const grouped = index.components.reduce(
      (acc, comp) => {
        if (!acc[comp.category]) acc[comp.category] = [];
        acc[comp.category].push(comp);
        return acc;
      },
      {} as Record<string, typeof index.components>,
    );

    let output = "# Available Bearnie Components\n\n";
    for (const [category, components] of Object.entries(grouped).sort()) {
      output += `## ${
        category.charAt(0).toUpperCase() + category.slice(1)
      }\n\n`;
      for (const comp of components) {
        output += `- **${comp.name}**: ${comp.description}\n`;
      }
      output += "\n";
    }

    return {
      content: [{ type: "text", text: output }],
    };
  },
);

server.tool(
  "get_component",
  "Get detailed information about a specific Bearnie component including its files and dependencies",
  {
    name: z
      .string()
      .describe(
        "The name of the component (e.g., 'button', 'accordion', 'dialog', 'barrel')",
      ),
  },
  async ({ name }) => {
    const component = await fetchComponent(name.toLowerCase());
    if (!component) {
      return {
        content: [
          {
            type: "text",
            text: `Error: Component '${name}' not found. Use list_components to see available components.`,
          },
        ],
      };
    }

    let output = `# ${component.name}\n\n`;
    output += `**Description:** ${component.description}\n`;
    if (component.category) {
      output += `**Category:** ${component.category}\n`;
    }
    if (component.type === "utility") {
      output += `**Type:** Utility\n`;
    }
    output += "\n";

    if (component.dependencies?.length) {
      output += `**NPM Dependencies:** ${component.dependencies.join(", ")}\n\n`;
    }

    if (component.registryDependencies?.length) {
      output += `**Required Registry Dependencies:** ${component.registryDependencies.join(
        ", ",
      )}\n\n`;
    }

    output += `## Files\n\n`;
    for (const file of component.files) {
      const ext = file.name.endsWith(".ts") ? "typescript" : "astro";
      output += `### ${file.path || file.name}\n\n\`\`\`${ext}\n${file.content}\n\`\`\`\n\n`;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  },
);

server.tool(
  "add_component",
  "Add a Bearnie component to the current Astro project. Creates files in src/components/bearnie/. Add the barrel export last with name 'barrel' after other components are installed.",
  {
    name: z
      .string()
      .describe(
        "The name of the component to add (e.g., 'button', 'accordion')",
      ),
    cwd: z
      .string()
      .optional()
      .describe("The working directory (defaults to current directory)"),
  },
  async ({ name, cwd }) => {
    const workingDir = cwd || process.cwd();
    const projectRoot = findProjectRoot(workingDir);

    if (!projectRoot) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find project root (no package.json found). Make sure you're in an Astro project.",
          },
        ],
      };
    }

    const result = await installComponents(projectRoot, [name.toLowerCase()]);
    if (result.errors.length > 0) {
      return {
        content: [
          {
            type: "text",
            text: `Error: ${result.errors.join(", ")}`,
          },
        ],
      };
    }

    const component = await fetchComponent(name.toLowerCase());
    let output = `# Added ${name}\n\n`;
    output += result.installed.map((item) => `✓ Added: ${item}`).join("\n");
    output += "\n\n";

    if (name.toLowerCase() === "barrel") {
      output +=
        "Add components first, then install the barrel for named imports from `@/components/bearnie`.\n\n";
    }

    output += await reportNpmInstall(projectRoot, result.npmDependencies);

    if (component) {
      output += `## Usage\n\n`;
      output += getUsageExample(component);
    }

    return {
      content: [{ type: "text", text: output }],
    };
  },
);

server.tool(
  "add_components",
  "Add multiple Bearnie components to the current Astro project. Resolves registry dependencies and installs barrel last when included.",
  {
    names: z
      .array(z.string())
      .describe(
        "Component names to add (e.g., ['button', 'card', 'barrel'])",
      ),
    cwd: z
      .string()
      .optional()
      .describe("The working directory (defaults to current directory)"),
  },
  async ({ names, cwd }) => {
    const workingDir = cwd || process.cwd();
    const projectRoot = findProjectRoot(workingDir);

    if (!projectRoot) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find project root (no package.json found). Make sure you're in an Astro project.",
          },
        ],
      };
    }

    const normalized = names.map((name) => name.toLowerCase());
    const result = await installComponents(projectRoot, normalized);

    let output = `# Added components\n\n`;
    if (result.installed.length > 0) {
      output += result.installed.map((item) => `✓ Added: ${item}`).join("\n");
      output += "\n\n";
    }

    if (result.errors.length > 0) {
      output += `## Errors\n\n${result.errors.map((error) => `- ${error}`).join("\n")}\n\n`;
    }

    if (normalized.includes("barrel")) {
      output +=
        "Barrel installed last for named imports from `@/components/bearnie`.\n\n";
    }

    output += await reportNpmInstall(projectRoot, result.npmDependencies);

    return {
      content: [{ type: "text", text: output }],
    };
  },
);

server.tool(
  "list_installed",
  "List Bearnie components already installed in the project and whether each is up to date with the registry. Use add_component to update a modified or incomplete component (it overwrites local files with the registry version).",
  {
    cwd: z
      .string()
      .optional()
      .describe("The working directory (defaults to current directory)"),
  },
  async ({ cwd }) => {
    const workingDir = cwd || process.cwd();
    const projectRoot = findProjectRoot(workingDir);

    if (!projectRoot) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not find project root (no package.json found). Make sure you're in an Astro project.",
          },
        ],
      };
    }

    const installed = await listInstalledComponents(projectRoot);
    if (installed === null) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not fetch component registry.",
          },
        ],
      };
    }

    if (installed.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: "No Bearnie components are installed in this project yet. Use add_component to install one.",
          },
        ],
      };
    }

    const statusLabel = {
      "up-to-date": "up to date",
      modified: "modified locally",
      incomplete: "missing files",
    } as const;

    let output = `# Installed Bearnie components (${installed.length})\n\n`;
    for (const item of installed) {
      output += `- **${item.name}** (${item.type}): ${statusLabel[item.status]}`;
      if (item.changedFiles.length > 0) {
        output += ` — ${item.changedFiles.join(", ")}`;
      }
      output += "\n";
    }

    const outdated = installed.filter((item) => item.status !== "up-to-date");
    if (outdated.length > 0) {
      output += `\nTo update a component to the latest registry version, run add_component with its name (this overwrites local changes).\n`;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  },
);

server.tool(
  "search_components",
  "Search for Bearnie components by name, description, or category",
  {
    query: z
      .string()
      .describe(
        "Search query (matches against name, description, and category)",
      ),
  },
  async ({ query }) => {
    const index = await fetchIndex();
    if (!index) {
      return {
        content: [
          {
            type: "text",
            text: "Error: Could not fetch component registry.",
          },
        ],
      };
    }

    const q = query.toLowerCase();
    const matches = index.components.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q),
    );

    if (matches.length === 0) {
      return {
        content: [
          {
            type: "text",
            text: `No components found matching '${query}'. Use list_components to see all available components.`,
          },
        ],
      };
    }

    let output = `# Search Results for '${query}'\n\n`;
    for (const comp of matches) {
      output += `- **${comp.name}** (${comp.category}): ${comp.description}\n`;
    }

    return {
      content: [{ type: "text", text: output }],
    };
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Bearnie MCP server running on stdio");
}

main().catch(console.error);
