import chalk from "chalk";
import ora from "ora";
import path from "path";
import { structuredPatch } from "diff";
import { getProjectConfig, DEFAULT_CONFIG } from "../utils/config.js";
import { getInstalledEntries } from "../utils/installed.js";
import { brand, messages, print } from "../utils/ui.js";

interface DiffOptions {
  cwd: string;
  nameOnly?: boolean;
}

function printFileDiff(filePath: string, local: string, registry: string) {
  const patch = structuredPatch(filePath, filePath, local, registry, "", "", {
    context: 3,
  });

  for (const hunk of patch.hunks) {
    console.log(
      brand.info(
        `  @@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`,
      ),
    );
    for (const line of hunk.lines) {
      if (line.startsWith("+")) {
        console.log(`  ${chalk.green(line)}`);
      } else if (line.startsWith("-")) {
        console.log(`  ${chalk.red(line)}`);
      } else {
        console.log(`  ${chalk.dim(line)}`);
      }
    }
  }
}

export async function diff(components: string[], options: DiffOptions) {
  const cwd = path.resolve(options.cwd);
  const config = (await getProjectConfig(cwd)) ?? DEFAULT_CONFIG;

  print.logo();
  console.log(`  Comparing your components against the registry...`);
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
      `  ${brand.success("✓")} Everything is up to date with the registry.`,
    );
    print.newline();
    return;
  }

  for (const item of changed) {
    console.log(`  ${chalk.bold(item.entry.name)}`);
    for (const file of item.files) {
      if (file.status === "unchanged") continue;

      if (file.status === "missing") {
        console.log(
          `  ${brand.warning("+")} ${file.path} ${brand.muted("(not installed yet)")}`,
        );
        continue;
      }

      console.log(`  ${brand.warning("~")} ${file.path}`);
      if (!options.nameOnly && file.localContent !== undefined) {
        printFileDiff(file.path, file.localContent, file.registryContent);
      }
    }
    print.newline();
  }

  console.log(
    `  ${chalk.bold(changed.length)} component${changed.length > 1 ? "s" : ""} differ${changed.length > 1 ? "" : "s"} from the registry.`,
  );
  print.hint(
    `Pull the registry version with ${chalk.cyan(`npx bearnie update ${changed.map((c) => c.entry.name).join(" ")}`)}`,
  );
  print.newline();
}
