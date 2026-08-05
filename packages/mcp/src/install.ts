import fs from "fs-extra";
import path from "path";

const REGISTRY_URL =
  process.env.BEARNIE_REGISTRY_URL || "https://bearnie.dev/registry";

function getRegistryPath(): string | undefined {
  return process.env.BEARNIE_REGISTRY_PATH;
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
): string {
  const relativePath = file.path || file.name;

  if (registryItem.type === "utility" || relativePath.startsWith("utils/")) {
    return path.join(
      projectRoot,
      "src/utils",
      relativePath.replace(/^utils\//, ""),
    );
  }

  if (registryItem.type === "styles" || relativePath.startsWith("styles/")) {
    return path.join(
      projectRoot,
      "src/styles",
      relativePath.replace(/^styles\//, ""),
    );
  }

  return path.join(projectRoot, "src/components/bearnie", relativePath);
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
  const npmDependencies = [...(component.dependencies ?? [])];

  const installFiles = async (entry: ComponentRegistry) => {
    for (const file of entry.files) {
      const filePath = resolveInstallPath(projectRoot, file, entry);
      await fs.ensureDir(path.dirname(filePath));
      await fs.writeFile(filePath, file.content);
      files.push(file.path || file.name);
    }
  };

  if (component.registryDependencies?.length) {
    for (const dep of component.registryDependencies) {
      const depComponent = await fetchComponent(dep);
      if (depComponent) {
        await installFiles(depComponent);
        npmDependencies.push(...(depComponent.dependencies ?? []));
      }
    }
  }

  await installFiles(component);

  return { files, npmDependencies };
}

export async function installComponents(
  projectRoot: string,
  names: string[],
): Promise<InstallResult> {
  const resolved = await resolveComponentDependencies(names);
  const ordered = orderWithBarrelLast(resolved);

  const installed: string[] = [];
  const npmDependencies = new Set<string>();
  const errors: string[] = [];

  for (const name of ordered) {
    const result = await installSingleComponent(projectRoot, name);
    if (result.error) {
      errors.push(result.error);
      continue;
    }
    installed.push(name);
    result.npmDependencies.forEach((dep) => npmDependencies.add(dep));
  }

  return {
    installed,
    npmDependencies: [...npmDependencies],
    errors,
  };
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
