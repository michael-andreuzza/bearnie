# create-bearnie

Create a new Astro project with Bearnie UI components pre-configured.

## Usage

```bash
npm create bearnie
# or
npx create-bearnie
# or with a project name
npm create bearnie my-app
```

## Options

### `--full`

Include all components from the start:

```bash
npx create-bearnie my-app --full
```

This fetches all components from the registry, installs them in `src/components/bearnie/`, and adds a barrel export at `src/components/bearnie/index.ts`.

## What's included

- Astro 7 with TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Bearnie CSS variables and theme
- Simple landing page to get started
- Ready for components via `npx bearnie add`

With `--full` flag:

- All Bearnie UI components in `src/components/bearnie/`
- Barrel export (`src/components/bearnie/index.ts`) for named imports
- Utility functions (`cn`, runtime helpers, `focus-trap`)
- Additional dependencies (`clsx`, `tailwind-merge`)

## After creating your project

```bash
cd my-app
npm install
npm run dev
```

Without `--full`, add components as needed:

```bash
npx bearnie add button card dialog
npx bearnie add barrel
```

Import from the barrel after adding it:

```astro
---
import { Button, Card } from "@/components/bearnie";
---
```

## Learn more

- [Bearnie Documentation](https://bearnie.dev/docs)
- [Browse Components](https://bearnie.dev/docs/components)
- [GitHub](https://github.com/michael-andreuzza/bearnie)
