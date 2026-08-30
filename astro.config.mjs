import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import mdx from "@astrojs/mdx";
import { shikiLightTheme, shikiDarkTheme } from "./src/config/shiki-themes";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
  markdown: {
    shikiConfig: {
      themes: {
        light: shikiLightTheme,
        dark: shikiDarkTheme,
      },
      defaultColor: false,
    },
  },
  site: "https://bearnie.dev",
  integrations: [
    sitemap({
      // Internal design-system pages shouldn't compete in search results
      filter: (page) => !page.includes("/system/"),
    }),
    mdx(),
  ],
});
