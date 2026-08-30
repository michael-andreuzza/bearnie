/**
 * Smoke tests for CLI, create-bearnie, and MCP install flows.
 */
import assert from "node:assert/strict";
import { execSync } from "node:child_process";
import fs from "fs-extra";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { test } from "node:test";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");

process.env.BEARNIE_REGISTRY_PATH = path.join(ROOT, "public/registry");

const { installComponents, listInstalledComponents } = await import(
  "../packages/mcp/src/install.ts"
);
const { detectPackageManager, installCommand } = await import(
  "../packages/cli/src/utils/pm.ts"
);
const REGISTRY_PATH = path.join(ROOT, "public/registry");
const CLI = path.join(ROOT, "packages/cli/dist/index.js");
const CREATE = path.join(ROOT, "packages/create-bearnie/dist/index.js");

const env = {
  ...process.env,
  BEARNIE_REGISTRY_PATH: REGISTRY_PATH,
  NO_COLOR: "1",
};

function run(cmd: string, cwd: string) {
  execSync(cmd, {
    cwd,
    env,
    stdio: "pipe",
  });
}

function runCapture(cmd: string, cwd: string): string {
  return execSync(cmd, { cwd, env, stdio: "pipe" }).toString();
}

function createTempDir(prefix: string) {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeMinimalAstroProject(dir: string) {
  fs.writeJsonSync(path.join(dir, "package.json"), {
    name: "smoke-test-app",
    type: "module",
    dependencies: {
      astro: "^7.1.6",
    },
  });
}

test("bearnie init --yes creates config and utilities", () => {
  const dir = createTempDir("bearnie-init-");
  writeMinimalAstroProject(dir);

  run(`node ${CLI} init --yes --cwd ${dir}`, dir);

  assert.ok(fs.existsSync(path.join(dir, "bearnie.json")));
  assert.ok(fs.existsSync(path.join(dir, "src/utils/cn.ts")));
  assert.ok(fs.existsSync(path.join(dir, "src/components/bearnie")));

  // Richer init: @/* path alias and base styles
  const tsconfig = fs.readJsonSync(path.join(dir, "tsconfig.json"));
  assert.deepEqual(tsconfig.compilerOptions.paths["@/*"], ["./src/*"]);
  assert.ok(fs.existsSync(path.join(dir, "src/styles/bearnie.css")));
  assert.equal(fs.readJsonSync(path.join(dir, "bearnie.json")).theme, "default");
});

test("bearnie init wires @tailwindcss/vite into a simple astro config", () => {
  const dir = createTempDir("bearnie-init-tw-");
  writeMinimalAstroProject(dir);
  fs.writeFileSync(
    path.join(dir, "astro.config.mjs"),
    `import { defineConfig } from "astro/config";\n\nexport default defineConfig({});\n`,
  );

  run(`node ${CLI} init --yes --cwd ${dir}`, dir);

  const config = fs.readFileSync(path.join(dir, "astro.config.mjs"), "utf-8");
  assert.ok(config.includes(`import tailwindcss from "@tailwindcss/vite"`));
  assert.ok(config.includes("plugins: [tailwindcss()]"));
});

test("bearnie add button barrel --yes installs component files", () => {
  const dir = createTempDir("bearnie-add-");
  writeMinimalAstroProject(dir);
  run(`node ${CLI} init --yes --cwd ${dir}`, dir);
  run(`node ${CLI} add button barrel --yes --cwd ${dir}`, dir);

  assert.ok(
    fs.existsSync(path.join(dir, "src/components/bearnie/button/Button.astro")),
  );
  assert.ok(fs.existsSync(path.join(dir, "src/components/bearnie/index.ts")));
});

test("bearnie diff and update detect and fix drift from the registry", () => {
  const dir = createTempDir("bearnie-diff-");
  writeMinimalAstroProject(dir);
  run(`node ${CLI} init --yes --cwd ${dir}`, dir);
  run(`node ${CLI} add button --yes --cwd ${dir}`, dir);

  // Fresh install is up to date
  const clean = runCapture(`node ${CLI} diff --cwd ${dir}`, dir);
  assert.ok(clean.includes("Everything is up to date"));

  // Local edit shows up in the diff
  const buttonPath = path.join(
    dir,
    "src/components/bearnie/button/Button.astro",
  );
  const original = fs.readFileSync(buttonPath, "utf-8");
  fs.writeFileSync(buttonPath, original.replace("inline-flex", "flex"));

  const drifted = runCapture(`node ${CLI} diff --cwd ${dir}`, dir);
  assert.ok(drifted.includes("button/Button.astro"));
  assert.ok(drifted.includes("differs from the registry"));

  // Update restores the registry version
  run(`node ${CLI} update --yes --cwd ${dir}`, dir);
  assert.equal(fs.readFileSync(buttonPath, "utf-8"), original);

  const after = runCapture(`node ${CLI} diff --cwd ${dir}`, dir);
  assert.ok(after.includes("Everything is up to date"));
});

test("bearnie add skips existing files without --overwrite", () => {
  const dir = createTempDir("bearnie-overwrite-");
  writeMinimalAstroProject(dir);
  run(`node ${CLI} init --yes --cwd ${dir}`, dir);
  run(`node ${CLI} add button --yes --cwd ${dir}`, dir);

  const buttonPath = path.join(
    dir,
    "src/components/bearnie/button/Button.astro",
  );
  fs.writeFileSync(buttonPath, "<!-- local -->");

  // Non-interactive prompt defaults to "no" — files must survive
  run(`node ${CLI} add button --cwd ${dir}`, dir);
  assert.equal(fs.readFileSync(buttonPath, "utf-8"), "<!-- local -->");

  // Explicit --overwrite replaces them
  run(`node ${CLI} add button --overwrite --cwd ${dir}`, dir);
  assert.notEqual(fs.readFileSync(buttonPath, "utf-8"), "<!-- local -->");
});

test("package manager detection follows lockfiles", () => {
  const dir = createTempDir("bearnie-pm-");
  assert.equal(detectPackageManager(dir), "npm");

  fs.writeFileSync(path.join(dir, "pnpm-lock.yaml"), "");
  assert.equal(detectPackageManager(dir), "pnpm");
  assert.deepEqual(installCommand("pnpm", ["clsx"], true), {
    command: "pnpm",
    args: ["add", "-D", "clsx"],
  });

  fs.rmSync(path.join(dir, "pnpm-lock.yaml"));
  fs.writeFileSync(path.join(dir, "bun.lock"), "");
  assert.equal(detectPackageManager(dir), "bun");
});

test("create-bearnie scaffolds template with bearnie.json", () => {
  const parent = createTempDir("bearnie-create-");
  const appName = "test-app";

  run(`node ${CREATE} ${appName}`, parent);

  const dir = path.join(parent, appName);
  assert.ok(fs.existsSync(path.join(dir, "package.json")));
  assert.ok(fs.existsSync(path.join(dir, "bearnie.json")));
  assert.ok(fs.readJsonSync(path.join(dir, "package.json")).dependencies.astro);
});

test("create-bearnie --theme applies the palette and stays diff-clean", () => {
  const parent = createTempDir("bearnie-theme-");
  const appName = "themed-app";

  run(`node ${CREATE} ${appName} --theme=amber`, parent);

  const dir = path.join(parent, appName);
  assert.equal(fs.readJsonSync(path.join(dir, "bearnie.json")).theme, "amber");

  const css = fs.readFileSync(path.join(dir, "src/styles/bearnie.css"), "utf-8");
  assert.ok(css.includes("oklch(0.769 0.188 70.08)"), "amber primary applied");

  // diff must compare against the amber entry, not the default styles
  const diffOutput = runCapture(`node ${CLI} diff --cwd ${dir}`, dir);
  assert.ok(diffOutput.includes("Everything is up to date"));

  // Switching themes via add records the new theme in bearnie.json
  run(`node ${CLI} add styles-blue --overwrite --cwd ${dir}`, dir);
  assert.equal(fs.readJsonSync(path.join(dir, "bearnie.json")).theme, "blue");
  const after = runCapture(`node ${CLI} diff --cwd ${dir}`, dir);
  assert.ok(after.includes("Everything is up to date"));
});

test("create-bearnie rejects unknown themes", () => {
  const parent = createTempDir("bearnie-badtheme-");
  assert.throws(() => run(`node ${CREATE} some-app --theme=neon`, parent));
});

test("create-bearnie --full installs components and barrel", () => {
  const parent = createTempDir("bearnie-full-");
  const appName = "full-app";

  run(`node ${CREATE} ${appName} --full`, parent);

  const dir = path.join(parent, appName);
  assert.ok(fs.existsSync(path.join(dir, "bearnie.json")));
  assert.ok(
    fs.existsSync(path.join(dir, "src/components/bearnie/button/Button.astro")),
  );
  assert.ok(fs.existsSync(path.join(dir, "src/components/bearnie/index.ts")));

  // Theme entries must not clobber bearnie.css during --full
  const css = fs.readFileSync(path.join(dir, "src/styles/bearnie.css"), "utf-8");
  assert.ok(css.includes("--primary: oklch(0.205 0 0)"), "default palette kept");
});

test("create-bearnie --full scaffold compiles with astro build", () => {
  const parent = createTempDir("bearnie-build-");
  const appName = "build-app";

  run(`node ${CREATE} ${appName} --full`, parent);

  const dir = path.join(parent, appName);

  // A page that imports the entire barrel and renders the script-heavy
  // components. This forces Vite to resolve every installed module —
  // icons, runtime utilities, keen-slider — so any import the registry
  // fails to ship breaks this build.
  fs.writeFileSync(
    path.join(dir, "src/pages/kitchen-sink.astro"),
    `---
import BaseLayout from "@/layouts/BaseLayout.astro";
import * as Bearnie from "@/components/bearnie";
const {
  Button,
  Spinner,
  Toaster,
  Dialog,
  DialogTrigger,
  DialogContent,
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Carousel,
  CarouselContent,
  CarouselItem,
  ThemeToggle,
  HugeIcon,
} = Bearnie;
---

<BaseLayout title="Kitchen sink">
  <Button>Button</Button>
  <Spinner />
  <ThemeToggle />
  <Dialog>
    <DialogTrigger>Open</DialogTrigger>
    <DialogContent>Dialog body</DialogContent>
  </Dialog>
  <Tabs>
    <TabsList>
      <TabsTrigger value="one">One</TabsTrigger>
    </TabsList>
    <TabsContent value="one">Tab one</TabsContent>
  </Tabs>
  <Carousel>
    <CarouselContent>
      <CarouselItem>Slide</CarouselItem>
    </CarouselContent>
  </Carousel>
  <Toaster />
</BaseLayout>
`,
  );

  // The registry must declare every npm package the components need —
  // this build fails on any unresolvable import, which is exactly the
  // class of bug that file-copy assertions cannot catch.
  execSync("npm install --no-audit --no-fund", {
    cwd: dir,
    env,
    stdio: "pipe",
    timeout: 300_000,
  });
  execSync("npx astro build", {
    cwd: dir,
    env,
    stdio: "pipe",
    timeout: 300_000,
  });

  assert.ok(fs.existsSync(path.join(dir, "dist/index.html")));
  assert.ok(fs.existsSync(path.join(dir, "dist/kitchen-sink/index.html")));
});

test("MCP installComponents adds button and barrel", async () => {
  const dir = createTempDir("bearnie-mcp-");
  writeMinimalAstroProject(dir);

  const result = await installComponents(dir, ["button", "barrel"]);
  assert.deepEqual(result.errors, []);
  assert.ok(result.installed.includes("button"));
  assert.ok(result.installed.includes("barrel"));
  assert.ok(
    fs.existsSync(path.join(dir, "src/components/bearnie/button/Button.astro")),
  );
  assert.ok(fs.existsSync(path.join(dir, "src/components/bearnie/index.ts")));
});

test("MCP listInstalledComponents reports status against the registry", async () => {
  const dir = createTempDir("bearnie-mcp-list-");
  writeMinimalAstroProject(dir);

  await installComponents(dir, ["button"]);

  const installed = await listInstalledComponents(dir);
  assert.ok(installed !== null);

  const button = installed.find((item) => item.name === "button");
  assert.equal(button?.status, "up-to-date");

  // Modify the installed file and check it's flagged
  const buttonPath = path.join(
    dir,
    "src/components/bearnie/button/Button.astro",
  );
  fs.writeFileSync(buttonPath, "<!-- local -->");

  const after = await listInstalledComponents(dir);
  const modified = after?.find((item) => item.name === "button");
  assert.equal(modified?.status, "modified");
  assert.deepEqual(modified?.changedFiles, ["button/Button.astro"]);
});
