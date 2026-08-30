import path from "path";
import fs from "fs-extra";

export interface ProjectConfig {
  componentsDir: string;
  utilsDir: string;
  stylesDir: string;
  tailwindConfig: string;
  typescript: boolean;
  /** Which color theme is installed ("default", "amber", ...). */
  theme: string;
}

export const DEFAULT_CONFIG: ProjectConfig = {
  componentsDir: "src/components/bearnie",
  utilsDir: "src/utils",
  stylesDir: "src/styles",
  tailwindConfig: "tailwind.config.mjs",
  typescript: true,
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

export const CONFIG_FILE = "bearnie.json";

export async function getProjectConfig(
  cwd: string
): Promise<ProjectConfig | null> {
  const configPath = path.join(cwd, CONFIG_FILE);

  if (await fs.pathExists(configPath)) {
    const content = await fs.readFile(configPath, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(content) };
  }

  return null;
}

export async function saveProjectConfig(
  cwd: string,
  config: ProjectConfig
): Promise<void> {
  const configPath = path.join(cwd, CONFIG_FILE);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2));
}

export async function isAstroProject(cwd: string): Promise<boolean> {
  const packageJsonPath = path.join(cwd, "package.json");

  if (!(await fs.pathExists(packageJsonPath))) {
    return false;
  }

  const packageJson = await fs.readJson(packageJsonPath);
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  return "astro" in deps;
}

export async function hasTailwindInstalled(cwd: string): Promise<boolean> {
  const packageJsonPath = path.join(cwd, "package.json");

  if (!(await fs.pathExists(packageJsonPath))) {
    return false;
  }

  const packageJson = await fs.readJson(packageJsonPath);
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  return "tailwindcss" in deps;
}

export async function writeComponentFile(
  cwd: string,
  config: ProjectConfig,
  componentPath: string,
  content: string,
  overwrite: boolean = false
): Promise<{ written: boolean; path: string }> {
  const fullPath = path.join(cwd, config.componentsDir, componentPath);

  // Check if file exists
  if ((await fs.pathExists(fullPath)) && !overwrite) {
    return { written: false, path: fullPath };
  }

  // Ensure directory exists
  await fs.ensureDir(path.dirname(fullPath));

  // Write file
  await fs.writeFile(fullPath, content);

  return { written: true, path: fullPath };
}

export function resolveInstallPath(
  cwd: string,
  config: ProjectConfig,
  filePath: string,
  componentType?: string
): string {
  const isUtilityFile =
    componentType === "utility" || filePath.startsWith("utils/");
  const isStylesFile =
    componentType === "styles" || filePath.startsWith("styles/");

  if (isUtilityFile) {
    return path.join(cwd, config.utilsDir, filePath.replace(/^utils\//, ""));
  }

  if (isStylesFile) {
    return path.join(cwd, config.stylesDir, filePath.replace(/^styles\//, ""));
  }

  return path.join(cwd, config.componentsDir, filePath);
}

export async function writeUtilFile(
  cwd: string,
  config: ProjectConfig,
  utilPath: string,
  content: string,
  overwrite: boolean = false
): Promise<{ written: boolean; path: string }> {
  const fullPath = path.join(cwd, config.utilsDir, utilPath);

  if ((await fs.pathExists(fullPath)) && !overwrite) {
    return { written: false, path: fullPath };
  }

  await fs.ensureDir(path.dirname(fullPath));
  await fs.writeFile(fullPath, content);

  return { written: true, path: fullPath };
}
