# Bearnie CLI

A command-line interface for adding Bearnie UI components to your Astro project.

## Quick Start

```bash
# 1. Navigate to your Astro project
cd my-astro-project

# 2. Initialize Bearnie
npx bearnie init

# 3. Add components
npx bearnie add button card input

# 4. Optional: add barrel export for named imports
npx bearnie add barrel

# 5. Use in your Astro pages
```

```astro
---
import { Button, Card, CardHeader, CardTitle, CardContent } from "@/components/bearnie";
---

<Card>
  <CardHeader>
    <CardTitle>Welcome</CardTitle>
  </CardHeader>
  <CardContent>
    <Button>Click me</Button>
  </CardContent>
</Card>
```

## Installation

```bash
# Install globally
npm install -g bearnie

# Or use npx (recommended)
npx bearnie add button
```

## Commands

### `init`

Initialize Bearnie in your project. This sets up the necessary configuration and utilities.

```bash
npx bearnie init
```

This will:

- Create a `bearnie.json` configuration file
- Set up the `src/components/bearnie` directory
- Create the `cn()` utility function
- Install `clsx`, `tailwind-merge`, and `tailwindcss` dependencies
- Add the `@/*` path alias to `tsconfig.json`
- Wire `@tailwindcss/vite` into your Astro config (simple configs only — you get a hint otherwise)
- Ask for a base color and an accent color (see Themes below) and install the result to `src/styles/bearnie.css`

Projects created with `create-bearnie` already include `bearnie.json` and can skip init.

**Options:**

- `-y, --yes` - Skip confirmation prompts and use defaults
- `--cwd <path>` - Set the working directory (defaults to current directory)

### `add`

Add components to your project.

```bash
# Add a single component
npx bearnie add button

# Add multiple components
npx bearnie add button card input

# Add all available components
npx bearnie add --all

# Add barrel export (after components are installed)
npx bearnie add barrel

# Interactive component selection
npx bearnie add
```

If a file already exists, `add` asks before overwriting it (existing files are kept if you decline).

**Options:**

- `-y, --yes` - Skip confirmation prompts and overwrite existing files
- `-a, --all` - Add all available components
- `-o, --overwrite` - Overwrite existing files without asking
- `--cwd <path>` - Set the working directory

### `list`

List all available components.

```bash
# Display formatted list
npx bearnie list

# Output as JSON
npx bearnie list --json
```

Components are grouped by category, including **Theme** (`styles`) and **Meta** (`barrel`).

**Options:**

- `--json` - Output as JSON

### `diff`

See how your installed components differ from the current registry — useful after Bearnie ships fixes.

```bash
# Check all installed components
npx bearnie diff

# Check specific components
npx bearnie diff button dialog

# Just list changed files without the full diff
npx bearnie diff --name-only
```

**Options:**

- `--name-only` - Only show which files changed, not the diff
- `--cwd <path>` - Set the working directory

### `update`

Pull the latest registry version of your installed components. Shows what will change and asks for confirmation first — updating overwrites local edits to those files, so run `diff` first if you've customized components.

```bash
# Update everything that drifted
npx bearnie update

# Update specific components
npx bearnie update button dialog

# Skip the confirmation prompt
npx bearnie update --yes
```

Any new npm dependencies the updated components need are installed automatically.

**Options:**

- `-y, --yes` - Skip confirmation prompt
- `--cwd <path>` - Set the working directory

## Themes

Themes combine a **base color** (the grays used for backgrounds, text, and borders) with an **accent color** (buttons, focus rings, active states), both from Tailwind's official palette:

- **Bases:** `neutral` (default), `slate`, `gray`, `zinc`, `stone`, `mauve`, `olive`, `mist`, `taupe`
- **Accents:** neutral default, `red`, `rose`, `orange`, `amber`, `yellow`, `lime`, `green`, `emerald`, `teal`, `cyan`, `sky`, `blue`, `indigo`, `violet`, `purple`, `fuchsia`, `pink`

Every combination is a registry entry: `styles-blue` (neutral base, blue accent), `styles-slate` (slate base, neutral accent), `styles-slate-blue`, and so on. They all install the same `bearnie.css` file, so every component works with every theme.

`init` and `create-bearnie` ask for base and accent. Switch later with:

```bash
npx bearnie add styles-slate-blue --overwrite
```

Switching records the theme in `bearnie.json`, so `diff` and `update` compare your CSS against the right palette.

## Package Managers

The CLI detects your package manager from the lockfile (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`) and uses it for all dependency installs. No configuration needed.

## Configuration

After running `init`, a `bearnie.json` file is created in your project root:

```json
{
  "componentsDir": "src/components/bearnie",
  "utilsDir": "src/utils",
  "stylesDir": "src/styles",
  "typescript": true
}
```

### Configuration Options

| Option          | Type      | Default               | Description                                  |
| --------------- | --------- | --------------------- | -------------------------------------------- |
| `componentsDir` | `string`  | `"src/components/bearnie"` | Directory where components will be installed |
| `utilsDir`      | `string`  | `"src/utils"`         | Directory for utility functions              |
| `stylesDir`     | `string`  | `"src/styles"`        | Directory for theme styles                   |
| `typescript`    | `boolean` | `true`                | Whether to use TypeScript                    |

## Environment Variables

| Variable               | Description                                      |
| ---------------------- | ------------------------------------------------ |
| `BEARNIE_REGISTRY_URL`  | Custom registry URL (for self-hosted registries) |
| `BEARNIE_REGISTRY_PATH` | Local file path to registry (for development)    |

## Local Development

For local development and testing:

```bash
# Clone the repository
git clone https://github.com/michael-andreuzza/bearnie.git
cd bearnie

# Install dependencies (npm workspaces)
npm install

# Build packages
npm run build:packages

# Link CLI for local testing
npm run cli:link

# Now you can use it
bearnie add button
```

### Testing with Local Registry

1. Generate the registry files:

   ```bash
   npm run generate-registry
   ```

2. Use the local registry path:
   ```bash
   BEARNIE_REGISTRY_PATH=/path/to/bearnie/public/registry bearnie add button
   ```

Or start the dev server and use the URL:

```bash
npm run dev
BEARNIE_REGISTRY_URL=http://localhost:4321/registry bearnie add button
```

## Available Components

**Form:** button, button-group, checkbox, combobox, file-upload, input, input-group, input-otp, label, radio, select, slider, switch, textarea, toggle, toggle-group

**Layout:** aspect-ratio, card, scroll-area, separator

**Navigation:** breadcrumb, command, context-menu, dropdown-menu, menubar, pagination, sidebar, stepper, tabs, tree

**Feedback:** alert, empty, progress, skeleton, spinner, toast

**Disclosure:** accordion, alert-dialog, collapsible, dialog, popover, sheet

**Display:** avatar, badge, carousel, hover-card, icon, kbd, table, tooltip

**Theme:** styles, theme-toggle

**Meta:** barrel

Shared utilities (`cn`, `focus-trap`, and the `ui-runtime-*` modules) are installed automatically as dependencies of the components that need them.

Run `npx bearnie list` for the always-current list.

## Usage Examples

### Basic Button

```astro
---
import Button from "@/components/bearnie/button/Button.astro";
---

<Button>Default</Button>
<Button variant="secondary">Secondary</Button>
<Button variant="outline">Outline</Button>
<Button variant="destructive">Delete</Button>
<Button size="sm">Small</Button>
<Button size="lg">Large</Button>
```

### Form with Input and Label

```astro
---
import Input from "@/components/bearnie/input/Input.astro";
import Label from "@/components/bearnie/label/Label.astro";
import Button from "@/components/bearnie/button/Button.astro";
---

<form class="space-y-4">
  <div>
    <Label for="email">Email</Label>
    <Input type="email" id="email" placeholder="you@example.com" />
  </div>
  <div>
    <Label for="password">Password</Label>
    <Input type="password" id="password" />
  </div>
  <Button type="submit">Sign In</Button>
</form>
```

### Card with Content

```astro
---
import Card from "@/components/bearnie/card/Card.astro";
import CardHeader from "@/components/bearnie/card/CardHeader.astro";
import CardTitle from "@/components/bearnie/card/CardTitle.astro";
import CardDescription from "@/components/bearnie/card/CardDescription.astro";
import CardContent from "@/components/bearnie/card/CardContent.astro";
import CardFooter from "@/components/bearnie/card/CardFooter.astro";
import Button from "@/components/bearnie/button/Button.astro";
---

<Card class="w-96">
  <CardHeader>
    <CardTitle>Create Account</CardTitle>
    <CardDescription>Enter your details below</CardDescription>
  </CardHeader>
  <CardContent>
    <!-- Form fields here -->
  </CardContent>
  <CardFooter>
    <Button class="w-full">Submit</Button>
  </CardFooter>
</Card>
```

### Alert Messages

```astro
---
import Alert from "@/components/bearnie/alert/Alert.astro";
import AlertTitle from "@/components/bearnie/alert/AlertTitle.astro";
import AlertDescription from "@/components/bearnie/alert/AlertDescription.astro";
---

<Alert>
  <AlertTitle>Heads up!</AlertTitle>
  <AlertDescription>This is an informational message.</AlertDescription>
</Alert>

<Alert variant="destructive">
  <AlertTitle>Error</AlertTitle>
  <AlertDescription>Something went wrong.</AlertDescription>
</Alert>
```

## Path Aliases

Bearnie components use the `@/` path alias. Make sure your `tsconfig.json` has:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  }
}
```

## License

MIT
