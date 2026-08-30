import fs from "fs-extra";
import path from "path";
import {
  isThemeEntry,
  resolveInstallPath,
  themeEntryName,
  type ProjectConfig,
} from "./config.js";
import {
  getComponent,
  getRegistryIndex,
  type RegistryComponent,
} from "./registry.js";

export type FileStatus = "unchanged" | "modified" | "missing";

export interface FileState {
  /** Registry-relative path (e.g. `button/Button.astro`). */
  path: string;
  /** Absolute path in the user's project. */
  absPath: string;
  status: FileStatus;
  /** Current content on disk (undefined when missing). */
  localContent?: string;
  /** Content in the registry. */
  registryContent: string;
}

export interface InstalledEntry {
  entry: RegistryComponent;
  files: FileState[];
  hasChanges: boolean;
}

/** Every name in the registry: components, utilities, styles, barrel. */
export async function getAllRegistryNames(): Promise<string[]> {
  const index = await getRegistryIndex();
  const names = index.components.map((c) => c.name);
  for (const utility of index.utilities ?? []) {
    names.push(utility.name);
  }
  return names;
}

/**
 * Compares one registry entry against the project. Returns null when the
 * entry is not installed (none of its files exist locally).
 */
export async function getEntryState(
  cwd: string,
  config: ProjectConfig,
  name: string,
): Promise<InstalledEntry | null> {
  const entry = await getComponent(name);

  const files: FileState[] = [];
  let anyExists = false;

  for (const file of entry.files) {
    const absPath = resolveInstallPath(cwd, config, file.path, entry.type);
    const exists = await fs.pathExists(absPath);

    let status: FileStatus = "missing";
    let localContent: string | undefined;

    if (exists) {
      anyExists = true;
      localContent = await fs.readFile(absPath, "utf-8");
      status = localContent === file.content ? "unchanged" : "modified";
    }

    files.push({
      path: file.path,
      absPath,
      status,
      localContent,
      registryContent: file.content,
    });
  }

  if (!anyExists) return null;

  return {
    entry,
    files,
    hasChanges: files.some((f) => f.status !== "unchanged"),
  };
}

/**
 * Scans the project for installed registry entries. When `names` is given,
 * only those entries are considered; unknown names throw.
 */
export async function getInstalledEntries(
  cwd: string,
  config: ProjectConfig,
  names?: string[],
): Promise<InstalledEntry[]> {
  const allNames = await getAllRegistryNames();

  if (names?.length) {
    const unknown = names.filter((n) => !allNames.includes(n));
    if (unknown.length > 0) {
      throw new Error(`Unknown components: ${unknown.join(", ")}`);
    }
  }

  // All theme entries install the same CSS file, so when scanning the whole
  // project only compare against the theme configured in bearnie.json.
  const activeTheme = themeEntryName(config.theme ?? "default");
  const targets = names?.length
    ? names
    : allNames.filter((name) => !isThemeEntry(name) || name === activeTheme);
  const installed: InstalledEntry[] = [];

  for (const name of targets) {
    const state = await getEntryState(cwd, config, name);
    if (state) installed.push(state);
  }

  return installed;
}
