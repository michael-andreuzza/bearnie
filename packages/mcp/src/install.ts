import fs from "fs-extra";
import path from "path";
import { execFileSync } from "node:child_process";

const REGISTRY_URL =
  process.env.BEARNIE_REGISTRY_URL || "https://bearnie.dev/registry";

function getRegistryPath(): string | undefined {
  return process.env.BEARNIE_REGISTRY_PATH;
}

export interface ProjectConfig {
  componentsDir: string;
  utilsDir: string;
  stylesDir: string;
  /** Which color theme is installed ("default", "amber", ...). */
  theme: string;
}

export const DEFAULT_PROJECT_CONFIG: ProjectConfig = {
  componentsDir: "src/components/bearnie",
  utilsDir: "src/utils",
  stylesDir: "src/styles",
  theme: "default",
};

/** Registry entry name for a theme: "default" -> styles, "amber" -> styles-amber. */
export function themeEntryName(theme: string): string {
  return theme === "default" ? "styles" : `styles-${theme}`;
}

/** True for the styles/styles-* entries, which all install the same CSS file. */
export function isThemeEntry(name: string): boolean {
  return name === "styles" || name.startsWith("styles-");
}

/** Reads bearnie.json from the project root, falling back to defaults. */
export async function loadProjectConfig(
  projectRoot: string,
): Promise<ProjectConfig> {
  const configPath = path.join(projectRoot, "bearnie.json");
  try {
    if (await fs.pathExists(configPath)) {
      const raw = (await fs.readJson(configPath)) as Partial<ProjectConfig>;
      return { ...DEFAULT_PROJECT_CONFIG, ...raw };
    }
  } catch {
    // Malformed config: fall back to defaults rather than failing the install
  }
  return DEFAULT_PROJECT_CONFIG;
}

export interface ComponentFile {
  name: string;
  path: string;
  content: string;
}

export interface ComponentRegistry {
  name: string;
  type?: "utility" | "component" | "styles";
  description: string;
  category?: string;
  files: ComponentFile[];
  dependencies?: string[];
  registryDependencies?: string[];
}

export interface InstallResult {
  installed: string[];
  npmDependencies: string[];
  errors: string[];
}

export interface RegistryIndex {
  components: Array<{
    name: string;
    description: string;
    category: string;
  }>;
  utilities?: Array<{
    name: string;
    description: string;
  }>;
  themes?: string[];
  themeBases?: string[];
  themeAccents?: string[];
}

export type PackageManager = "npm" | "pnpm" | "yarn" | "bun";

/** Detects the project's package manager from its lockfile. */
export function detectPackageManager(projectRoot: string): PackageManager {
  if (fs.existsSync(path.join(projectRoot, "pnpm-lock.yaml"))) return "pnpm";
  if (
    fs.existsSync(path.join(projectRoot, "bun.lock")) ||
    fs.existsSync(path.join(projectRoot, "bun.lockb"))
  ) {
    return "bun";
  }
  if (fs.existsSync(path.join(projectRoot, "yarn.lock"))) return "yarn";
  return "npm";
}

/** The install command for the given package manager, e.g. `npm install`. */
export function installCommandFor(pm: PackageManager): {
  command: string;
  args: string[];
} {
  if (pm === "npm") {
    return { command: "npm", args: ["install", "--no-audit", "--no-fund"] };
  }
  return { command: pm, args: ["add"] };
}

export async function fetchComponent(
  name: string,
): Promise<ComponentRegistry | null> {
  try {
    const registryPath = getRegistryPath();
    if (registryPath) {
      const componentPath = path.join(registryPath, `${name}.json`);
      if (await fs.pathExists(componentPath)) {
        return (await fs.readJson(componentPath)) as ComponentRegistry;
      }
      return null;
    }

    const response = await fetch(`${REGISTRY_URL}/${name}.json`);
    if (!response.ok) return null;
    return (await response.json()) as ComponentRegistry;
  } catch {
    return null;
  }
}

export async function fetchIndex(): Promise<RegistryIndex | null> {
  try {
    const registryPath = getRegistryPath();
    if (registryPath) {
      const indexPath = path.join(registryPath, "index.json");
      if (await fs.pathExists(indexPath)) {
        return (await fs.readJson(indexPath)) as RegistryIndex;
      }
      return null;
    }

    const response = await fetch(`${REGISTRY_URL}/index.json`);
    if (!response.ok) return null;
    return (await response.json()) as RegistryIndex;
  } catch {
    return null;
  }
}

export function resolveInstallPath(
  projectRoot: string,
  file: ComponentFile,
  registryItem: ComponentRegistry,
  config: ProjectConfig = DEFAULT_PROJECT_CONFIG,
): string {
  const relativePath = file.path || file.name;

  if (registryItem.type === "utility" || relativePath.startsWith("utils/")) {
    return path.join(
      projectRoot,
      config.utilsDir,
      relativePath.replace(/^utils\//, ""),
    );
  }

  if (registryItem.type === "styles" || relativePath.startsWith("styles/")) {
    return path.join(
      projectRoot,
      config.stylesDir,
      relativePath.replace(/^styles\//, ""),
    );
  }

  return path.join(projectRoot, config.componentsDir, relativePath);
}

export async function resolveComponentDependencies(
  names: string[],
  resolved: Set<string> = new Set(),
): Promise<string[]> {
  const result: string[] = [];

  for (const name of names) {
    if (resolved.has(name)) continue;
    resolved.add(name);

    const component = await fetchComponent(name);
    if (!component) continue;

    if (component.registryDependencies?.length) {
      const deps = await resolveComponentDependencies(
        component.registryDependencies,
        resolved,
      );
      result.push(...deps);
    }

    result.push(name);
  }

  return result;
}

function orderWithBarrelLast(names: string[]): string[] {
  const unique = [...new Set(names)];
  const withoutBarrel = unique.filter((name) => name !== "barrel");
  if (unique.includes("barrel")) {
    withoutBarrel.push("barrel");
  }
  return withoutBarrel;
}

async function installSingleComponent(
  projectRoot: string,
  componentName: string,
  config: ProjectConfig,
): Promise<{ files: string[]; npmDependencies: string[]; error?: string }> {
  const component = await fetchComponent(componentName);
  if (!component) {
    return {
      files: [],
      npmDependencies: [],
      error: `Component '${componentName}' not found`,
    };
  }

  const files: string[] = [];

  // Registry dependencies are already resolved and ordered by
  // installComponents, so only this entry's own files are written here.
  for (const file of component.files) {
    const filePath = resolveInstallPath(projectRoot, file, component, config);
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, file.content);
    files.push(file.path || file.name);
  }

  return { files, npmDependencies: [...(component.dependencies ?? [])] };
}

export async function installComponents(
  projectRoot: string,
  names: string[],
): Promise<InstallResult> {
  const config = await loadProjectConfig(projectRoot);
  const resolved = await resolveComponentDependencies(names);
  const ordered = orderWithBarrelLast(resolved);

  const installed: string[] = [];
  const npmDependencies = new Set<string>();
  const errors: string[] = [];

  for (const name of ordered) {
    const result = await installSingleComponent(projectRoot, name, config);
    if (result.error) {
      errors.push(result.error);
      continue;
    }
    installed.push(name);
    result.npmDependencies.forEach((dep) => npmDependencies.add(dep));
  }

  // Record an explicitly installed theme in bearnie.json so future
  // status checks compare against the right palette.
  const themeInstalled = names.find(
    (name) => isThemeEntry(name) && installed.includes(name),
  );
  if (themeInstalled) {
    const theme =
      themeInstalled === "styles"
        ? "default"
        : themeInstalled.replace(/^styles-/, "");
    const configPath = path.join(projectRoot, "bearnie.json");
    try {
      if ((await fs.pathExists(configPath)) && config.theme !== theme) {
        const raw = (await fs.readJson(configPath)) as Record<string, unknown>;
        await fs.writeJson(configPath, { ...raw, theme }, { spaces: 2 });
      }
    } catch {
      // Malformed bearnie.json — installing still succeeded
    }
  }

  return {
    installed,
    npmDependencies: [...npmDependencies],
    errors,
  };
}

/**
 * Installs npm dependencies that are not already present in the project's
 * package.json. Returns the packages actually installed, or an error message.
 */
export async function installNpmDependencies(
  projectRoot: string,
  dependencies: string[],
): Promise<{ installed: string[]; error?: string }> {
  if (dependencies.length === 0) return { installed: [] };

  const packageJsonPath = path.join(projectRoot, "package.json");
  if (!(await fs.pathExists(packageJsonPath))) {
    return { installed: [], error: "No package.json found in project root" };
  }

  const packageJson = (await fs.readJson(packageJsonPath)) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const existing = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  const missing = dependencies.filter((dep) => !(dep in existing));
  if (missing.length === 0) return { installed: [] };

  const pm = detectPackageManager(projectRoot);
  const { command, args } = installCommandFor(pm);

  try {
    execFileSync(command, [...args, ...missing], {
      cwd: projectRoot,
      stdio: "pipe",
      timeout: 300_000,
    });
    return { installed: missing };
  } catch (error) {
    return {
      installed: [],
      error: `${command} install failed: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

export type InstalledStatus = "up-to-date" | "modified" | "incomplete";

export interface InstalledComponent {
  name: string;
  type: string;
  status: InstalledStatus;
  changedFiles: string[];
}

/**
 * Scans the project for installed registry entries and compares each file
 * against the registry version.
 */
export async function listInstalledComponents(
  projectRoot: string,
): Promise<InstalledComponent[] | null> {
  const index = await fetchIndex();
  if (!index) return null;

  const config = await loadProjectConfig(projectRoot);

  // All theme entries install the same CSS file, so only compare against
  // the theme configured in bearnie.json.
  const activeTheme = themeEntryName(config.theme ?? "default");
  const allNames = new Set([
    ...index.components.map((c) => c.name),
    ...(index.utilities ?? []).map((u) => u.name),
    ...(index.themes ?? []).map((theme) => themeEntryName(theme)),
  ]);
  const names = [...allNames].filter(
    (name) => !isThemeEntry(name) || name === activeTheme,
  );

  const installed: InstalledComponent[] = [];

  for (const name of names) {
    const component = await fetchComponent(name);
    if (!component) continue;

    let anyExists = false;
    let anyMissing = false;
    const changedFiles: string[] = [];

    for (const file of component.files) {
      const filePath = resolveInstallPath(projectRoot, file, component, config);
      if (await fs.pathExists(filePath)) {
        anyExists = true;
        const local = await fs.readFile(filePath, "utf-8");
        if (local !== file.content) {
          changedFiles.push(file.path || file.name);
        }
      } else {
        anyMissing = true;
      }
    }

    if (!anyExists) continue;

    let status: InstalledStatus = "up-to-date";
    if (anyMissing) status = "incomplete";
    else if (changedFiles.length > 0) status = "modified";

    installed.push({
      name,
      type: component.type ?? "component",
      status,
      changedFiles,
    });
  }

  return installed;
}

export function toPascalCase(name: string): string {
  return name
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");
}

export function getUsageExample(component: ComponentRegistry): string {
  if (component.name === "barrel") {
    return `\`\`\`astro
---
import { Button, Card } from "@/components/bearnie";
---

<Button>Click me</Button>
\`\`\``;
  }

  if (component.type === "styles") {
    return `\`\`\`css
@import "tailwindcss";
@import "./bearnie.css";
\`\`\``;
  }

  if (component.type === "utility") {
    return "Utility added to `src/utils/`. Import it where needed in your components.";
  }

  const componentName = toPascalCase(component.name);
  return `\`\`\`astro
---
import ${componentName} from "@/components/bearnie/${component.name}/${componentName}.astro";
---

<${componentName}>Content</${componentName}>
\`\`\``;
}
