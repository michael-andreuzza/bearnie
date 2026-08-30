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

const { installComponents } = await import("../packages/mcp/src/install.ts");
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

test("create-bearnie scaffolds template with bearnie.json", () => {
  const parent = createTempDir("bearnie-create-");
  const appName = "test-app";

  run(`node ${CREATE} ${appName}`, parent);

  const dir = path.join(parent, appName);
  assert.ok(fs.existsSync(path.join(dir, "package.json")));
  assert.ok(fs.existsSync(path.join(dir, "bearnie.json")));
  assert.ok(fs.readJsonSync(path.join(dir, "package.json")).dependencies.astro);
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
