import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { siteConfig } from "@/config/site";

/**
 * llms-full.txt — the full documentation as one plain-text file for AI
 * assistants, generated from the same MDX content the site renders.
 */

// Strip MDX plumbing (imports and layout-only JSX wrappers) but keep prose,
// headings, and fenced code examples, which is what an LLM needs.
function cleanMdx(body: string): string {
  const out: string[] = [];
  let inImport = false;
  for (const line of body.split("\n")) {
    const trimmed = line.trim();
    if (inImport) {
      // Multi-line import: skip until the closing `from "..."` line
      if (/from\s+["'].*["'];?$/.test(trimmed)) inImport = false;
      continue;
    }
    if (/^import\s/.test(trimmed)) {
      if (!/from\s+["'].*["'];?$/.test(trimmed)) inImport = true;
      continue;
    }
    if (/^<\/?(Prose|ComponentPreview|Fragment|InstallTabs|DocsTabs)[\s>]?/.test(trimmed))
      continue;
    out.push(line);
  }
  return out.join("\n").replace(/\n{4,}/g, "\n\n\n").trim();
}

export const GET: APIRoute = async () => {
  const docs = (await getCollection("docs")).sort(
    (a, b) => (a.data.order ?? 999) - (b.data.order ?? 999),
  );
  const components = (await getCollection("components")).sort((a, b) =>
    a.data.title.localeCompare(b.data.title),
  );

  const sections: string[] = [
    `# Bearnie — full documentation

> 50+ accessible, open source components for Astro and Tailwind CSS — the shadcn/ui workflow, built for Astro. Source: ${siteConfig.url}
`,
  ];

  for (const doc of docs) {
    const slug = doc.id === "introduction" ? "" : doc.id;
    sections.push(
      `---\n\n# ${doc.data.title}\n\nURL: ${siteConfig.url}/docs/${slug}\n${doc.data.description}\n\n${cleanMdx(doc.body ?? "")}`,
    );
  }

  for (const c of components) {
    sections.push(
      `---\n\n# ${c.data.title} component\n\nURL: ${siteConfig.url}/docs/components/${c.id}/\n${c.data.description}\nInstall: npx bearnie add ${c.id}\n\n${cleanMdx(c.body ?? "")}`,
    );
  }

  return new Response(sections.join("\n\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
};
