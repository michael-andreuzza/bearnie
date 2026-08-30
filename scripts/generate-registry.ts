/**
 * Script to generate registry JSON files from existing components
 * Run with: npx tsx scripts/generate-registry.ts
 */
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const COMPONENTS_DIR = path.join(ROOT_DIR, "src/components/ui");
const UTILS_DIR = path.join(ROOT_DIR, "src/utils");
const REGISTRY_DIR = path.join(ROOT_DIR, "public/registry");
const STYLES_PATH = path.join(ROOT_DIR, "src/styles/bearnie.css");
const BARREL_PATH = path.join(ROOT_DIR, "src/components/ui/index.ts");
const TEMPLATE_STYLES_PATH = path.join(
  ROOT_DIR,
  "packages/create-bearnie/template/src/styles/bearnie.css",
);

// Utility metadata
const UTILITY_META: Record<
  string,
  {
    description: string;
    file: string;
    dependencies?: string[];
    registryDependencies?: string[];
  }
> = {
  cn: {
    description: "Class name utility combining clsx and tailwind-merge",
    file: "cn.ts",
    dependencies: ["clsx", "tailwind-merge"],
  },
  "focus-trap": {
    description: "Focus trap utility for modal accessibility",
    file: "focus-trap.ts",
  },
  "ui-runtime-loader": {
    description: "Loads the shared UI runtime once per page",
    file: "runtime/loader.ts",
    registryDependencies: ["ui-runtime-boot"],
  },
  "ui-runtime-boot": {
    description: "Bootstraps interactive UI component behaviors",
    file: "runtime/ui-boot.ts",
    registryDependencies: [
      "ui-runtime-combobox",
      "ui-runtime-command",
      "ui-runtime-dialog",
      "ui-runtime-disclosure-triggers",
      "ui-runtime-dropdown-menu",
      "ui-runtime-popover",
      "ui-runtime-tabs",
    ],
  },
  "ui-runtime-dialog": {
    description: "Shared dialog initialization runtime",
    file: "runtime/dialog.ts",
    registryDependencies: ["focus-trap"],
  },
  "ui-runtime-disclosure-triggers": {
    description: "Shared keyboard trigger handlers for disclosure controls",
    file: "runtime/disclosure-triggers.ts",
  },
  "ui-runtime-dropdown-menu": {
    description: "Shared dropdown menu initialization runtime",
    file: "runtime/dropdown-menu.ts",
    registryDependencies: ["focus-trap"],
  },
  "ui-runtime-popover": {
    description: "Shared popover initialization runtime",
    file: "runtime/popover.ts",
    registryDependencies: ["focus-trap"],
  },
  "ui-runtime-command": {
    description: "Shared command and command dialog initialization runtime",
    file: "runtime/command.ts",
    registryDependencies: ["focus-trap"],
  },
  "ui-runtime-tabs": {
    description: "Shared tabs initialization runtime",
    file: "runtime/tabs.ts",
    registryDependencies: ["focus-trap"],
  },
  "ui-runtime-combobox": {
    description: "Shared combobox initialization runtime",
    file: "runtime/combobox.ts",
  },
};

// Component metadata - defines dependencies and categories
const COMPONENT_META: Record<
  string,
  {
    description: string;
    category: string;
    dependencies?: string[];
    registryDependencies?: string[];
  }
> = {
  icon: {
    description: "Icon renderer and icon data for Hugeicons stroke icons",
    category: "display",
    dependencies: ["@hugeicons/core-free-icons"],
  },
  "theme-toggle": {
    description: "A light/dark theme toggle button",
    category: "theme",
    registryDependencies: ["button"],
  },
  accordion: {
    description:
      "A vertically stacked set of interactive headings that reveal content",
    category: "disclosure",
    registryDependencies: ["focus-trap", "icon"],
  },
  alert: {
    description: "Displays important messages and feedback to users",
    category: "feedback",
  },
  "alert-dialog": {
    description: "A modal dialog for important confirmations",
    category: "disclosure",
    registryDependencies: ["focus-trap", "button"],
  },
  "aspect-ratio": {
    description: "Displays content with a specified aspect ratio",
    category: "layout",
  },
  avatar: {
    description: "An image element with a fallback for representing users",
    category: "display",
  },
  badge: {
    description: "A small status indicator for elements",
    category: "display",
  },
  breadcrumb: {
    description: "Navigation showing the current location within a hierarchy",
    category: "navigation",
    registryDependencies: ["icon"],
  },
  button: {
    description: "A clickable button component with multiple variants",
    category: "form",
  },
  "button-group": {
    description: "Groups related buttons together",
    category: "form",
  },
  card: {
    description: "A container for grouping related content",
    category: "layout",
  },
  carousel: {
    description: "A carousel component built with Keen Slider",
    category: "display",
    dependencies: ["keen-slider"],
    registryDependencies: ["icon"],
  },
  checkbox: {
    description: "A control for toggling between checked and unchecked states",
    category: "form",
    registryDependencies: ["icon"],
  },
  collapsible: {
    description: "A component that can expand and collapse content",
    category: "disclosure",
  },
  command: {
    description: "A command palette for searching and selecting actions",
    category: "navigation",
    registryDependencies: ["icon", "ui-runtime-loader"],
  },
  "context-menu": {
    description: "A menu triggered by right-click",
    category: "navigation",
  },
  dialog: {
    description: "A modal dialog that appears on top of the page",
    category: "disclosure",
    registryDependencies: ["icon", "ui-runtime-loader"],
  },
  "dropdown-menu": {
    description: "A menu that appears when triggered by a button",
    category: "navigation",
    registryDependencies: ["ui-runtime-loader"],
  },
  empty: {
    description: "A placeholder for empty states",
    category: "feedback",
  },
  "file-upload": {
    description: "A file upload component with drag and drop",
    category: "form",
    registryDependencies: ["icon"],
  },
  "hover-card": {
    description: "A card that appears on hover",
    category: "display",
  },
  input: {
    description: "A text input field for forms",
    category: "form",
  },
  "input-group": {
    description: "Groups input with addons",
    category: "form",
  },
  "input-otp": {
    description: "A one-time password input",
    category: "form",
    registryDependencies: ["icon"],
  },
  kbd: {
    description: "Displays keyboard shortcuts",
    category: "display",
  },
  label: {
    description: "An accessible label for form controls",
    category: "form",
  },
  menubar: {
    description: "A horizontal menu bar",
    category: "navigation",
  },
  pagination: {
    description: "Navigation for paginated content",
    category: "navigation",
    registryDependencies: ["icon"],
  },
  popover: {
    description: "Displays floating content when triggered",
    category: "disclosure",
    registryDependencies: ["ui-runtime-loader"],
  },
  progress: {
    description: "Displays progress of a task",
    category: "feedback",
  },
  radio: {
    description: "A set of checkable buttons where only one can be selected",
    category: "form",
  },
  "scroll-area": {
    description: "A scrollable area with custom scrollbars",
    category: "layout",
  },
  select: {
    description: "A dropdown for selecting from a list of options",
    category: "form",
  },
  combobox: {
    description: "A searchable dropdown for selecting one option",
    category: "form",
    registryDependencies: ["command", "popover", "icon", "ui-runtime-loader"],
  },
  separator: {
    description: "A visual divider between content",
    category: "layout",
  },
  sheet: {
    description: "A slide-out panel from the edge of the screen",
    category: "disclosure",
    registryDependencies: ["focus-trap", "icon"],
  },
  sidebar: {
    description: "A collapsible sidebar navigation",
    category: "navigation",
    registryDependencies: ["icon"],
  },
  skeleton: {
    description: "A placeholder for loading content",
    category: "feedback",
  },
  slider: {
    description: "A range input slider",
    category: "form",
  },
  spinner: {
    description: "A loading indicator",
    category: "feedback",
    registryDependencies: ["icon"],
  },
  stepper: {
    description: "A multi-step progress indicator",
    category: "navigation",
    registryDependencies: ["icon"],
  },
  switch: {
    description: "A toggle control for boolean values",
    category: "form",
  },
  table: {
    description: "A responsive table for displaying tabular data",
    category: "display",
  },
  tabs: {
    description: "Organizes content into tabbed sections",
    category: "navigation",
    registryDependencies: ["ui-runtime-loader"],
  },
  textarea: {
    description: "A multi-line text input field",
    category: "form",
  },
  toast: {
    description: "A notification that appears temporarily",
    category: "feedback",
    registryDependencies: ["icon"],
  },
  toggle: {
    description: "A two-state button",
    category: "form",
  },
  tooltip: {
    description: "A popup that displays information on hover or focus",
    category: "display",
    registryDependencies: ["focus-trap"],
  },
  tree: {
    description: "A hierarchical tree view",
    category: "navigation",
    registryDependencies: ["icon"],
  },
};

// Registry aliases: docs/CLI names that map to files in another component folder
const REGISTRY_ALIASES: Record<
  string,
  {
    sourceDir: string;
    description: string;
    category: string;
    includeFiles: (fileName: string) => boolean;
  }
> = {
  "toggle-group": {
    sourceDir: "toggle",
    description: "A group of toggle buttons",
    category: "form",
    includeFiles: (fileName) => fileName.startsWith("ToggleGroup"),
  },
};

async function getComponentFiles(
  componentDir: string
): Promise<{ name: string; path: string; content: string }[]> {
  const files: { name: string; path: string; content: string }[] = [];
  const dirName = path.basename(componentDir);

  const entries = await fs.readdir(componentDir);

  for (const entry of entries) {
    const entryPath = path.join(componentDir, entry);
    const stat = await fs.stat(entryPath);

    if (
      stat.isFile() &&
      (entry.endsWith(".astro") || entry.endsWith(".ts"))
    ) {
      const content = await fs.readFile(entryPath, "utf-8");
      files.push({
        name: entry,
        path: `${dirName}/${entry}`,
        content,
      });
    }
  }

  return files;
}

async function generateRegistryAliases(): Promise<
  { name: string; description: string; category: string }[]
> {
  const entries: { name: string; description: string; category: string }[] =
    [];

  for (const [aliasName, alias] of Object.entries(REGISTRY_ALIASES)) {
    const sourcePath = path.join(COMPONENTS_DIR, alias.sourceDir);
    if (!(await fs.pathExists(sourcePath))) {
      console.log(`⚠️  Skipping alias ${aliasName} - source not found`);
      continue;
    }

    const files = (await getComponentFiles(sourcePath)).filter((file) =>
      alias.includeFiles(file.name),
    );

    if (files.length === 0) {
      console.log(`⚠️  Skipping alias ${aliasName} - no matching files`);
      continue;
    }

    const registryEntry = {
      name: aliasName,
      description: alias.description,
      category: alias.category,
      dependencies: [],
      devDependencies: [],
      registryDependencies: ["cn"],
      files,
    };

    const registryPath = path.join(REGISTRY_DIR, `${aliasName}.json`);
    await fs.writeJson(registryPath, registryEntry, { spaces: 2 });
    console.log(`   ✓ Created ${aliasName}.json (alias)`);

    entries.push({
      name: aliasName,
      description: alias.description,
      category: alias.category,
    });
  }

  return entries;
}

async function generateUtilities(): Promise<
  { name: string; description: string }[]
> {
  console.log("🔧 Generating utility registry...\n");

  const utilities: { name: string; description: string }[] = [];

  for (const [name, meta] of Object.entries(UTILITY_META)) {
    const filePath = path.join(UTILS_DIR, meta.file);
    
    if (!await fs.pathExists(filePath)) {
      console.log(`⚠️  Skipping ${name} - file not found: ${meta.file}`);
      continue;
    }

    const content = await fs.readFile(filePath, "utf-8");

    const registryEntry = {
      name,
      type: "utility",
      description: meta.description,
      dependencies: meta.dependencies || [],
      devDependencies: [],
      registryDependencies: meta.registryDependencies || [],
      files: [
        {
          name: meta.file,
          path: `utils/${meta.file}`,
          content,
        },
      ],
    };

    const registryPath = path.join(REGISTRY_DIR, `${name}.json`);
    await fs.writeJson(registryPath, registryEntry, { spaces: 2 });
    console.log(`   ✓ Created ${name}.json (utility)`);

    utilities.push({ name, description: meta.description });
  }

  return utilities;
}

interface ThemeAccent {
  /** Light mode: [primary, primary-foreground] */
  light: [string, string];
  /** Dark mode: [primary, primary-foreground] */
  dark: [string, string];
}

const WHITE = "oklch(0.985 0 0)";

/**
 * One theme per Tailwind accent color, using Tailwind v4's official oklch
 * values (the same palette shadcn themes are built from). Light mode uses
 * the 600 shade with white text; dark mode uses the 500 shade with the 950
 * shade as text. Amber and yellow are light colors, so they use lighter
 * shades with dark text in both modes.
 */
const THEME_ACCENTS: Record<string, ThemeAccent> = {
  red: {
    light: ["oklch(0.577 0.245 27.325)", WHITE],
    dark: ["oklch(0.637 0.237 25.331)", "oklch(0.258 0.092 26.042)"],
  },
  rose: {
    light: ["oklch(0.586 0.253 17.585)", WHITE],
    dark: ["oklch(0.645 0.246 16.439)", "oklch(0.271 0.105 12.094)"],
  },
  orange: {
    light: ["oklch(0.646 0.222 41.116)", WHITE],
    dark: ["oklch(0.705 0.213 47.604)", "oklch(0.266 0.079 36.259)"],
  },
  amber: {
    light: ["oklch(0.769 0.188 70.08)", "oklch(0.279 0.077 45.635)"],
    dark: ["oklch(0.828 0.189 84.429)", "oklch(0.279 0.077 45.635)"],
  },
  yellow: {
    light: ["oklch(0.852 0.199 91.936)", "oklch(0.286 0.066 53.813)"],
    dark: ["oklch(0.852 0.199 91.936)", "oklch(0.286 0.066 53.813)"],
  },
  green: {
    light: ["oklch(0.627 0.194 149.214)", WHITE],
    dark: ["oklch(0.723 0.219 149.579)", "oklch(0.266 0.065 152.934)"],
  },
  emerald: {
    light: ["oklch(0.596 0.145 163.225)", WHITE],
    dark: ["oklch(0.696 0.17 162.48)", "oklch(0.262 0.051 172.552)"],
  },
  teal: {
    light: ["oklch(0.6 0.118 184.704)", WHITE],
    dark: ["oklch(0.704 0.14 182.503)", "oklch(0.277 0.046 192.524)"],
  },
  cyan: {
    light: ["oklch(0.609 0.126 221.723)", WHITE],
    dark: ["oklch(0.715 0.143 215.221)", "oklch(0.302 0.056 229.695)"],
  },
  sky: {
    light: ["oklch(0.588 0.158 241.966)", WHITE],
    dark: ["oklch(0.685 0.169 237.323)", "oklch(0.293 0.066 243.157)"],
  },
  blue: {
    light: ["oklch(0.546 0.245 262.881)", WHITE],
    dark: ["oklch(0.623 0.214 259.815)", "oklch(0.282 0.091 267.935)"],
  },
  indigo: {
    light: ["oklch(0.511 0.262 276.966)", WHITE],
    dark: ["oklch(0.585 0.233 277.117)", "oklch(0.257 0.09 281.288)"],
  },
  violet: {
    light: ["oklch(0.541 0.281 293.009)", WHITE],
    dark: ["oklch(0.606 0.25 292.717)", "oklch(0.283 0.141 291.089)"],
  },
  purple: {
    light: ["oklch(0.558 0.288 302.321)", WHITE],
    dark: ["oklch(0.627 0.265 303.9)", "oklch(0.291 0.149 302.717)"],
  },
  fuchsia: {
    light: ["oklch(0.591 0.293 322.896)", WHITE],
    dark: ["oklch(0.667 0.295 322.15)", "oklch(0.293 0.136 325.661)"],
  },
  pink: {
    light: ["oklch(0.592 0.249 0.584)", WHITE],
    dark: ["oklch(0.656 0.241 354.308)", "oklch(0.284 0.109 3.907)"],
  },
};

/** Replaces exactly one occurrence, failing loudly if the anchor drifted. */
function replaceOnce(css: string, from: string, to: string): string {
  const first = css.indexOf(from);
  if (first === -1 || css.indexOf(from, first + 1) !== -1) {
    throw new Error(
      `Theme generation anchor not found exactly once in bearnie.css: ${from.trim()}`,
    );
  }
  return css.replace(from, to);
}

/** Builds a theme's CSS by swapping the accent variables in the base file. */
function composeThemeCss(base: string, accent: ThemeAccent): string {
  const [lightPrimary, lightFg] = accent.light;
  const [darkPrimary, darkFg] = accent.dark;

  let css = base;

  // Light mode (:root)
  css = replaceOnce(
    css,
    "  --primary: oklch(0.205 0 0);",
    `  --primary: ${lightPrimary};`,
  );
  css = replaceOnce(
    css,
    "  --primary-foreground: oklch(0.985 0 0);\n  --secondary",
    `  --primary-foreground: ${lightFg};\n  --secondary`,
  );
  css = replaceOnce(
    css,
    "  --ring: oklch(0.708 0 0);\n  --chart-1",
    `  --ring: ${lightPrimary};\n  --chart-1`,
  );
  css = replaceOnce(
    css,
    "  --sidebar-primary: oklch(0.205 0 0);",
    `  --sidebar-primary: ${lightPrimary};`,
  );
  css = replaceOnce(
    css,
    "  --sidebar-primary-foreground: oklch(0.985 0 0);\n  --sidebar-accent: oklch(0.97 0 0);",
    `  --sidebar-primary-foreground: ${lightFg};\n  --sidebar-accent: oklch(0.97 0 0);`,
  );
  css = replaceOnce(
    css,
    "  --sidebar-ring: oklch(0.708 0 0);",
    `  --sidebar-ring: ${lightPrimary};`,
  );

  // Dark mode (.dark)
  css = replaceOnce(
    css,
    "  --primary: oklch(0.985 0 0);\n  --primary-foreground: oklch(0.205 0 0);",
    `  --primary: ${darkPrimary};\n  --primary-foreground: ${darkFg};`,
  );
  css = replaceOnce(
    css,
    "  --ring: oklch(0.439 0 0);\n  --chart-1",
    `  --ring: ${darkPrimary};\n  --chart-1`,
  );
  css = replaceOnce(
    css,
    "  --sidebar-primary: oklch(0.488 0.243 264.376);",
    `  --sidebar-primary: ${darkPrimary};`,
  );
  css = replaceOnce(
    css,
    "  --sidebar-primary-foreground: oklch(0.985 0 0);\n  --sidebar-accent: oklch(0.269 0 0);",
    `  --sidebar-primary-foreground: ${darkFg};\n  --sidebar-accent: oklch(0.269 0 0);`,
  );
  css = replaceOnce(
    css,
    "  --sidebar-ring: oklch(0.439 0 0);",
    `  --sidebar-ring: ${darkPrimary};`,
  );

  return css;
}

/**
 * Each Tailwind accent color becomes a `styles-<name>` registry entry,
 * composed from bearnie.css at build time so themes never drift from the
 * base styles. All theme entries ship the same file path
 * (styles/bearnie.css); bearnie.json records which one is installed.
 */
async function generateThemes(): Promise<{
  entries: { name: string; description: string; category: string }[];
  themeNames: string[];
}> {
  if (!(await fs.pathExists(STYLES_PATH))) {
    return { entries: [], themeNames: [] };
  }

  const base = await fs.readFile(STYLES_PATH, "utf-8");
  const entries: { name: string; description: string; category: string }[] =
    [];
  const themeNames: string[] = [];

  for (const [themeName, accent] of Object.entries(THEME_ACCENTS)) {
    const entryName = `styles-${themeName}`;
    const description = `Bearnie theme with ${themeName} as the primary color`;
    const content = composeThemeCss(base, accent);

    const registryEntry = {
      name: entryName,
      type: "styles",
      description,
      files: [
        {
          name: "bearnie.css",
          path: "styles/bearnie.css",
          content,
        },
      ],
    };

    await fs.writeJson(
      path.join(REGISTRY_DIR, `${entryName}.json`),
      registryEntry,
      { spaces: 2 },
    );

    entries.push({ name: entryName, description, category: "theme" });
    themeNames.push(themeName);
  }

  console.log(
    `   ✓ Created ${themeNames.length} theme entries (${themeNames.join(", ")})`,
  );

  return { entries, themeNames };
}

async function generateStyles() {
  if (!(await fs.pathExists(STYLES_PATH))) {
    console.log("⚠️  Skipping styles - bearnie.css not found");
    return;
  }

  const content = await fs.readFile(STYLES_PATH, "utf-8");
  const registryEntry = {
    name: "styles",
    type: "styles",
    description: "CSS variables and theme configuration for Bearnie components",
    files: [
      {
        name: "bearnie.css",
        path: "styles/bearnie.css",
        content,
      },
    ],
  };

  const registryPath = path.join(REGISTRY_DIR, "styles.json");
  await fs.writeJson(registryPath, registryEntry, { spaces: 2 });
  console.log("   ✓ Created styles.json");

  if (await fs.pathExists(TEMPLATE_STYLES_PATH)) {
    await fs.copy(STYLES_PATH, TEMPLATE_STYLES_PATH);
    console.log("   ✓ Synced bearnie.css to create-bearnie template");
  }
}

async function generateBarrel() {
  if (!(await fs.pathExists(BARREL_PATH))) {
    console.log("⚠️  Skipping barrel - index.ts not found");
    return null;
  }

  const content = await fs.readFile(BARREL_PATH, "utf-8");
  const registryEntry = {
    name: "barrel",
    description:
      "Barrel export for importing components from @/components/bearnie",
    category: "meta",
    dependencies: [],
    devDependencies: [],
    registryDependencies: [],
    files: [
      {
        name: "index.ts",
        path: "index.ts",
        content,
      },
    ],
  };

  const registryPath = path.join(REGISTRY_DIR, "barrel.json");
  await fs.writeJson(registryPath, registryEntry, { spaces: 2 });
  console.log("   ✓ Created barrel.json");

  return {
    name: "barrel",
    description: registryEntry.description,
    category: registryEntry.category,
  };
}

async function generateRegistry() {
  console.log("🔧 Generating component registry...\n");

  // Ensure registry directory exists
  await fs.ensureDir(REGISTRY_DIR);

  // First generate utilities
  const utilities = await generateUtilities();

  console.log("\n🎨 Processing styles...\n");
  await generateStyles();
  const { entries: themeEntries, themeNames } = await generateThemes();

  console.log("\n📦 Processing components...\n");

  const components: { name: string; description: string; category: string }[] =
    [];

  // Get all component directories
  const componentDirs = await fs.readdir(COMPONENTS_DIR);

  for (const dir of componentDirs) {
    const componentPath = path.join(COMPONENTS_DIR, dir);
    const stat = await fs.stat(componentPath);

    if (!stat.isDirectory()) continue;

    const meta = COMPONENT_META[dir];
    if (!meta) {
      console.log(`⚠️  Skipping ${dir} - no metadata defined`);
      continue;
    }

    console.log(`📦 Processing ${dir}...`);

    // Get component files
    const files = await getComponentFiles(componentPath);

    if (files.length === 0) {
      console.log(`   ⚠️  No .astro files found in ${dir}`);
      continue;
    }

    // Every component imports `@/utils/cn`, so always ship the cn utility
    const registryDependencies = [
      "cn",
      ...(meta.registryDependencies || []),
    ];

    // Create registry JSON
    const registryEntry = {
      name: dir,
      description: meta.description,
      category: meta.category,
      dependencies: meta.dependencies || [],
      devDependencies: [],
      registryDependencies,
      files,
    };

    // Write component registry file
    const registryPath = path.join(REGISTRY_DIR, `${dir}.json`);
    await fs.writeJson(registryPath, registryEntry, { spaces: 2 });
    console.log(`   ✓ Created ${dir}.json`);

    components.push({
      name: dir,
      description: meta.description,
      category: meta.category,
    });
  }

  console.log("\n📦 Processing registry aliases...\n");
  const aliasEntries = await generateRegistryAliases();
  components.push(...aliasEntries);

  // Add styles + theme entries (special - not components)
  components.unshift(
    {
      name: "styles",
      description:
        "CSS variables and theme configuration for Bearnie components",
      category: "theme",
    },
    ...themeEntries,
  );

  console.log("\n📦 Processing barrel export...\n");
  const barrelEntry = await generateBarrel();
  if (barrelEntry) {
    components.push(barrelEntry);
  }

  // Create index file
  const rootPkg = await fs.readJson(path.join(ROOT_DIR, "package.json"));
  const registryVersion =
    (rootPkg as { registryVersion?: string }).registryVersion ?? "0.2.0";

  const indexPath = path.join(REGISTRY_DIR, "index.json");
  await fs.writeJson(
    indexPath,
    {
      name: "bearnie",
      version: registryVersion,
      components: components,
      utilities,
      themes: ["default", ...themeNames],
    },
    { spaces: 2 },
  );

  console.log(`\n✅ Generated registry with ${components.length} components (including styles)`);
  console.log(`📁 Registry files written to: ${REGISTRY_DIR}`);
}

generateRegistry().catch(console.error);
