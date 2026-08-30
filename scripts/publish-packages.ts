/**
 * Publishes workspace packages whose local version isn't on npm yet.
 * Used by the tag-triggered publish workflow; safe to re-run.
 *
 * Usage: npx tsx scripts/publish-packages.ts [--dry-run]
 */
import { execSync } from "node:child_process";
import fs from "fs-extra";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

const WORKSPACES = [
  { name: "bearnie", dir: "packages/cli" },
  { name: "create-bearnie", dir: "packages/create-bearnie" },
  { name: "@bearnie/mcp", dir: "packages/mcp" },
] as const;

const dryRun = process.argv.includes("--dry-run");

function isPublished(name: string, version: string): boolean {
  try {
    const output = execSync(`npm view ${name}@${version} version`, {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return output === version;
  } catch {
    // 404 — package (or version) doesn't exist yet
    return false;
  }
}

async function main() {
  let published = 0;

  for (const workspace of WORKSPACES) {
    const pkg = (await fs.readJson(
      path.join(ROOT, workspace.dir, "package.json"),
    )) as { version: string };

    if (isPublished(workspace.name, pkg.version)) {
      console.log(`- ${workspace.name}@${pkg.version} already on npm, skipping`);
      continue;
    }

    // Provenance requires the GitHub Actions OIDC token
    const provenance = process.env.GITHUB_ACTIONS ? " --provenance" : "";
    const command = `npm publish -w ${workspace.name} --access public${provenance}`;

    console.log(`+ ${workspace.name}@${pkg.version} -> ${command}`);
    if (!dryRun) {
      execSync(command, { cwd: ROOT, stdio: "inherit" });
    }
    published++;
  }

  console.log(
    dryRun
      ? `\nDry run: ${published} package(s) would be published.`
      : `\nPublished ${published} package(s).`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
