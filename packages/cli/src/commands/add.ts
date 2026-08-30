import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import path from "path";
import fs from "fs-extra";
import { execa } from "execa";
import {
  getProjectConfig,
  DEFAULT_CONFIG,
  isThemeEntry,
  resolveInstallPath,
  saveProjectConfig,
} from "../utils/config.js";
import {
  getRegistryIndex,
  getComponent,
  resolveComponentDependencies,
  type RegistryComponent,
} from "../utils/registry.js";
import { detectPackageManager, installCommand } from "../utils/pm.js";
import { brand, messages, print } from "../utils/ui.js";

interface AddOptions {
  yes?: boolean;
  all?: boolean;
  overwrite?: boolean;
  cwd: string;
}

export async function add(components: string[], options: AddOptions) {
  const cwd = path.resolve(options.cwd);

  // Welcome!
  print.logo();
  console.log(`  ${messages.addStart()}`);
  print.newline();

  // Check for config
  let config = await getProjectConfig(cwd);
  const hadConfig = config !== null;

  if (!config) {
    print.warning(
      `Project not initialized. Run ${chalk.cyan("npx bearnie init")} first.`
    );
    print.newline();

    const { proceed } = options.yes
      ? { proceed: true }
      : await prompts({
          type: "confirm",
          name: "proceed",
          message: "Want to use default settings for now?",
          initial: true,
        });

    if (!proceed) {
      process.exit(0);
    }

    config = DEFAULT_CONFIG;
  }

  // Fetch registry index
  const indexSpinner = ora({
    text: messages.fetching(),
    color: "green",
  }).start();

  let registryIndex;
  try {
    registryIndex = await getRegistryIndex();
    indexSpinner.succeed(messages.foundComponents(registryIndex.components.length));
  } catch {
    indexSpinner.fail(messages.networkError());
    print.hint(messages.networkErrorHelp());
    process.exit(1);
  }

  // Get components to install
  let selectedComponents: string[] = [];

  if (options.all) {
    selectedComponents = registryIndex.components.map((c) => c.name);
  } else if (components.length === 0) {
    // Interactive selection
    print.newline();
    const { selected } = await prompts({
      type: "multiselect",
      name: "selected",
      message: "What would you like to add?",
      choices: registryIndex.components.map((c) => ({
        title: c.name,
        description: c.description,
        value: c.name,
      })),
      hint: "Space to select, Enter to confirm",
      instructions: false,
    });

    if (!selected || selected.length === 0) {
      print.hint("No components selected.");
      print.newline();
      process.exit(0);
    }

    selectedComponents = selected;
  } else {
    // Validate provided component names (themes count too: styles-slate-blue)
    const availableNames = new Set(registryIndex.components.map((c) => c.name));
    for (const theme of registryIndex.themes ?? []) {
      availableNames.add(theme === "default" ? "styles" : `styles-${theme}`);
    }
    const invalid = components.filter((c) => !availableNames.has(c));

    if (invalid.length > 0) {
      print.error(messages.unknownComponent(invalid));
      print.hint(`Run ${chalk.cyan("npx bearnie list")} to see what's available.`);
      print.newline();
      process.exit(1);
    }

    selectedComponents = components;
  }

  // Resolve dependencies
  const resolveSpinner = ora({
    text: messages.resolving(),
    color: "green",
  }).start();

  let allComponents: string[];
  try {
    allComponents = await resolveComponentDependencies(selectedComponents);
    const extraDeps = allComponents.length - selectedComponents.length;
    if (extraDeps > 0) {
      resolveSpinner.succeed(
        `Adding ${chalk.bold(selectedComponents.length)} component${selectedComponents.length > 1 ? "s" : ""} ${brand.muted(`(+${extraDeps} dependencies)`)}`
      );
    } else {
      resolveSpinner.succeed(
        `Adding ${chalk.bold(allComponents.length)} component${allComponents.length > 1 ? "s" : ""}`
      );
    }
  } catch {
    resolveSpinner.fail("Couldn't resolve dependencies");
    process.exit(1);
  }

  print.newline();

  // Track what we need to install
  const npmDeps = new Set<string>();
  const npmDevDeps = new Set<string>();
  const writtenFiles: string[] = [];
  const skippedFiles: string[] = [];

  // Fetch everything first so we can warn about existing files up front
  interface PlannedFile {
    registryPath: string;
    absPath: string;
    content: string;
    exists: boolean;
  }
  const plans: { component: RegistryComponent; files: PlannedFile[] }[] = [];

  for (const componentName of allComponents) {
    try {
      const component = await getComponent(componentName);
      component.dependencies?.forEach((d) => npmDeps.add(d));
      component.devDependencies?.forEach((d) => npmDevDeps.add(d));

      const files: PlannedFile[] = [];
      for (const file of component.files) {
        const absPath = resolveInstallPath(
          cwd,
          config,
          file.path,
          component.type
        );
        files.push({
          registryPath: file.path,
          absPath,
          content: file.content,
          exists: await fs.pathExists(absPath),
        });
      }

      plans.push({ component, files });
    } catch (error) {
      print.error(`Couldn't fetch ${componentName}`);
      print.hint(`${error}`);
    }
  }

  // Ask before overwriting anything that already exists
  const existingFiles = plans.flatMap((p) => p.files.filter((f) => f.exists));
  let overwrite = Boolean(options.yes || options.overwrite);

  if (existingFiles.length > 0 && !overwrite) {
    print.warning(
      `${existingFiles.length} file${existingFiles.length > 1 ? "s" : ""} already exist${existingFiles.length > 1 ? "" : "s"}:`
    );
    existingFiles.slice(0, 5).forEach((f) => {
      console.log(brand.muted(`     ${f.registryPath}`));
    });
    if (existingFiles.length > 5) {
      console.log(brand.muted(`     ...and ${existingFiles.length - 5} more`));
    }
    print.newline();

    const { confirmOverwrite } = await prompts({
      type: "confirm",
      name: "confirmOverwrite",
      message: "Overwrite existing files?",
      initial: false,
    });

    overwrite = Boolean(confirmOverwrite);
    print.newline();
  }

  // Install each component
  for (const { component, files } of plans) {
    const spinner = ora({
      text: messages.installing(component.name),
      color: "green",
    }).start();

    try {
      for (const file of files) {
        if (file.exists && !overwrite) {
          skippedFiles.push(file.registryPath);
          continue;
        }

        await fs.ensureDir(path.dirname(file.absPath));
        await fs.writeFile(file.absPath, file.content);
        writtenFiles.push(file.registryPath);
      }

      spinner.succeed(messages.installed(component.name));
    } catch (error) {
      spinner.fail(`Couldn't add ${component.name}`);
      print.hint(`${error}`);
    }
  }

  // If a theme was explicitly installed, record it in bearnie.json so
  // diff/update compare against the right palette from now on.
  if (hadConfig) {
    const themeInstalled = selectedComponents.find((name) =>
      isThemeEntry(name),
    );
    if (themeInstalled) {
      const theme =
        themeInstalled === "styles"
          ? "default"
          : themeInstalled.replace(/^styles-/, "");
      if (config.theme !== theme) {
        config = { ...config, theme };
        await saveProjectConfig(cwd, config);
        print.step(`${brand.success("✓")} Theme set to ${chalk.cyan(theme)} in bearnie.json`);
      }
    }
  }

  // Install npm dependencies
  const allDeps = [...npmDeps];
  const allDevDeps = [...npmDevDeps];

  if (allDeps.length > 0 || allDevDeps.length > 0) {
    const pm = detectPackageManager(cwd);
    const depsSpinner = ora({
      text: messages.installingDeps(),
      color: "green",
    }).start();

    try {
      const packageJson = await fs.readJson(path.join(cwd, "package.json"));
      const existingDeps = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };

      // Filter out already installed deps
      const newDeps = allDeps.filter((d) => !(d in existingDeps));
      const newDevDeps = allDevDeps.filter((d) => !(d in existingDeps));

      if (newDeps.length > 0) {
        const { command, args } = installCommand(pm, newDeps);
        await execa(command, args, { cwd });
      }

      if (newDevDeps.length > 0) {
        const { command, args } = installCommand(pm, newDevDeps, true);
        await execa(command, args, { cwd });
      }

      depsSpinner.succeed(`Dependencies installed ${brand.muted(`(${pm})`)}`);
    } catch {
      depsSpinner.fail("Some dependencies couldn't be installed");
      print.hint("You might need to install them manually.");
    }
  }

  // Summary
  print.newline();

  if (writtenFiles.length > 0) {
    console.log(
      `  ${brand.success("✓")} Created ${chalk.bold(writtenFiles.length)} file${writtenFiles.length > 1 ? "s" : ""}:`
    );
    writtenFiles.slice(0, 5).forEach((f) => {
      console.log(brand.muted(`     ${f}`));
    });
    if (writtenFiles.length > 5) {
      console.log(brand.muted(`     ...and ${writtenFiles.length - 5} more`));
    }
  }

  if (skippedFiles.length > 0) {
    print.newline();
    console.log(
      `  ${brand.warning("⚠")} Skipped ${skippedFiles.length} existing file${skippedFiles.length > 1 ? "s" : ""}`
    );
    print.hint(`Use ${chalk.cyan("--overwrite")} to replace them.`);
  }

  // Done!
  print.newline();
  print.success();
  print.newline();
  print.footer();
}
