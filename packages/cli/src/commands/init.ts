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
import { brand, messages, print } from "../utils/ui.js";

interface InitOptions {
  yes?: boolean;
  cwd: string;
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
        await execa(
          "npm",
          ["install", "-D", "tailwindcss", "@tailwindcss/vite"],
          { cwd }
        );
        spinner.succeed(brand.success("Tailwind CSS is ready"));
      } catch (error) {
        spinner.fail("Couldn't install Tailwind CSS");
        print.hint(
          "Try manually: npm install -D tailwindcss @tailwindcss/vite"
        );
      }
    }
  }

  // Get configuration
  let config: ProjectConfig = { ...DEFAULT_CONFIG };

  if (!options.yes) {
    print.newline();
    console.log(`  ${chalk.bold("Where should things go?")}`);
    print.newline();

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
    ]);

    config = {
      ...config,
      ...responses,
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

  // Create utility file (cn function)
  const cnUtilContent = `import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;

  try {
    const utilPath = path.join(cwd, config.utilsDir, "cn.ts");

    if (!(await fs.pathExists(utilPath))) {
      await fs.writeFile(utilPath, cnUtilContent);

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
        await execa("npm", ["install", ...toInstall], { cwd });
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

  // Done!
  print.newline();
  console.log(`  ${messages.initSuccess()}`);

  print.nextSteps([
    `Add your first component: ${chalk.cyan("npx bearnie add button")}`,
    `Browse all components: ${chalk.cyan("npx bearnie list")}`,
    `Add CSS variables: ${chalk.cyan("npx bearnie add styles")}`,
  ]);

  print.footer();
}
