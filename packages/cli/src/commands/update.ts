import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import path from "path";
import fs from "fs-extra";
import { execa } from "execa";
import { getProjectConfig, DEFAULT_CONFIG } from "../utils/config.js";
import { getInstalledEntries } from "../utils/installed.js";
import { detectPackageManager, installCommand } from "../utils/pm.js";
import { brand, messages, print } from "../utils/ui.js";

interface UpdateOptions {
  cwd: string;
  yes?: boolean;
}

export async function update(components: string[], options: UpdateOptions) {
  const cwd = path.resolve(options.cwd);
  const config = (await getProjectConfig(cwd)) ?? DEFAULT_CONFIG;

  print.logo();
  console.log(`  Let's bring your components up to date.`);
  print.newline();

  const spinner = ora({ text: messages.fetching(), color: "green" }).start();

  let installed;
  try {
    installed = await getInstalledEntries(cwd, config, components);
  } catch (error) {
    spinner.fail(
      error instanceof Error ? error.message : messages.networkError(),
    );
    print.hint(`Run ${chalk.cyan("npx bearnie list")} to see valid names.`);
    print.newline();
    process.exit(1);
  }

  if (installed.length === 0) {
    spinner.fail("No installed Bearnie components found.");
    print.hint(`Add some first: ${chalk.cyan("npx bearnie add button")}`);
    print.newline();
    return;
  }

  const changed = installed.filter((item) => item.hasChanges);
  spinner.succeed(
    `Checked ${chalk.bold(installed.length)} installed component${installed.length > 1 ? "s" : ""}`,
  );
  print.newline();

  if (changed.length === 0) {
    console.log(
      `  ${brand.success("✓")} Everything is already up to date.`,
    );
    print.newline();
    return;
  }

  const changedFiles = changed.flatMap((item) =>
    item.files.filter((file) => file.status !== "unchanged"),
  );
  const modifiedCount = changedFiles.filter(
    (file) => file.status === "modified",
  ).length;

  console.log(`  ${chalk.bold("These will be updated:")}`);
  for (const item of changed) {
    const parts = item.files
      .filter((file) => file.status !== "unchanged")
      .map((file) =>
        file.status === "missing" ? `${file.path} (new)` : file.path,
      );
    console.log(
      `  ${brand.warning("~")} ${chalk.bold(item.entry.name)} ${brand.muted(`(${parts.join(", ")})`)}`,
    );
  }
  print.newline();

  if (modifiedCount > 0) {
    print.warning(
      `${modifiedCount} file${modifiedCount > 1 ? "s" : ""} differ${modifiedCount > 1 ? "" : "s"} locally — updating overwrites your local edits.`,
    );
    print.hint(
      `Review changes first with ${chalk.cyan("npx bearnie diff")}`,
    );
    print.newline();
  }

  if (!options.yes) {
    const { proceed } = await prompts({
      type: "confirm",
      name: "proceed",
      message: `Update ${changed.length} component${changed.length > 1 ? "s" : ""}?`,
      initial: true,
    });

    if (!proceed) {
      print.hint("No changes made.");
      print.newline();
      return;
    }
    print.newline();
  }

  // Write registry content and collect npm dependencies
  const npmDeps = new Set<string>();
  let written = 0;

  for (const item of changed) {
    const writeSpinner = ora({
      text: `Updating ${chalk.cyan(item.entry.name)}...`,
      color: "green",
    }).start();

    try {
      for (const file of item.files) {
        if (file.status === "unchanged") continue;
        await fs.ensureDir(path.dirname(file.absPath));
        await fs.writeFile(file.absPath, file.registryContent);
        written++;
      }
      item.entry.dependencies?.forEach((dep) => npmDeps.add(dep));
      writeSpinner.succeed(`${item.entry.name} updated`);
    } catch (error) {
      writeSpinner.fail(`Couldn't update ${item.entry.name}`);
      print.hint(`${error}`);
    }
  }

  // Install any npm dependencies the updated components need
  if (npmDeps.size > 0) {
    try {
      const packageJson = await fs.readJson(path.join(cwd, "package.json"));
      const existing = {
        ...packageJson.dependencies,
        ...packageJson.devDependencies,
      };
      const missing = [...npmDeps].filter((dep) => !(dep in existing));

      if (missing.length > 0) {
        const pm = detectPackageManager(cwd);
        const depsSpinner = ora({
          text: `Installing ${missing.join(", ")} with ${pm}...`,
          color: "green",
        }).start();

        try {
          const { command, args } = installCommand(pm, missing);
          await execa(command, args, { cwd });
          depsSpinner.succeed("Dependencies installed");
        } catch {
          depsSpinner.fail("Some dependencies couldn't be installed");
          print.hint(`Install manually: ${missing.join(" ")}`);
        }
      }
    } catch {
      // No package.json — skip dependency installation
    }
  }

  print.newline();
  console.log(
    `  ${brand.success("✓")} Updated ${chalk.bold(written)} file${written > 1 ? "s" : ""} across ${chalk.bold(changed.length)} component${changed.length > 1 ? "s" : ""}.`,
  );
  print.success();
}
