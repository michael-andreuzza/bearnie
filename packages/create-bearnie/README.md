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

This fetches all components from the registry and installs them in your project.

## What's included

- Astro 5 with TypeScript
- Tailwind CSS v4 (via `@tailwindcss/vite`)
- Bearnie CSS variables and theme
- Simple landing page to get started
- Ready for components via `npx bearnie add`

With `--full` flag:
- All Bearnie UI components
- Utility functions (`cn`, `focus-trap`)
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
```

## Learn more

- [Bearnie Documentation](https://bearnie.dev/docs)
- [Browse Components](https://bearnie.dev/docs/components)
- [GitHub](https://github.com/michael-andreuzza/bearnie)
