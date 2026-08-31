import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { siteConfig } from "@/config/site";

/**
 * llms.txt — a machine-readable index of the docs for AI assistants.
 * Spec: https://llmstxt.org
 */
export const GET: APIRoute = async () => {
  const docs = (await getCollection("docs")).sort(
    (a, b) => (a.data.order ?? 999) - (b.data.order ?? 999),
  );
  const components = (await getCollection("components")).sort((a, b) =>
    a.data.title.localeCompare(b.data.title),
  );

  const docLines = docs.map((doc) => {
    const slug = doc.id === "introduction" ? "" : doc.id;
    return `- [${doc.data.title}](${siteConfig.url}/docs/${slug}): ${doc.data.description}`;
  });

  const componentLines = components.map(
    (c) =>
      `- [${c.data.title}](${siteConfig.url}/docs/components/${c.id}/): ${c.data.description}`,
  );

  const text = `# Bearnie

> 50+ accessible, open source components for Astro and Tailwind CSS — the shadcn/ui workflow, built for Astro. One CLI command (\`npx bearnie add <component>\`) copies the source into your project; you own and control the code. Components are plain Astro + vanilla JS: no React, Vue, or Svelte runtime.

Key facts:
- Install: \`npx bearnie init\` scaffolds config, then \`npx bearnie add button dialog ...\`
- New projects: \`npm create bearnie@latest\`
- Update installed components: \`npx bearnie diff\` and \`npx bearnie update\`
- Theming: 160+ color palettes (\`npx bearnie add styles-<base>-<accent>\`)
- MCP server for AI agents: \`@bearnie/mcp\` (tools: list_components, get_component, add_component, list_installed)
- Full docs as plain text: ${siteConfig.url}/llms-full.txt

## Docs

${docLines.join("\n")}
- [Changelog](${siteConfig.url}/docs/changelog/): What's new in every release of the registry, CLI, and MCP server

## Components

${componentLines.join("\n")}

## Source

- [GitHub repository](${siteConfig.links.github}): MIT-licensed source for the site, registry, CLI, create-bearnie, and MCP server
- [Component registry](${siteConfig.url}/registry/index.json): machine-readable registry index
`;

  return new Response(text, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
