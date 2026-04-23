#!/usr/bin/env node
import prompts from "prompts";
import pc from "picocolors";
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Brand colors
const amber = (text: string) => pc.yellow(text);
const logo = `${amber("🐻")} ${pc.bold("bearnie")}`;

// Terminal hyperlink (OSC 8) - works in most modern terminals
const link = (text: string, url: string) =>
  `\u001B]8;;${url}\u0007${pc.cyan(text)}\u001B]8;;\u0007`;

// Parse --full flag
function parseFullArg(): boolean {
  return process.argv.includes("--full");
}

// Registry base URL
const REGISTRY_URL = "https://bearnie.dev/registry";

// Component list for full install
const COMPONENT_NAMES = [
  "accordion", "alert", "alert-dialog", "aspect-ratio", "avatar",
  "badge", "breadcrumb", "button", "button-group", "card", "carousel",
  "checkbox", "collapsible", "command", "context-menu", "dialog",
  "dropdown-menu", "empty", "file-upload", "hover-card", "input",
  "input-group", "input-otp", "kbd", "label", "menubar", "pagination",
  "popover", "progress", "radio", "scroll-area", "select", "separator",
  "sheet", "sidebar", "skeleton", "slider", "spinner", "stepper",
  "switch", "table", "tabs", "textarea", "toast", "toggle", "tooltip", "tree"
];

// Fetch component from registry
async function fetchComponent(name: string): Promise<{ files: { name: string; content: string }[] } | null> {
  try {
    const response = await fetch(`${REGISTRY_URL}/${name}.json`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

// Fetch utility from registry
async function fetchUtility(name: string): Promise<{ files: { name: string; content: string }[] } | null> {
  try {
    const response = await fetch(`${REGISTRY_URL}/${name}.json`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function main() {
  const fullInstall = parseFullArg();

  console.log(`
  ${logo}

  ${amber("Hey!")} Let's create your Bearnie project.
${fullInstall ? `  ${pc.dim("Full install: including all components")}\n` : ""}
`);

  // Get project name from args (skip flags)
  let projectName = process.argv.find(
    (arg, index) => index >= 2 && !arg.startsWith("--")
  );

  if (!projectName) {
    const response = await prompts({
      type: "text",
      name: "projectName",
      message: "Project name:",
      initial: "my-bearnie-app",
      validate: (value) => {
        if (!value) return "Project name is required";
        if (!/^[a-z0-9-_]+$/i.test(value))
          return "Project name can only contain letters, numbers, hyphens, and underscores";
        return true;
      },
    });

    if (!response.projectName) {
      console.log(`\n  ${pc.yellow("Cancelled.")}\n`);
      process.exit(0);
    }

    projectName = response.projectName;
  }

  // At this point projectName is guaranteed to be a string
  const finalName = projectName as string;
  const targetDir = path.resolve(process.cwd(), finalName);

  // Check if directory exists
  if (fs.existsSync(targetDir)) {
    const { overwrite } = await prompts({
      type: "confirm",
      name: "overwrite",
      message: `Directory ${pc.cyan(finalName)} already exists. Overwrite?`,
      initial: false,
    });

    if (!overwrite) {
      console.log(`\n  ${pc.yellow("Cancelled.")}\n`);
      process.exit(0);
    }

    await fs.remove(targetDir);
  }

  // Copy template
  const templateDir = path.join(__dirname, "..", "template");
  
  console.log(`\n  ${pc.dim("Creating project in")} ${pc.cyan(targetDir)}\n`);

  await fs.copy(templateDir, targetDir);

  // Update package.json with project name
  const pkgPath = path.join(targetDir, "package.json");
  const pkg = await fs.readJson(pkgPath);
  pkg.name = finalName;
  await fs.writeJson(pkgPath, pkg, { spaces: 2 });

  // Install all components if --full flag is provided
  if (fullInstall) {
    console.log(`\n  ${pc.dim("Fetching components from registry...")}\n`);
    
    // Create directories
    await fs.ensureDir(path.join(targetDir, "src", "components", "ui"));
    await fs.ensureDir(path.join(targetDir, "src", "utils"));
    
    // Fetch and install focus-trap utility first
    const focusTrap = await fetchUtility("focus-trap");
    if (focusTrap?.files) {
      for (const file of focusTrap.files) {
        const filePath = path.join(targetDir, "src", file.name);
        await fs.ensureDir(path.dirname(filePath));
        await fs.writeFile(filePath, file.content);
      }
      console.log(`  ${pc.green("✓")} Added focus-trap utility`);
    }
    
    // Create cn utility
    const cnContent = `import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
`;
    await fs.writeFile(path.join(targetDir, "src", "utils", "cn.ts"), cnContent);
    console.log(`  ${pc.green("✓")} Added cn utility`);
    
    // Fetch and install all components
    let installed = 0;
    let failed = 0;
    
    for (const componentName of COMPONENT_NAMES) {
      const component = await fetchComponent(componentName);
      if (component?.files) {
        for (const file of component.files) {
          const filePath = path.join(targetDir, "src", file.name);
          await fs.ensureDir(path.dirname(filePath));
          await fs.writeFile(filePath, file.content);
        }
        installed++;
        process.stdout.write(`\r  ${pc.green("✓")} Installed ${installed}/${COMPONENT_NAMES.length} components`);
      } else {
        failed++;
      }
    }
    console.log(""); // New line after progress
    
    if (failed > 0) {
      console.log(`  ${pc.yellow("!")} ${failed} components failed to fetch`);
    }
    
    // Update package.json with additional dependencies
    const pkgPath2 = path.join(targetDir, "package.json");
    const pkg2 = await fs.readJson(pkgPath2);
    pkg2.dependencies = {
      ...pkg2.dependencies,
      "clsx": "^2.1.1",
      "tailwind-merge": "^3.3.0",
    };
    await fs.writeJson(pkgPath2, pkg2, { spaces: 2 });
    console.log(`  ${pc.green("✓")} Added component dependencies`);
  }

  // Create .gitignore
  await fs.writeFile(
    path.join(targetDir, ".gitignore"),
    `# Dependencies
node_modules/

# Build output
dist/

# Astro
.astro/

# Environment variables
.env
.env.*
!.env.example

# IDE
.vscode/
.idea/

# OS
.DS_Store
Thumbs.db
`
  );

  console.log(`  ${pc.green("✓")} Created project files`);

  // Success message
  if (fullInstall) {
    console.log(`
  ${pc.green("Done!")} Your Bearnie project is ready with all components.

  ${pc.bold("Next steps:")}

    ${pc.dim("1.")} cd ${pc.cyan(finalName)}
    ${pc.dim("2.")} npm install
    ${pc.dim("3.")} npm run dev

  ${pc.dim("All components are in")} ${pc.cyan("src/components/ui/")}

  ${pc.dim("Browse components at")} ${link("bearnie.dev/docs/components", "https://bearnie.dev/docs/components")}

  ${pc.dim("Made by")} ${link("Michael", "https://michaelandreuzza.com")} ${pc.dim("at")} ${link("Lexington Themes", "https://lexingtonthemes.com")}
`);
  } else {
    console.log(`
  ${pc.green("Done!")} Your Bearnie project is ready.

  ${pc.bold("Next steps:")}

    ${pc.dim("1.")} cd ${pc.cyan(finalName)}
    ${pc.dim("2.")} npm install
    ${pc.dim("3.")} npx bearnie add button card
    ${pc.dim("4.")} npm run dev

  ${pc.dim("Or use")} ${pc.cyan("--full")} ${pc.dim("to include all components:")}
    npx create-bearnie my-app --full

  ${pc.dim("Browse components at")} ${link("bearnie.dev/docs/components", "https://bearnie.dev/docs/components")}

  ${pc.dim("Made by")} ${link("Michael", "https://michaelandreuzza.com")} ${pc.dim("at")} ${link("Lexington Themes", "https://lexingtonthemes.com")}
`);
  }
}

main().catch((err) => {
  console.error(`\n  ${pc.red("Error:")} ${err.message}\n`);
  process.exit(1);
});
