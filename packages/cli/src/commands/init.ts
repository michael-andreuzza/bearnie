import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import path from "path";
import fs from "fs-extra";
import { execa } from "execa";
import {
  DEFAULT_CONFIG,
  saveProjectConfig,
  isAstroProject,
  hasTailwindInstalled,
  CONFIG_FILE,
  type ProjectConfig,
} from "../utils/config.js";
import { getComponent, getRegistryIndex } from "../utils/registry.js";
import { composeThemeName, themeEntryName } from "../utils/config.js";
import { detectPackageManager, installCommand } from "../utils/pm.js";
import { brand, messages, print } from "../utils/ui.js";

interface InitOptions {
  yes?: boolean;
  cwd: string;
}

type SetupResult = "done" | "already" | "manual";

/** Ensures tsconfig.json maps `@/*` to `./src/*` (components import `@/utils/cn`). */
async function ensureTsconfigPaths(cwd: string): Promise<SetupResult> {
  const tsconfigPath = path.join(cwd, "tsconfig.json");

  if (!(await fs.pathExists(tsconfigPath))) {
    await fs.writeJson(
      tsconfigPath,
      {
        extends: "astro/tsconfigs/strict",
        compilerOptions: {
          baseUrl: ".",
          paths: { "@/*": ["./src/*"] },
        },
      },
      { spaces: 2 },
    );
    return "done";
  }

  try {
    const tsconfig = await fs.readJson(tsconfigPath);
    const compilerOptions = tsconfig.compilerOptions ?? {};

    if (compilerOptions.paths?.["@/*"]) return "already";

    tsconfig.compilerOptions = {
      ...compilerOptions,
      baseUrl: compilerOptions.baseUrl ?? ".",
      paths: { ...compilerOptions.paths, "@/*": ["./src/*"] },
    };
    await fs.writeJson(tsconfigPath, tsconfig, { spaces: 2 });
    return "done";
  } catch {
    // tsconfig with comments or trailing commas — don't risk rewriting it
    return "manual";
  }
}

/** Adds the @tailwindcss/vite plugin to astro.config when it's safe to do so. */
async function wireTailwindPlugin(cwd: string): Promise<SetupResult> {
  const candidates = [
    "astro.config.mjs",
    "astro.config.ts",
    "astro.config.mts",
    "astro.config.js",
  ];

  for (const name of candidates) {
    const configPath = path.join(cwd, name);
    if (!(await fs.pathExists(configPath))) continue;

    let content = await fs.readFile(configPath, "utf-8");
    if (content.includes("@tailwindcss/vite")) return "already";

    // Only handle the simple case; if a vite block already exists, don't
    // risk mangling the user's config.
    if (/vite\s*:/.test(content) || !content.includes("defineConfig({")) {
      return "manual";
    }

    content = content.replace(
      "defineConfig({",
      "defineConfig({\n  vite: {\n    plugins: [tailwindcss()],\n  },",
    );
    content = `import tailwindcss from "@tailwindcss/vite";\n${content}`;
    await fs.writeFile(configPath, content);
    return "done";
  }

  return "manual";
}

export async function init(options: InitOptions) {
  const cwd = path.resolve(options.cwd);

  // Welcome!
  print.logo();
  console.log(`  ${messages.initStart()}`);
  print.newline();

  // Check if it's an Astro project
  const isAstro = await isAstroProject(cwd);
  if (!isAstro) {
    print.error(messages.notAstro());
    print.hint(messages.notAstroHelp());
    print.newline();
    process.exit(1);
  }

  // Check if already initialized
  const configPath = path.join(cwd, CONFIG_FILE);
  if (await fs.pathExists(configPath)) {
    print.warning(messages.alreadyInit());
    print.newline();

    const { overwrite } = options.yes
      ? { overwrite: true }
      : await prompts({
          type: "confirm",
          name: "overwrite",
          message: "Want to start fresh?",
          initial: false,
        });

    if (!overwrite) {
      print.hint("No changes made. Your config is safe!");
      print.newline();
      process.exit(0);
    }
  }

  const pm = detectPackageManager(cwd);

  // Check Tailwind
  const hasTailwind = await hasTailwindInstalled(cwd);
  if (!hasTailwind) {
    print.warning("Tailwind CSS isn't installed yet.");

    const { installTailwind } = options.yes
      ? { installTailwind: true }
      : await prompts({
          type: "confirm",
          name: "installTailwind",
          message: "Want me to install it for you?",
          initial: true,
        });

    if (installTailwind) {
      const spinner = ora({
        text: "Installing Tailwind CSS...",
        color: "green",
      }).start();

      try {
        const { command, args } = installCommand(
          pm,
          ["tailwindcss", "@tailwindcss/vite"],
          true
        );
        await execa(command, args, { cwd });
        spinner.succeed(brand.success("Tailwind CSS is ready"));
      } catch (error) {
        spinner.fail("Couldn't install Tailwind CSS");
        const { command, args } = installCommand(
          pm,
          ["tailwindcss", "@tailwindcss/vite"],
          true
        );
        print.hint(`Try manually: ${command} ${args.join(" ")}`);
      }
    }
  }

  // Get configuration
  let config: ProjectConfig = { ...DEFAULT_CONFIG };

  if (!options.yes) {
    print.newline();
    console.log(`  ${chalk.bold("Where should things go?")}`);
    print.newline();

    // Theme choices come from the registry; offline just offers the default
    let themeBases = ["neutral"];
    let themeAccents = ["default"];
    try {
      const index = await getRegistryIndex();
      if (index.themeBases?.length) themeBases = index.themeBases;
      if (index.themeAccents?.length) themeAccents = index.themeAccents;
    } catch {
      // Offline — the default theme ships regardless
    }

    const responses = await prompts([
      {
        type: "text",
        name: "componentsDir",
        message: "Components directory",
        initial: DEFAULT_CONFIG.componentsDir,
      },
      {
        type: "text",
        name: "utilsDir",
        message: "Utilities directory",
        initial: DEFAULT_CONFIG.utilsDir,
      },
      ...(themeBases.length > 1
        ? [
            {
              type: "select" as const,
              name: "themeBase",
              message: "Base color (grays and surfaces)",
              choices: themeBases.map((name) => ({
                title: name,
                value: name,
              })),
              initial: 0,
            },
          ]
        : []),
      ...(themeAccents.length > 1
        ? [
            {
              type: "select" as const,
              name: "themeAccent",
              message: "Accent color (buttons, focus rings)",
              choices: themeAccents.map((name) => ({
                title: name === "default" ? "default (neutral)" : name,
                value: name,
              })),
              initial: 0,
            },
          ]
        : []),
    ]);

    const { themeBase, themeAccent, ...dirs } = responses;
    config = {
      ...config,
      ...dirs,
      theme: composeThemeName(themeBase ?? "neutral", themeAccent ?? "default"),
    };
  }

  // Create directories
  const spinner = ora({
    text: "Setting things up...",
    color: "green",
  }).start();

  try {
    await fs.ensureDir(path.join(cwd, config.componentsDir));
    await fs.ensureDir(path.join(cwd, config.utilsDir));
    await fs.ensureDir(path.join(cwd, config.stylesDir));
    spinner.text = "Creating directories...";
  } catch (error) {
    spinner.fail("Couldn't create directories");
    process.exit(1);
  }

  // Create utility file (cn function) — prefer the registry version so
  // `bearnie diff` starts from a clean slate; fall back to a copy offline.
  const cnFallbackContent = `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

  try {
    const utilPath = path.join(cwd, config.utilsDir, "cn.ts");

    if (!(await fs.pathExists(utilPath))) {
      let cnContent = cnFallbackContent;
      try {
        const cnEntry = await getComponent("cn");
        const cnFile = cnEntry.files.find((f) => f.name === "cn.ts");
        if (cnFile) cnContent = cnFile.content;
      } catch {
        // Offline — the fallback copy works fine
      }
      await fs.writeFile(utilPath, cnContent);

      // Install clsx and tailwind-merge if not present
      const packageJson = await fs.readJson(path.join(cwd, "package.json"));
      const deps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      const toInstall: string[] = [];
      if (!("clsx" in deps)) toInstall.push("clsx");
      if (!("tailwind-merge" in deps)) toInstall.push("tailwind-merge");

      if (toInstall.length > 0) {
        spinner.text = "Installing utilities...";
        const { command, args } = installCommand(pm, toInstall);
        await execa(command, args, { cwd });
      }
    }
  } catch (error) {
    spinner.fail("Couldn't create utility files");
  }

  // Save configuration
  try {
    await saveProjectConfig(cwd, config);
    spinner.succeed(brand.success("Everything is set up"));
  } catch (error) {
    spinner.fail("Couldn't save configuration");
    process.exit(1);
  }

  const manualSteps: string[] = [];

  // Make sure `@/*` imports resolve (components import `@/utils/cn`)
  const tsconfigResult = await ensureTsconfigPaths(cwd);
  if (tsconfigResult === "done") {
    print.step(`${brand.success("✓")} Added ${chalk.cyan("@/*")} path alias to tsconfig.json`);
  } else if (tsconfigResult === "manual") {
    manualSteps.push(
      `Add to tsconfig.json: ${chalk.cyan(`"paths": { "@/*": ["./src/*"] }`)} under compilerOptions`
    );
  }

  // Wire the Tailwind vite plugin into astro.config
  const tailwindResult = await wireTailwindPlugin(cwd);
  if (tailwindResult === "done") {
    print.step(`${brand.success("✓")} Added ${chalk.cyan("@tailwindcss/vite")} to your Astro config`);
  } else if (tailwindResult === "manual") {
    manualSteps.push(
      `Add ${chalk.cyan("tailwindcss()")} from ${chalk.cyan("@tailwindcss/vite")} to vite.plugins in your Astro config`
    );
  }

  // Install the chosen theme's styles
  try {
    const stylesEntry = await getComponent(themeEntryName(config.theme));
    let stylesWritten = false;

    for (const file of stylesEntry.files) {
      const stylesPath = path.join(cwd, config.stylesDir, file.name);
      if (!(await fs.pathExists(stylesPath))) {
        await fs.ensureDir(path.dirname(stylesPath));
        await fs.writeFile(stylesPath, file.content);
        stylesWritten = true;
      }
    }

    if (stylesWritten) {
      const themeLabel =
        config.theme === "default" ? "" : ` (${config.theme} theme)`;
      print.step(
        `${brand.success("✓")} Added theme variables to ${chalk.cyan(`${config.stylesDir}/bearnie.css`)}${themeLabel}`
      );
      manualSteps.push(
        `Import the styles in your global CSS: ${chalk.cyan(`@import "./bearnie.css";`)} (after ${chalk.cyan(`@import "tailwindcss";`)})`
      );
    } else if (config.theme !== "default") {
      manualSteps.push(
        `bearnie.css already exists — switch to the ${config.theme} theme with ${chalk.cyan(`npx bearnie add ${themeEntryName(config.theme)} --overwrite`)}`
      );
    }
  } catch {
    manualSteps.push(`Add theme variables: ${chalk.cyan("npx bearnie add styles")}`);
  }

  // Done!
  print.newline();
  console.log(`  ${messages.initSuccess()}`);

  print.nextSteps([
    ...manualSteps,
    `Add your first component: ${chalk.cyan("npx bearnie add button")}`,
    `Browse all components: ${chalk.cyan("npx bearnie list")}`,
  ]);

  print.footer();
}
