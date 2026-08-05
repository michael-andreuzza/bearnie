/**
 * Release helper: bump versions, update changelog, build, commit, tag, optional publish.
 *
 * Usage:
 *   npm run release -- --dry-run
 *   npm run release -- --bump patch
 *   npm run release -- --publish
 *   npm run release -- --no-git
 */
import { execSync } from "node:child_process";
import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline/promises";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const PACKAGE_PATHS = {
  cli: path.join(ROOT, "packages/cli/package.json"),
  create: path.join(ROOT, "packages/create-bearnie/package.json"),
  mcp: path.join(ROOT, "packages/mcp/package.json"),
  root: path.join(ROOT, "package.json"),
} as const;

const WORKSPACES = ["bearnie", "create-bearnie", "@bearnie/mcp"] as const;

type BumpType = "patch" | "minor" | "major";

interface Args {
  dryRun: boolean;
  publish: boolean;
  noGit: boolean;
  bump: BumpType;
  notes: string;
}

function parseArgs(): Args {
  const argv = process.argv.slice(2);
  let bump: BumpType = "patch";
  let notes = "";

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") continue;
    if (arg === "--publish") continue;
    if (arg === "--no-git") continue;
    if (arg.startsWith("--bump=")) {
      bump = arg.split("=")[1] as BumpType;
      continue;
    }
    if (arg === "--bump") {
      bump = (argv[++i] ?? "patch") as BumpType;
      continue;
    }
    if (arg === "--notes") {
      notes = argv[++i] ?? "";
      continue;
    }
  }

  return {
    dryRun: argv.includes("--dry-run"),
    publish: argv.includes("--publish"),
    noGit: argv.includes("--no-git"),
    bump,
    notes,
  };
}

function bumpSemver(version: string, type: BumpType): string {
  const [major, minor, patch] = version.split(".").map(Number);
  if (type === "major") return `${major + 1}.0.0`;
  if (type === "minor") return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

async function readJson<T>(filePath: string): Promise<T> {
  return fs.readJson(filePath) as Promise<T>;
}

function run(cmd: string, dryRun: boolean) {
  console.log(`\n$ ${cmd}`);
  if (!dryRun) {
    execSync(cmd, { cwd: ROOT, stdio: "inherit" });
  }
}

async function promptReleaseNotes(defaultNotes: string): Promise<string> {
  if (defaultNotes) return defaultNotes;
  if (!process.stdin.isTTY) return "See commit history for details.";

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\nEnter release notes (blank line to finish):");
  const lines: string[] = [];
  while (true) {
    const line = await rl.question("> ");
    if (!line.trim()) break;
    lines.push(line);
  }
  rl.close();
  return lines.length > 0 ? lines.join("\n") : "Maintenance release.";
}

function updateChangelog(
  newVersions: { cli: string; create: string; mcp: string },
  notes: string,
  dryRun: boolean,
) {
  const changelogPath = path.join(ROOT, "CHANGELOG.md");
  const content = fs.readFileSync(changelogPath, "utf-8");
  const date = new Date().toISOString().slice(0, 10);
  const heading = `## [${newVersions.cli} / ${newVersions.create} / ${newVersions.mcp}] - ${date}`;
  const section = `${heading}\n\n${notes
    .split("\n")
    .map((line) => (line.startsWith("-") ? line : `- ${line}`))
    .join("\n")}\n\n`;

  const updated = content.replace(
    "## [Unreleased]\n",
    `## [Unreleased]\n\n${section}`,
  );

  console.log(`\nChangelog preview:\n${section}`);
  if (!dryRun) {
    fs.writeFileSync(changelogPath, updated);
  }
}

async function main() {
  const args = parseArgs();

  const cliPkg = await readJson<{ version: string }>(PACKAGE_PATHS.cli);
  const createPkg = await readJson<{ version: string }>(PACKAGE_PATHS.create);
  const mcpPkg = await readJson<{ version: string }>(PACKAGE_PATHS.mcp);
  const rootPkg = await readJson<{ registryVersion?: string }>(
    PACKAGE_PATHS.root,
  );

  const newVersions = {
    cli: bumpSemver(cliPkg.version, args.bump),
    create: bumpSemver(createPkg.version, args.bump),
    mcp: bumpSemver(mcpPkg.version, args.bump),
    registry: bumpSemver(rootPkg.registryVersion ?? "0.2.0", args.bump),
  };

  console.log("Planned version bumps:");
  console.log(`  bearnie:         ${cliPkg.version} -> ${newVersions.cli}`);
  console.log(
    `  create-bearnie:  ${createPkg.version} -> ${newVersions.create}`,
  );
  console.log(`  @bearnie/mcp:    ${mcpPkg.version} -> ${newVersions.mcp}`);
  console.log(
    `  registryVersion: ${rootPkg.registryVersion ?? "0.2.0"} -> ${newVersions.registry}`,
  );

  if (args.dryRun) {
    console.log("\nDry run — no files changed.");
    return;
  }

  if (!args.notes) {
    args.notes = await promptReleaseNotes(args.notes);
  }

  await fs.writeJson(
    PACKAGE_PATHS.cli,
    { ...(await readJson(PACKAGE_PATHS.cli)), version: newVersions.cli },
    { spaces: 2 },
  );
  await fs.writeJson(
    PACKAGE_PATHS.create,
    { ...(await readJson(PACKAGE_PATHS.create)), version: newVersions.create },
    { spaces: 2 },
  );
  await fs.writeJson(
    PACKAGE_PATHS.mcp,
    { ...(await readJson(PACKAGE_PATHS.mcp)), version: newVersions.mcp },
    { spaces: 2 },
  );
  await fs.writeJson(
    PACKAGE_PATHS.root,
    {
      ...(await readJson(PACKAGE_PATHS.root)),
      registryVersion: newVersions.registry,
    },
    { spaces: 2 },
  );

  updateChangelog(newVersions, args.notes, false);

  run("npm run build:all", false);

  const tag = `v${newVersions.cli}`;

  if (!args.noGit) {
    run("git add -A", false);
    run(
      `git commit -m "release: bearnie@${newVersions.cli}, create-bearnie@${newVersions.create}, @bearnie/mcp@${newVersions.mcp}"`,
      false,
    );
    run(`git tag -a ${tag} -m "Release ${tag}"`, false);
  }

  if (args.publish) {
    for (const workspace of WORKSPACES) {
      run(`npm publish -w ${workspace}`, false);
    }

    try {
      execSync("gh --version", { stdio: "ignore" });
      const notesFile = path.join(ROOT, ".release-notes.md");
      fs.writeFileSync(notesFile, args.notes);
      run(
        `gh release create ${tag} --title "${tag}" --notes-file .release-notes.md`,
        false,
      );
      fs.removeSync(notesFile);
    } catch {
      console.log("\ngh not available — skipped GitHub release creation.");
    }
  }

  console.log("\nRelease complete.");
  if (!args.publish) {
    console.log("Publish manually: npm publish -w bearnie && ...");
  }
  if (!args.noGit) {
    console.log(`Push: git push origin main && git push origin ${tag}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
