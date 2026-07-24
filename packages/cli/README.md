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

# 4. Use in your Astro pages
```

```astro
---
import Button from "@/components/ui/button/Button.astro";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
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

**Options:**

- `-y, --yes` - Skip confirmation prompts and use defaults
- `-c, --cwd <path>` - Set the working directory (defaults to current directory)

### `add`

Add components to your project.

```bash
# Add a single component
npx bearnie add button

# Add multiple components
npx bearnie add button card input

# Add all available components
npx bearnie add --all

# Interactive component selection
npx bearnie add
```

**Options:**

- `-y, --yes` - Skip confirmation prompts
- `-a, --all` - Add all available components
- `-c, --cwd <path>` - Set the working directory

### `list`

List all available components.

```bash
# Display formatted list
npx bearnie list

# Output as JSON
npx bearnie list --json
```

**Options:**

- `--json` - Output as JSON

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

# Install CLI dependencies
cd packages/cli
npm install

# Build the CLI
npm run build

# Link for local testing
npm link

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

**Form:** button, input, textarea, label, checkbox, radio, select, switch

**Layout:** card, separator, scroll-area, aspect-ratio

**Navigation:** breadcrumb, tabs, dropdown-menu

**Feedback:** alert, badge, progress, skeleton, spinner, toast, tooltip

**Disclosure:** accordion, collapsible, dialog, popover

**Display:** avatar, table

## Usage Examples

### Basic Button

```astro
---
import Button from "@/components/ui/button/Button.astro";
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
import Input from "@/components/ui/input/Input.astro";
import Label from "@/components/ui/label/Label.astro";
import Button from "@/components/ui/button/Button.astro";
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
import Card from "@/components/ui/card/Card.astro";
import CardHeader from "@/components/ui/card/CardHeader.astro";
import CardTitle from "@/components/ui/card/CardTitle.astro";
import CardDescription from "@/components/ui/card/CardDescription.astro";
import CardContent from "@/components/ui/card/CardContent.astro";
import CardFooter from "@/components/ui/card/CardFooter.astro";
import Button from "@/components/ui/button/Button.astro";
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
import Alert from "@/components/ui/alert/Alert.astro";
import AlertTitle from "@/components/ui/alert/AlertTitle.astro";
import AlertDescription from "@/components/ui/alert/AlertDescription.astro";
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
