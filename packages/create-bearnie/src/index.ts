#!/usr/bin/env node
import prompts from "prompts";
import pc from "picocolors";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Brand colors
const amber = (text: string) => pc.yellow(text);
const logo = `${amber("🐻")} ${pc.bold("bearnie")}`;

// Terminal hyperlink (OSC 8) - works in most modern terminals
const link = (text: string, url: string) =>
  `\u001B]8;;${url}\u0007${pc.cyan(text)}\u001B]8;;\u0007`;

interface RegistryFile {
  name: string;
  path: string;
  content: string;
}

interface RegistryEntry {
  name: string;
  type?: string;
  dependencies?: string[];
  files: RegistryFile[];
}

interface RegistryIndex {
  components: { name: string }[];
  utilities?: { name: string }[];
  themes?: string[];
  themeBases?: string[];
  themeAccents?: string[];
}

// Parse --full flag
function parseFullArg(): boolean {
  return process.argv.includes("--full");
}

// Parse --theme flag: --theme=amber or --theme amber
function parseThemeArg(): string | null {
  const argv = process.argv;
  for (let i = 2; i < argv.length; i++) {
    if (argv[i].startsWith("--theme=")) {
      return argv[i].slice("--theme=".length) || null;
    }
    if (argv[i] === "--theme") {
      return argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
    }
  }
  return null;
}

/** True for the styles/styles-* entries, which all install the same CSS file. */
function isThemeEntry(name: string): boolean {
  return name === "styles" || name.startsWith("styles-");
}

/**
 * Theme name from a base (gray scale) + accent (primary color) pair:
 * neutral+default -> "default", neutral+blue -> "blue",
 * slate+default -> "slate", slate+blue -> "slate-blue".
 */
function composeThemeName(base: string, accent: string): string {
  if (base === "neutral") return accent;
  if (accent === "default") return base;
  return `${base}-${accent}`;
}

// Detect the package manager from how the user invoked us
// (npx / pnpm dlx / yarn dlx / bunx set npm_config_user_agent)
type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

function detectPackageManager(): PackageManager {
  const userAgent = process.env.npm_config_user_agent ?? "";
  if (userAgent.startsWith("pnpm")) return "pnpm";
  if (userAgent.startsWith("yarn")) return "yarn";
  if (userAgent.startsWith("bun")) return "bun";
  return "npm";
}

const PM_COMMANDS: Record<
  PackageManager,
  { install: string; dev: string; dlx: string }
> = {
  npm: { install: "npm install", dev: "npm run dev", dlx: "npx" },
  pnpm: { install: "pnpm install", dev: "pnpm dev", dlx: "pnpm dlx" },
  yarn: { install: "yarn", dev: "yarn dev", dlx: "yarn dlx" },
  bun: { install: "bun install", dev: "bun run dev", dlx: "bunx" },
};

// Registry configuration
const REGISTRY_URL =
  process.env.BEARNIE_REGISTRY_URL || "https://bearnie.dev/registry";
const REGISTRY_PATH = process.env.BEARNIE_REGISTRY_PATH;

const BEARNIE_CONFIG = {
  componentsDir: "src/components/bearnie",
  utilsDir: "src/utils",
  stylesDir: "src/styles",
  tailwindConfig: "tailwind.config.mjs",
  typescript: true,
} as const;

// Fallback for registries that predate the `utilities` field in index.json
const FALLBACK_UTILITY_NAMES = [
  "cn",
  "focus-trap",
  "position",
  "overlay",
  "ui-runtime-loader",
  "ui-runtime-dialog",
  "ui-runtime-disclosure-triggers",
  "ui-runtime-dropdown-menu",
  "ui-runtime-popover",
  "ui-runtime-command",
  "ui-runtime-combobox",
  "ui-runtime-tabs",
  "ui-runtime-alert-dialog",
  "ui-runtime-sheet",
  "ui-runtime-context-menu",
];

// Known version ranges for component npm dependencies; anything not listed
// falls back to "latest" so the scaffolded project still installs.
const DEP_VERSIONS: Record<string, string> = {
  clsx: "^2.1.1",
  "tailwind-merge": "^3.6.0",
  "keen-slider": "^6.8.6",
  "@hugeicons/core-free-icons": "^4.2.3",
};

function resolveInstallPath(
  targetDir: string,
  filePath: string,
  type?: string,
): string {
  if (type === "utility" || filePath.startsWith("utils/")) {
    return path.join(targetDir, "src/utils", filePath.replace(/^utils\//, ""));
  }

  if (type === "styles" || filePath.startsWith("styles/")) {
    return path.join(targetDir, "src/styles", filePath.replace(/^styles\//, ""));
  }

  return path.join(targetDir, "src/components/bearnie", filePath);
}

async function fetchRegistryEntry(name: string): Promise<RegistryEntry | null> {
  try {
    if (REGISTRY_PATH) {
      const entryPath = path.join(REGISTRY_PATH, `${name}.json`);
      if (await fs.pathExists(entryPath)) {
        return await fs.readJson(entryPath);
      }
      return null;
    }

    const response = await fetch(`${REGISTRY_URL}/${name}.json`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchRegistryIndex(): Promise<RegistryIndex> {
  if (REGISTRY_PATH) {
    const indexPath = path.join(REGISTRY_PATH, "index.json");
    if (await fs.pathExists(indexPath)) {
      return await fs.readJson(indexPath);
    }
    throw new Error(`Failed to fetch registry index at ${indexPath}`);
  }

  const response = await fetch(`${REGISTRY_URL}/index.json`);
  if (!response.ok) {
    throw new Error("Failed to fetch registry index");
  }
  return await response.json();
}

async function writeBearnieConfig(
  targetDir: string,
  theme: string,
): Promise<void> {
  await fs.writeJson(
    path.join(targetDir, "bearnie.json"),
    { ...BEARNIE_CONFIG, theme },
    { spaces: 2 },
  );
}

async function writeRegistryFiles(
  targetDir: string,
  entry: RegistryEntry,
): Promise<void> {
  for (const file of entry.files) {
    const filePath = resolveInstallPath(targetDir, file.path, entry.type);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, file.content);
  }
}

async function main() {
  const fullInstall = parseFullArg();

  console.log(`
  ${logo}

  ${amber("Hey!")} Let's create your Bearnie project.
${fullInstall ? `  ${pc.dim("Full install: including all components")}\n` : ""}
`);

  // Get project name from args (skip flags)
  let projectName = process.argv.find(
    (arg, index) => index >= 2 && !arg.startsWith("--"),
  );

  if (!projectName) {
    const response = await prompts({
      type: "text",
      name: "projectName",
      message: "Project name:",
      initial: "my-bearnie-app",
      validate: (value) => {
        if (!value) return "Project name is required";
        if (!/^[a-z0-9-_]+$/i.test(value))
          return "Project name can only contain letters, numbers, hyphens, and underscores";
        return true;
      },
    });

    if (!response.projectName) {
      console.log(`\n  ${pc.yellow("Cancelled.")}\n`);
      process.exit(0);
    }

    projectName = response.projectName;
  }

  // At this point projectName is guaranteed to be a string
  const finalName = projectName as string;
  const targetDir = path.resolve(process.cwd(), finalName);

  // Pick a theme: --theme flag, interactive base + accent prompts, or default
  let availableThemes = ["default"];
  let themeBases = ["neutral"];
  let themeAccents = ["default"];
  try {
    const index = await fetchRegistryIndex();
    if (index.themes?.length) availableThemes = index.themes;
    if (index.themeBases?.length) themeBases = index.themeBases;
    if (index.themeAccents?.length) themeAccents = index.themeAccents;
  } catch {
    // Offline — the template ships the default theme regardless
  }

  let theme = parseThemeArg();

  if (theme && !availableThemes.includes(theme)) {
    console.log(
      `\n  ${pc.red("Unknown theme:")} ${theme}\n  Themes combine a base and an accent, e.g. ${pc.cyan("slate-blue")}.\n  Bases: ${themeBases.join(", ")}\n  Accents: ${themeAccents.join(", ")}\n`,
    );
    process.exit(1);
  }

  if (
    !theme &&
    (themeBases.length > 1 || themeAccents.length > 1) &&
    process.stdin.isTTY
  ) {
    const response = await prompts([
      {
        type: "select",
        name: "base",
        message: "Base color (grays and surfaces)",
        choices: themeBases.map((name) => ({ title: name, value: name })),
        initial: 0,
      },
      {
        type: "select",
        name: "accent",
        message: "Accent color (buttons, focus rings)",
        choices: themeAccents.map((name) => ({
          title: name === "default" ? "default (neutral)" : name,
          value: name,
        })),
        initial: 0,
      },
    ]);
    theme = composeThemeName(
      response.base ?? "neutral",
      response.accent ?? "default",
    );
  }

  theme = theme ?? "default";

  // Check if directory exists
  if (fs.existsSync(targetDir)) {
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: `Directory ${pc.cyan(finalName)} already exists. Overwrite?`,
      initial: false,
    });

    if (!overwrite) {
      console.log(`\n  ${pc.yellow("Cancelled.")}\n`);
      process.exit(0);
    }

    await fs.remove(targetDir);
  }

  // Copy template
  const templateDir = path.join(__dirname, "..", "template");

  console.log(`\n  ${pc.dim("Creating project in")} ${pc.cyan(targetDir)}\n`);

  await fs.copy(templateDir, targetDir);

  // Update package.json with project name
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = await fs.readJson(pkgPath);
  pkg.name = finalName;
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });

  await writeBearnieConfig(targetDir, theme);

  // Swap in the chosen theme (template ships the default palette)
  if (theme !== "default") {
    const themeEntry = await fetchRegistryEntry(`styles-${theme}`);
    if (themeEntry?.files) {
      await writeRegistryFiles(targetDir, themeEntry);
      console.log(`  ${pc.green("✓")} Applied ${theme} theme`);
    } else {
      console.log(
        `  ${pc.yellow("!")} Couldn't fetch the ${theme} theme — using default`,
      );
    }
  }

  // Install all components if --full flag is provided
  if (fullInstall) {
    console.log(`\n  ${pc.dim("Fetching components from registry...")}\n`);

    await fs.ensureDir(path.join(targetDir, "src", "components", "bearnie"));
    await fs.ensureDir(path.join(targetDir, "src", "utils"));

    const registryIndex = await fetchRegistryIndex();
    const npmDependencies = new Set<string>(["clsx", "tailwind-merge"]);

    const utilityNames = registryIndex.utilities?.length
      ? registryIndex.utilities.map((utility) => utility.name)
      : FALLBACK_UTILITY_NAMES;

    for (const utilityName of utilityNames) {
      const utility = await fetchRegistryEntry(utilityName);
      if (utility?.files) {
        await writeRegistryFiles(targetDir, utility);
        utility.dependencies?.forEach((dep) => npmDependencies.add(dep));
        console.log(`  ${pc.green("✓")} Added ${utilityName} utility`);
      } else {
        console.log(`  ${pc.yellow("!")} Failed to fetch ${utilityName} utility`);
      }
    }

    const componentNames = registryIndex.components
      .map((component) => component.name)
      .filter((name) => !isThemeEntry(name) && name !== "barrel");

    let installed = 0;
    let failed = 0;

    for (const componentName of componentNames) {
      const component = await fetchRegistryEntry(componentName);
      if (component?.files) {
        await writeRegistryFiles(targetDir, component);
        component.dependencies?.forEach((dep) => npmDependencies.add(dep));
        installed++;
        process.stdout.write(
          `\r  ${pc.green("✓")} Installed ${installed}/${componentNames.length} components`,
        );
      } else {
        failed++;
      }
    }
    console.log("");

    const barrel = await fetchRegistryEntry("barrel");
    if (barrel?.files) {
      await writeRegistryFiles(targetDir, barrel);
      console.log(`  ${pc.green("✓")} Added barrel export`);
    } else {
      console.log(`  ${pc.yellow("!")} Failed to fetch barrel export`);
    }

    if (failed > 0) {
      console.log(`  ${pc.yellow("!")} ${failed} components failed to fetch`);
    }

    const pkgPath2 = path.join(targetDir, "package.json");
    const pkg2 = await fs.readJson(pkgPath2);
    const addedDeps = Object.fromEntries(
      [...npmDependencies]
        .sort()
        .map((dep) => [dep, DEP_VERSIONS[dep] ?? "latest"]),
    );
    pkg2.dependencies = {
      ...pkg2.dependencies,
      ...addedDeps,
    };
    await fs.writeJson(pkgPath2, pkg2, { spaces: 2 });
    console.log(
      `  ${pc.green("✓")} Added ${Object.keys(addedDeps).length} npm dependencies (${Object.keys(addedDeps).join(", ")})`,
    );
  }

  // Create .gitignore
  await fs.writeFile(
    path.join(targetDir, ".gitignore"),
    `# Dependencies
node_modules/

# Build output
dist/

# Astro
.astro/

# Environment variables
.env
.env.*
!.env.example

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
`,
  );

  console.log(`  ${pc.green("✓")} Created project files`);

  // Success message
  const pmCommands = PM_COMMANDS[detectPackageManager()];

  if (fullInstall) {
    console.log(`
  ${pc.green("Done!")} Your Bearnie project is ready with all components.

  ${pc.bold("Next steps:")}

    ${pc.dim("1.")} cd ${pc.cyan(finalName)}
    ${pc.dim("2.")} ${pmCommands.install}
    ${pc.dim("3.")} ${pmCommands.dev}

  ${pc.dim("All components are in")} ${pc.cyan("src/components/bearnie/")}
  ${pc.dim("Import from")} ${pc.cyan("@/components/bearnie")} ${pc.dim("via")} ${pc.cyan("index.ts")}

  ${pc.dim("Browse components at")} ${link("bearnie.dev/docs/components", "https://bearnie.dev/docs/components")}

  ${pc.dim("Made by")} ${link("Michael", "https://michaelandreuzza.com")} ${pc.dim("at")} ${link("Lexington Themes", "https://lexingtonthemes.com")}
`);
  } else {
    console.log(`
  ${pc.green("Done!")} Your Bearnie project is ready.

  ${pc.bold("Next steps:")}

    ${pc.dim("1.")} cd ${pc.cyan(finalName)}
    ${pc.dim("2.")} ${pmCommands.install}
    ${pc.dim("3.")} ${pmCommands.dlx} bearnie add button card
    ${pc.dim("4.")} ${pmCommands.dev}

  ${pc.dim("Or use")} ${pc.cyan("--full")} ${pc.dim("to include all components:")}
    ${pmCommands.dlx} create-bearnie my-app --full

  ${pc.dim("Browse components at")} ${link("bearnie.dev/docs/components", "https://bearnie.dev/docs/components")}

  ${pc.dim("Made by")} ${link("Michael", "https://michaelandreuzza.com")} ${pc.dim("at")} ${link("Lexington Themes", "https://lexingtonthemes.com")}
`);
  }
}

main().catch((err) => {
  console.error(`\n  ${pc.red("Error:")} ${err.message}\n`);
  process.exit(1);
});
