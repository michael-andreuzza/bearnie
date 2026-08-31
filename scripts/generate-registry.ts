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
  position: {
    description:
      "Collision-aware floating positioning utility (flip + shift) for overlays",
    file: "position.ts",
  },
  overlay: {
    description:
      "Overlay helpers: data-state enter/exit animations, refcounted scroll lock, and a modal stack",
    file: "overlay.ts",
  },
  "ui-runtime-loader": {
    description:
      "Registers per-feature UI runtime initializers (runs on load and after view transitions)",
    file: "runtime/loader.ts",
  },
  "ui-runtime-dialog": {
    description: "Shared dialog initialization runtime",
    file: "runtime/dialog.ts",
    registryDependencies: ["focus-trap", "overlay"],
  },
  "ui-runtime-disclosure-triggers": {
    description: "Shared keyboard trigger handlers for disclosure controls",
    file: "runtime/disclosure-triggers.ts",
  },
  "ui-runtime-dropdown-menu": {
    description: "Shared dropdown menu initialization runtime",
    file: "runtime/dropdown-menu.ts",
    registryDependencies: ["focus-trap", "position", "overlay"],
  },
  "ui-runtime-popover": {
    description: "Shared popover initialization runtime",
    file: "runtime/popover.ts",
    registryDependencies: ["focus-trap", "position", "overlay"],
  },
  "ui-runtime-command": {
    description: "Shared command and command dialog initialization runtime",
    file: "runtime/command.ts",
    registryDependencies: ["focus-trap", "overlay"],
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
  "ui-runtime-alert-dialog": {
    description: "Shared alert dialog initialization runtime",
    file: "runtime/alert-dialog.ts",
    registryDependencies: ["focus-trap", "overlay"],
  },
  "ui-runtime-sheet": {
    description: "Shared sheet initialization runtime",
    file: "runtime/sheet.ts",
    registryDependencies: ["focus-trap", "overlay"],
  },
  "ui-runtime-context-menu": {
    description: "Shared context menu initialization runtime",
    file: "runtime/context-menu.ts",
    registryDependencies: ["focus-trap", "overlay"],
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
    registryDependencies: [
      "focus-trap",
      "button",
      "ui-runtime-loader",
      "ui-runtime-alert-dialog",
      "ui-runtime-disclosure-triggers",
    ],
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
  banner: {
    description:
      "An announcement banner with optional dismissal persisted per visitor",
    category: "feedback",
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
    registryDependencies: ["ui-runtime-loader", "ui-runtime-disclosure-triggers"],
  },
  command: {
    description: "A command palette for searching and selecting actions",
    category: "navigation",
    registryDependencies: [
      "icon",
      "ui-runtime-loader",
      "ui-runtime-command",
      "ui-runtime-disclosure-triggers",
    ],
  },
  "context-menu": {
    description: "A menu triggered by right-click",
    category: "navigation",
    registryDependencies: ["ui-runtime-loader", "ui-runtime-context-menu"],
  },
  dialog: {
    description: "A modal dialog that appears on top of the page",
    category: "disclosure",
    registryDependencies: [
      "icon",
      "ui-runtime-loader",
      "ui-runtime-dialog",
      "ui-runtime-disclosure-triggers",
    ],
  },
  "dropdown-menu": {
    description: "A menu that appears when triggered by a button",
    category: "navigation",
    registryDependencies: ["ui-runtime-loader", "ui-runtime-dropdown-menu"],
  },
  empty: {
    description: "A placeholder for empty states",
    category: "feedback",
  },
  field: {
    description:
      "Form field primitives that wire labels, descriptions, and errors to controls with proper ARIA",
    category: "form",
    registryDependencies: ["focus-trap"],
  },
  "file-upload": {
    description: "A file upload component with drag and drop",
    category: "form",
    registryDependencies: ["icon"],
  },
  "hover-card": {
    description: "A card that appears on hover",
    category: "display",
    registryDependencies: ["position", "overlay"],
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
  marquee: {
    description:
      "An infinite CSS-only scrolling marquee for logos and testimonials",
    category: "display",
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
    registryDependencies: [
      "ui-runtime-loader",
      "ui-runtime-popover",
      "ui-runtime-disclosure-triggers",
    ],
  },
  progress: {
    description: "Displays progress of a task",
    category: "feedback",
  },
  radio: {
    description: "A set of checkable buttons where only one can be selected",
    category: "form",
  },
  rating: {
    description: "A star rating display supporting fractional values",
    category: "display",
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
    registryDependencies: [
      "command",
      "popover",
      "icon",
      "ui-runtime-loader",
      "ui-runtime-combobox",
      "ui-runtime-popover",
    ],
  },
  separator: {
    description: "A visual divider between content",
    category: "layout",
  },
  sheet: {
    description: "A slide-out panel from the edge of the screen",
    category: "disclosure",
    registryDependencies: [
      "focus-trap",
      "icon",
      "ui-runtime-loader",
      "ui-runtime-sheet",
      "ui-runtime-disclosure-triggers",
    ],
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
    registryDependencies: ["ui-runtime-loader", "ui-runtime-tabs"],
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
    registryDependencies: ["focus-trap", "position", "overlay"],
  },
  tree: {
    description: "A hierarchical tree view",
    category: "navigation",
    registryDependencies: ["icon"],
  },
  video: {
    description:
      "A lazy video embed for YouTube and Vimeo — the player only loads on click",
    category: "display",
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
  lime: {
    light: ["oklch(0.648 0.2 131.684)", WHITE],
    dark: ["oklch(0.768 0.233 130.85)", "oklch(0.274 0.072 132.109)"],
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

/**
 * The neutral gray shades used throughout bearnie.css. Base themes swap
 * every occurrence of these for the corresponding shade of another
 * Tailwind gray scale (slate, zinc, stone, ...).
 */
const NEUTRAL_SHADES: Record<string, string> = {
  "50": "oklch(0.985 0 0)",
  "100": "oklch(0.97 0 0)",
  "200": "oklch(0.922 0 0)",
  "400": "oklch(0.708 0 0)",
  "500": "oklch(0.556 0 0)",
  "600": "oklch(0.439 0 0)",
  "800": "oklch(0.269 0 0)",
  "900": "oklch(0.205 0 0)",
  "950": "oklch(0.145 0 0)",
};

/** Tailwind v4 base-color scales (neutral itself is the file's default). */
const BASE_SHADES: Record<string, Record<string, string>> = {
  slate: {
    "50": "oklch(0.984 0.003 247.858)",
    "100": "oklch(0.968 0.007 247.896)",
    "200": "oklch(0.929 0.013 255.508)",
    "400": "oklch(0.704 0.04 256.788)",
    "500": "oklch(0.554 0.046 257.417)",
    "600": "oklch(0.446 0.043 257.281)",
    "800": "oklch(0.279 0.041 260.031)",
    "900": "oklch(0.208 0.042 265.755)",
    "950": "oklch(0.129 0.042 264.695)",
  },
  gray: {
    "50": "oklch(0.985 0.002 247.839)",
    "100": "oklch(0.967 0.003 264.542)",
    "200": "oklch(0.928 0.006 264.531)",
    "400": "oklch(0.707 0.022 261.325)",
    "500": "oklch(0.551 0.027 264.364)",
    "600": "oklch(0.446 0.03 256.802)",
    "800": "oklch(0.278 0.033 256.848)",
    "900": "oklch(0.21 0.034 264.665)",
    "950": "oklch(0.13 0.028 261.692)",
  },
  zinc: {
    "50": "oklch(0.985 0 0)",
    "100": "oklch(0.967 0.001 286.375)",
    "200": "oklch(0.92 0.004 286.32)",
    "400": "oklch(0.705 0.015 286.067)",
    "500": "oklch(0.552 0.016 285.938)",
    "600": "oklch(0.442 0.017 285.786)",
    "800": "oklch(0.274 0.006 286.033)",
    "900": "oklch(0.21 0.006 285.885)",
    "950": "oklch(0.141 0.005 285.823)",
  },
  stone: {
    "50": "oklch(0.985 0.001 106.423)",
    "100": "oklch(0.97 0.001 106.424)",
    "200": "oklch(0.923 0.003 48.717)",
    "400": "oklch(0.709 0.01 56.259)",
    "500": "oklch(0.553 0.013 58.071)",
    "600": "oklch(0.444 0.011 73.639)",
    "800": "oklch(0.268 0.007 34.298)",
    "900": "oklch(0.216 0.006 56.043)",
    "950": "oklch(0.147 0.004 49.25)",
  },
  mauve: {
    "50": "oklch(0.985 0 0)",
    "100": "oklch(0.96 0.003 325.6)",
    "200": "oklch(0.922 0.005 325.62)",
    "400": "oklch(0.711 0.019 323.02)",
    "500": "oklch(0.542 0.034 322.5)",
    "600": "oklch(0.435 0.029 321.78)",
    "800": "oklch(0.263 0.024 320.12)",
    "900": "oklch(0.212 0.019 322.12)",
    "950": "oklch(0.145 0.008 326)",
  },
  olive: {
    "50": "oklch(0.988 0.003 106.5)",
    "100": "oklch(0.966 0.005 106.5)",
    "200": "oklch(0.93 0.007 106.5)",
    "400": "oklch(0.737 0.021 106.9)",
    "500": "oklch(0.58 0.031 107.3)",
    "600": "oklch(0.466 0.025 107.3)",
    "800": "oklch(0.286 0.016 107.4)",
    "900": "oklch(0.228 0.013 107.4)",
    "950": "oklch(0.153 0.006 107.1)",
  },
  mist: {
    "50": "oklch(0.987 0.002 197.1)",
    "100": "oklch(0.963 0.002 197.1)",
    "200": "oklch(0.925 0.005 214.3)",
    "400": "oklch(0.723 0.014 214.4)",
    "500": "oklch(0.56 0.021 213.5)",
    "600": "oklch(0.45 0.017 213.2)",
    "800": "oklch(0.275 0.011 216.9)",
    "900": "oklch(0.218 0.008 223.9)",
    "950": "oklch(0.148 0.004 228.8)",
  },
  taupe: {
    "50": "oklch(0.986 0.002 67.8)",
    "100": "oklch(0.96 0.002 17.2)",
    "200": "oklch(0.922 0.005 34.3)",
    "400": "oklch(0.714 0.014 41.2)",
    "500": "oklch(0.547 0.021 43.1)",
    "600": "oklch(0.438 0.017 39.3)",
    "800": "oklch(0.268 0.011 36.5)",
    "900": "oklch(0.214 0.009 43.1)",
    "950": "oklch(0.147 0.004 49.3)",
  },
};

/** Swaps every neutral gray in the CSS for the given base color scale. */
function swapBaseColor(css: string, shades: Record<string, string>): string {
  let result = css;
  for (const [shade, neutralValue] of Object.entries(NEUTRAL_SHADES)) {
    result = result.replaceAll(neutralValue, shades[shade]);
  }
  return result;
}

/**
 * "neutral" base + "default" accent is the plain `styles` entry; every
 * other combination gets its own theme name.
 */
function composeThemeName(base: string, accent: string): string {
  if (base === "neutral") return accent;
  if (accent === "default") return base;
  return `${base}-${accent}`;
}

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
 * Every base color (Tailwind gray scale) x accent color (primary)
 * combination becomes a `styles-<name>` registry entry, composed from
 * bearnie.css at build time so themes never drift from the base styles.
 * All theme entries ship the same file path (styles/bearnie.css);
 * bearnie.json records which one is installed. Theme entries live under
 * `themes` in the index, not under `components`.
 */
async function generateThemes(): Promise<{
  themeNames: string[];
  themeBases: string[];
  themeAccents: string[];
}> {
  const themeBases = ["neutral", ...Object.keys(BASE_SHADES)];
  const themeAccents = ["default", ...Object.keys(THEME_ACCENTS)];

  if (!(await fs.pathExists(STYLES_PATH))) {
    return { themeNames: [], themeBases, themeAccents };
  }

  const baseCss = await fs.readFile(STYLES_PATH, "utf-8");
  const themeNames: string[] = [];

  for (const base of themeBases) {
    for (const accent of themeAccents) {
      // Neutral + default is the plain `styles` entry
      if (base === "neutral" && accent === "default") continue;

      const themeName = composeThemeName(base, accent);
      const entryName = `styles-${themeName}`;

      let content = baseCss;
      if (accent !== "default") {
        content = composeThemeCss(content, THEME_ACCENTS[accent]);
      }
      if (base !== "neutral") {
        content = swapBaseColor(content, BASE_SHADES[base]);
      }

      const accentLabel =
        accent === "default"
          ? "a neutral primary"
          : `${accent} as the primary color`;
      const registryEntry = {
        name: entryName,
        type: "styles",
        description: `Bearnie theme on the ${base} gray scale with ${accentLabel}`,
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

      themeNames.push(themeName);
    }
  }

  console.log(
    `   ✓ Created ${themeNames.length} theme entries (${themeBases.length} bases x ${themeAccents.length} accents)`,
  );

  return { themeNames, themeBases, themeAccents };
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
  // Auto-generate the barrel from folder contents so it can never drift
  // from the actual component files.
  const folders = (await fs.readdir(COMPONENTS_DIR, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  const lines: string[] = [
    "// AUTO-GENERATED by scripts/generate-registry.ts — do not edit by hand.",
    "// Run `npm run generate-registry` after adding or removing components.",
  ];

  for (const folder of folders) {
    const files = (await fs.readdir(path.join(COMPONENTS_DIR, folder)))
      .filter((file) => file.endsWith(".astro"))
      .sort();
    if (files.length === 0) continue;

    lines.push("");
    for (const file of files) {
      const componentName = path.basename(file, ".astro");
      lines.push(
        `export { default as ${componentName} } from "./${folder}/${file}";`,
      );
    }
  }

  const content = lines.join("\n") + "\n";
  await fs.writeFile(BARREL_PATH, content);
  console.log("   ✓ Generated src/components/ui/index.ts from folder contents");
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
  const { themeNames, themeBases, themeAccents } = await generateThemes();

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

  // Add styles entry (special - not a component). Theme variants are
  // listed under `themes` in the index, not here.
  components.unshift({
    name: "styles",
    description:
      "CSS variables and theme configuration for Bearnie components",
    category: "theme",
  });

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
      themeBases,
      themeAccents,
    },
    { spaces: 2 },
  );

  console.log(`\n✅ Generated registry with ${components.length} components (including styles)`);
  console.log(`📁 Registry files written to: ${REGISTRY_DIR}`);
}

generateRegistry().catch(console.error);
