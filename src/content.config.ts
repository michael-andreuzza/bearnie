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
const changelog = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/changelog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    date: z.coerce.date(),
    /** Registry/package versions this entry covers, shown as a badge */
    version: z.string().optional(),
    /** Tie-break for entries released on the same day (higher = newer) */
    order: z.number().default(0),
  }),
});
export const collections = {
  components,
  docs,
  changelog,
};
