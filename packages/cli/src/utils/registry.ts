import fs from "fs-extra";
import path from "path";

// Registry configuration
// For production, this would be your hosted URL
export const REGISTRY_URL =
  process.env.BEARNIE_REGISTRY_URL || "https://bearnie.dev/registry";
// For local development: BEARNIE_REGISTRY_URL=http://localhost:4321/registry npx bearnie add button
// Or for file system: BEARNIE_REGISTRY_PATH=/path/to/registry npx bearnie add button

export const REGISTRY_PATH = process.env.BEARNIE_REGISTRY_PATH;
export const REGISTRY_INDEX_URL = `${REGISTRY_URL}/index.json`;

export interface RegistryComponent {
  name: string;
  type?: "component" | "utility" | "styles";
  description: string;
  category: string;
  dependencies?: string[];
  devDependencies?: string[];
  registryDependencies?: string[];
  files: RegistryFile[];
}

export interface RegistryFile {
  name: string;
  path: string;
  content: string;
}

export interface RegistryIndex {
  name: string;
  version: string;
  components: {
    name: string;
    description: string;
    category: string;
  }[];
  utilities?: {
    name: string;
    description: string;
  }[];
}

export async function getRegistryIndex(): Promise<RegistryIndex> {
  // Support local file system for development
  if (REGISTRY_PATH) {
    const indexPath = path.join(REGISTRY_PATH, "index.json");
    if (await fs.pathExists(indexPath)) {
      return fs.readJson(indexPath);
    }
    throw new Error(`Registry index not found at: ${indexPath}`);
  }

  const response = await fetch(REGISTRY_INDEX_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch registry index: ${response.statusText}`);
  }
  return response.json();
}

export async function getComponent(name: string): Promise<RegistryComponent> {
  // Support local file system for development
  if (REGISTRY_PATH) {
    const componentPath = path.join(REGISTRY_PATH, `${name}.json`);
    if (await fs.pathExists(componentPath)) {
      return fs.readJson(componentPath);
    }
    throw new Error(`Component "${name}" not found at: ${componentPath}`);
  }

  const url = `${REGISTRY_URL}/${name}.json`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Component "${name}" not found in registry`);
  }
  return response.json();
}

export async function resolveComponentDependencies(
  names: string[],
  resolved: Set<string> = new Set()
): Promise<string[]> {
  const result: string[] = [];

  for (const name of names) {
    if (resolved.has(name)) continue;
    resolved.add(name);

    const component = await getComponent(name);

    // Resolve registry dependencies first (other components)
    if (component.registryDependencies?.length) {
      const deps = await resolveComponentDependencies(
        component.registryDependencies,
        resolved
      );
      result.push(...deps);
    }

    result.push(name);
  }

  return result;
}
