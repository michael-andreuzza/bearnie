import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";

const components = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/components" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tagline: z.string().optional(),
    category: z.enum([
      "form",
      "layout",
      "navigation",
      "feedback",
      "disclosure",
      "display",
    ]),
    status: z.enum(["stable", "beta", "experimental"]).default("stable"),
    order: z.number().optional(),
  }),
});
const docs = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/docs" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    tagline: z.string().optional(),
    order: z.number().optional(),
  }),
});
const legal = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/legal" }),
  schema: z.object({
    page: z.string(),
    pubDate: z.coerce.date(),
  }),
});
export const collections = {
  components,
  docs,
  legal,
};
