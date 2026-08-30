import fs from "fs-extra";
import path from "path";

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/**
 * Detects the project's package manager from its lockfile, falling back to
 * the npm_config_user_agent set by `npx` / `pnpm dlx` / `yarn dlx` / `bunx`.
 */
export function detectPackageManager(cwd: string): PackageManager {
  if (fs.existsSync(path.join(cwd, "pnpm-lock.yaml"))) return "pnpm";
  if (
    fs.existsSync(path.join(cwd, "bun.lock")) ||
    fs.existsSync(path.join(cwd, "bun.lockb"))
  ) {
    return "bun";
  }
  if (fs.existsSync(path.join(cwd, "yarn.lock"))) return "yarn";
  if (fs.existsSync(path.join(cwd, "package-lock.json"))) return "npm";

  const userAgent = process.env.npm_config_user_agent ?? "";
  if (userAgent.startsWith("pnpm")) return "pnpm";
  if (userAgent.startsWith("yarn")) return "yarn";
  if (userAgent.startsWith("bun")) return "bun";

  return "npm";
}

/** Arguments for installing packages with the given package manager. */
export function installCommand(
  pm: PackageManager,
  packages: string[],
  dev = false,
): { command: string; args: string[] } {
  const devFlag = dev ? ["-D"] : [];

  if (pm === "npm") {
    return { command: "npm", args: ["install", ...devFlag, ...packages] };
  }
  // pnpm, yarn, and bun all use `add`
  return { command: pm, args: ["add", ...devFlag, ...packages] };
}
