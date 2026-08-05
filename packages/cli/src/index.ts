#!/usr/bin/env node
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { Command } from "commander";
import chalk from "chalk";
import { init } from "./commands/init.js";
import { add } from "./commands/add.js";
import { list } from "./commands/list.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(
  readFileSync(join(__dirname, "../package.json"), "utf-8"),
) as { version: string };

// Brand colors
const amber = chalk.hex("#F59E0B");
const logo = `${amber("🐻")} ${chalk.bold("bearnie")}`;

// Terminal hyperlink (OSC 8) - works in most modern terminals
const link = (text: string, url: string) =>
  `\u001B]8;;${url}\u0007${chalk.cyan(text)}\u001B]8;;\u0007`;

const program = new Command();

program
  .name("bearnie")
  .description("UI components for Astro")
  .version(pkg.version)
  .configureOutput({
    writeOut: (str) => process.stdout.write(str),
    writeErr: (str) => process.stdout.write(str),
    outputError: (str, write) => {
      write(`\n  ${logo}\n\n`);
      write(`  ${chalk.red("Oops!")} ${str.replace("error: ", "")}\n`);
    },
  })
  .addHelpText("beforeAll", `\n  ${logo}\n`)
  .addHelpText(
    "afterAll",
    `
  ${chalk.dim("Made with")} ${amber("🐻")} ${chalk.dim("by")} ${link("Michael Andreuzza", "https://michaelandreuzza.com")}
`,
  );

program
  .command("init")
  .description("Set up Bearnie in your project")
  .option("-y, --yes", "Skip prompts and use defaults")
  .option("--cwd <path>", "Working directory", process.cwd())
  .action(init);

program
  .command("add")
  .description("Add components to your project")
  .argument("[components...]", "Components to add")
  .option("-y, --yes", "Skip prompts and overwrite files")
  .option("-a, --all", "Add all components")
  .option("--cwd <path>", "Working directory", process.cwd())
  .action(add);

program
  .command("list")
  .description("Browse available components")
  .option("--json", "Output as JSON")
  .action(list);

// Show help with banner when no command
program.action(() => {
  console.log(`
  ${logo}

  ${amber("Hey!")} UI components for Astro.
  Built with Tailwind CSS, no frameworks required.

  ${chalk.bold("Commands:")}
    ${chalk.cyan("init")}          Set up Bearnie in your project
    ${chalk.cyan("add")} ${chalk.dim("<name>")}    Add a component
    ${chalk.cyan("list")}          Browse all components

  ${chalk.bold("Examples:")}
    ${chalk.dim("$")} npx bearnie init
    ${chalk.dim("$")} npx bearnie add button card
    ${chalk.dim("$")} npx bearnie add --all

  ${chalk.dim("Run")} ${chalk.cyan("bearnie <command> --help")} ${chalk.dim("for more info")}
`);
});

program.parse();

// Handle unknown commands
program.on("command:*", () => {
  console.log(`
  ${logo}

  ${chalk.yellow("Hmm,")} I don't know that command: ${chalk.red(program.args.join(" "))}

  Run ${chalk.cyan("npx bearnie --help")} to see what I can do.
`);
  process.exit(1);
});
