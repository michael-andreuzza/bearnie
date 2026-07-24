import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import path from "path";
import fs from "fs-extra";
import { execa } from "execa";
import {
  getProjectConfig,
  DEFAULT_CONFIG,
  resolveInstallPath,
} from "../utils/config.js";
import {
  getRegistryIndex,
  getComponent,
  resolveComponentDependencies,
} from "../utils/registry.js";
import { brand, messages, print } from "../utils/ui.js";

interface AddOptions {
  yes?: boolean;
  all?: boolean;
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
    // Validate provided component names
    const availableNames = registryIndex.components.map((c) => c.name);
    const invalid = components.filter((c) => !availableNames.includes(c));

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

  // Install each component
  for (const componentName of allComponents) {
    const spinner = ora({
      text: messages.installing(componentName),
      color: "green",
    }).start();

    try {
      const component = await getComponent(componentName);

      // Collect npm dependencies
      component.dependencies?.forEach((d) => npmDeps.add(d));
      component.devDependencies?.forEach((d) => npmDevDeps.add(d));

      // Write files
      for (const file of component.files) {
        const filePath = resolveInstallPath(
          cwd,
          config,
          file.path,
          component.type
        );
        const exists = await fs.pathExists(filePath);

        if (exists && !options.yes) {
          skippedFiles.push(file.path);
          continue;
        }

        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, file.content);
        writtenFiles.push(file.path);
      }

      spinner.succeed(messages.installed(componentName));
    } catch (error) {
      spinner.fail(`Couldn't add ${componentName}`);
      print.hint(`${error}`);
    }
  }

  // Install npm dependencies
  const allDeps = [...npmDeps];
  const allDevDeps = [...npmDevDeps];

  if (allDeps.length > 0 || allDevDeps.length > 0) {
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
        await execa("npm", ["install", ...newDeps], { cwd });
      }

      if (newDevDeps.length > 0) {
        await execa("npm", ["install", "-D", ...newDevDeps], { cwd });
      }

      depsSpinner.succeed("Dependencies installed");
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
    print.hint(`Use ${chalk.cyan("--yes")} to overwrite.`);
  }

  // Done!
  print.newline();
  print.success();
}
