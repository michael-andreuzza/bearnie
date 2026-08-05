/**
 * Script to generate registry JSON files from existing components
 * Run with: npx tsx scripts/generate-registry.ts
 */
import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.join(__dirname, "..");
const COMPONENTS_DIR = path.join(ROOT_DIR, "src/components/ui");
const UTILS_DIR = path.join(ROOT_DIR, "src/utils");
const REGISTRY_DIR = path.join(ROOT_DIR, "public/registry");
const STYLES_PATH = path.join(ROOT_DIR, "src/styles/bearnie.css");
const TEMPLATE_STYLES_PATH = path.join(
  ROOT_DIR,
  "packages/create-bearnie/template/src/styles/bearnie.css",
);

// Utility metadata
const UTILITY_META: Record<
  string,
  {
    description: string;
    file: string;
  }
> = {
  "focus-trap": {
    description: "Focus trap utility for modal accessibility",
    file: "focus-trap.ts",
  },
  "ui-runtime-loader": {
    description: "Loads the shared UI runtime once per page",
    file: "runtime/loader.ts",
  },
  "ui-runtime-boot": {
    description: "Bootstraps interactive UI component behaviors",
    file: "runtime/ui-boot.ts",
  },
  "ui-runtime-disclosure-triggers": {
    description: "Shared keyboard trigger handlers for disclosure controls",
    file: "runtime/disclosure-triggers.ts",
  },
  "ui-runtime-popover": {
    description: "Shared popover initialization runtime",
    file: "runtime/popover.ts",
  },
  "ui-runtime-command": {
    description: "Shared command and command dialog initialization runtime",
    file: "runtime/command.ts",
  },
  "ui-runtime-combobox": {
    description: "Shared combobox initialization runtime",
    file: "runtime/combobox.ts",
  },
};

// Component metadata - defines dependencies and categories
const COMPONENT_META: Record<
  string,
  {
    description: string;
    category: string;
    dependencies?: string[];
    registryDependencies?: string[];
  }
> = {
  accordion: {
    description:
      "A vertically stacked set of interactive headings that reveal content",
    category: "disclosure",
    registryDependencies: ["focus-trap"],
  },
  alert: {
    description: "Displays important messages and feedback to users",
    category: "feedback",
  },
  "alert-dialog": {
    description: "A modal dialog for important confirmations",
    category: "disclosure",
    registryDependencies: ["focus-trap"],
  },
  "aspect-ratio": {
    description: "Displays content with a specified aspect ratio",
    category: "layout",
  },
  avatar: {
    description: "An image element with a fallback for representing users",
    category: "display",
  },
  badge: {
    description: "A small status indicator for elements",
    category: "display",
  },
  breadcrumb: {
    description: "Navigation showing the current location within a hierarchy",
    category: "navigation",
  },
  button: {
    description: "A clickable button component with multiple variants",
    category: "form",
  },
  "button-group": {
    description: "Groups related buttons together",
    category: "form",
  },
  card: {
    description: "A container for grouping related content",
    category: "layout",
  },
  carousel: {
    description: "A carousel component built with Keen Slider",
    category: "display",
    dependencies: ["keen-slider"],
  },
  checkbox: {
    description: "A control for toggling between checked and unchecked states",
    category: "form",
  },
  collapsible: {
    description: "A component that can expand and collapse content",
    category: "disclosure",
  },
  command: {
    description: "A command palette for searching and selecting actions",
    category: "navigation",
    registryDependencies: [
      "focus-trap",
      "ui-runtime-loader",
      "ui-runtime-boot",
      "ui-runtime-disclosure-triggers",
      "ui-runtime-popover",
      "ui-runtime-command",
      "ui-runtime-combobox",
    ],
  },
  "context-menu": {
    description: "A menu triggered by right-click",
    category: "navigation",
  },
  dialog: {
    description: "A modal dialog that appears on top of the page",
    category: "disclosure",
    registryDependencies: ["focus-trap"],
  },
  "dropdown-menu": {
    description: "A menu that appears when triggered by a button",
    category: "navigation",
    registryDependencies: ["focus-trap"],
  },
  empty: {
    description: "A placeholder for empty states",
    category: "feedback",
  },
  "file-upload": {
    description: "A file upload component with drag and drop",
    category: "form",
  },
  "hover-card": {
    description: "A card that appears on hover",
    category: "display",
  },
  input: {
    description: "A text input field for forms",
    category: "form",
  },
  "input-group": {
    description: "Groups input with addons",
    category: "form",
  },
  "input-otp": {
    description: "A one-time password input",
    category: "form",
  },
  kbd: {
    description: "Displays keyboard shortcuts",
    category: "display",
  },
  label: {
    description: "An accessible label for form controls",
    category: "form",
  },
  menubar: {
    description: "A horizontal menu bar",
    category: "navigation",
  },
  pagination: {
    description: "Navigation for paginated content",
    category: "navigation",
  },
  popover: {
    description: "Displays floating content when triggered",
    category: "disclosure",
    registryDependencies: [
      "focus-trap",
      "ui-runtime-loader",
      "ui-runtime-boot",
      "ui-runtime-disclosure-triggers",
      "ui-runtime-popover",
      "ui-runtime-command",
      "ui-runtime-combobox",
    ],
  },
  progress: {
    description: "Displays progress of a task",
    category: "feedback",
  },
  radio: {
    description: "A set of checkable buttons where only one can be selected",
    category: "form",
  },
  "scroll-area": {
    description: "A scrollable area with custom scrollbars",
    category: "layout",
  },
  select: {
    description: "A dropdown for selecting from a list of options",
    category: "form",
  },
  combobox: {
    description: "A searchable dropdown for selecting one option",
    category: "form",
    registryDependencies: ["command", "popover"],
  },
  separator: {
    description: "A visual divider between content",
    category: "layout",
  },
  sheet: {
    description: "A slide-out panel from the edge of the screen",
    category: "disclosure",
    registryDependencies: ["focus-trap"],
  },
  sidebar: {
    description: "A collapsible sidebar navigation",
    category: "navigation",
  },
  skeleton: {
    description: "A placeholder for loading content",
    category: "feedback",
  },
  slider: {
    description: "A range input slider",
    category: "form",
  },
  spinner: {
    description: "A loading indicator",
    category: "feedback",
  },
  stepper: {
    description: "A multi-step progress indicator",
    category: "navigation",
  },
  switch: {
    description: "A toggle control for boolean values",
    category: "form",
  },
  table: {
    description: "A responsive table for displaying tabular data",
    category: "display",
  },
  tabs: {
    description: "Organizes content into tabbed sections",
    category: "navigation",
    registryDependencies: ["focus-trap"],
  },
  textarea: {
    description: "A multi-line text input field",
    category: "form",
  },
  toast: {
    description: "A notification that appears temporarily",
    category: "feedback",
  },
  toggle: {
    description: "A two-state button",
    category: "form",
  },
  "toggle-group": {
    description: "A group of toggle buttons",
    category: "form",
  },
  tooltip: {
    description: "A popup that displays information on hover or focus",
    category: "display",
    registryDependencies: ["focus-trap"],
  },
  tree: {
    description: "A hierarchical tree view",
    category: "navigation",
  },
};

async function getComponentFiles(
  componentDir: string
): Promise<{ name: string; path: string; content: string }[]> {
  const files: { name: string; path: string; content: string }[] = [];
  const dirName = path.basename(componentDir);

  const entries = await fs.readdir(componentDir);

  for (const entry of entries) {
    const entryPath = path.join(componentDir, entry);
    const stat = await fs.stat(entryPath);

    if (stat.isFile() && entry.endsWith(".astro")) {
      const content = await fs.readFile(entryPath, "utf-8");
      files.push({
        name: entry,
        path: `${dirName}/${entry}`,
        content,
      });
    }
  }

  return files;
}

async function generateUtilities() {
  console.log("🔧 Generating utility registry...\n");

  for (const [name, meta] of Object.entries(UTILITY_META)) {
    const filePath = path.join(UTILS_DIR, meta.file);
    
    if (!await fs.pathExists(filePath)) {
      console.log(`⚠️  Skipping ${name} - file not found: ${meta.file}`);
      continue;
    }

    const content = await fs.readFile(filePath, "utf-8");

    const registryEntry = {
      name,
      type: "utility",
      description: meta.description,
      files: [
        {
          name: meta.file,
          path: `utils/${meta.file}`,
          content,
        },
      ],
    };

    const registryPath = path.join(REGISTRY_DIR, `${name}.json`);
    await fs.writeJson(registryPath, registryEntry, { spaces: 2 });
    console.log(`   ✓ Created ${name}.json (utility)`);
  }
}

async function generateStyles() {
  if (!(await fs.pathExists(STYLES_PATH))) {
    console.log("⚠️  Skipping styles - bearnie.css not found");
    return;
  }

  const content = await fs.readFile(STYLES_PATH, "utf-8");
  const registryEntry = {
    name: "styles",
    type: "styles",
    description: "CSS variables and theme configuration for Bearnie components",
    files: [
      {
        name: "bearnie.css",
        path: "styles/bearnie.css",
        content,
      },
    ],
  };

  const registryPath = path.join(REGISTRY_DIR, "styles.json");
  await fs.writeJson(registryPath, registryEntry, { spaces: 2 });
  console.log("   ✓ Created styles.json");

  if (await fs.pathExists(TEMPLATE_STYLES_PATH)) {
    await fs.copy(STYLES_PATH, TEMPLATE_STYLES_PATH);
    console.log("   ✓ Synced bearnie.css to create-bearnie template");
  }
}

async function generateRegistry() {
  console.log("🔧 Generating component registry...\n");

  // Ensure registry directory exists
  await fs.ensureDir(REGISTRY_DIR);

  // First generate utilities
  await generateUtilities();

  console.log("\n🎨 Processing styles...\n");
  await generateStyles();

  console.log("\n📦 Processing components...\n");

  const components: { name: string; description: string; category: string }[] =
    [];

  // Get all component directories
  const componentDirs = await fs.readdir(COMPONENTS_DIR);

  for (const dir of componentDirs) {
    const componentPath = path.join(COMPONENTS_DIR, dir);
    const stat = await fs.stat(componentPath);

    if (!stat.isDirectory()) continue;

    const meta = COMPONENT_META[dir];
    if (!meta) {
      console.log(`⚠️  Skipping ${dir} - no metadata defined`);
      continue;
    }

    console.log(`📦 Processing ${dir}...`);

    // Get component files
    const files = await getComponentFiles(componentPath);

    if (files.length === 0) {
      console.log(`   ⚠️  No .astro files found in ${dir}`);
      continue;
    }

    // Create registry JSON
    const registryEntry = {
      name: dir,
      description: meta.description,
      category: meta.category,
      dependencies: meta.dependencies || [],
      devDependencies: [],
      registryDependencies: meta.registryDependencies || [],
      files,
    };

    // Write component registry file
    const registryPath = path.join(REGISTRY_DIR, `${dir}.json`);
    await fs.writeJson(registryPath, registryEntry, { spaces: 2 });
    console.log(`   ✓ Created ${dir}.json`);

    components.push({
      name: dir,
      description: meta.description,
      category: meta.category,
    });
  }

  // Add styles entry (special - not a component)
  components.unshift({
    name: "styles",
    description: "CSS variables and theme configuration for Bearnie components",
    category: "theme",
  });

  // Create index file
  const indexPath = path.join(REGISTRY_DIR, "index.json");
  await fs.writeJson(
    indexPath,
    {
      name: "bearnie",
      version: "0.1.0",
      components: components,
    },
    { spaces: 2 }
  );

  console.log(`\n✅ Generated registry with ${components.length} components (including styles)`);
  console.log(`📁 Registry files written to: ${REGISTRY_DIR}`);
}

generateRegistry().catch(console.error);
