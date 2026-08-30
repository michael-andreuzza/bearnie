# Changelog

All notable changes to Bearnie publishable packages and the component registry are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added

- Theme picker: four color themes (`default`, `amber`, `forest`, `midnight`) as static registry entries (`styles-*`)
- `bearnie init` and `create-bearnie` ask which theme to install; `create-bearnie --theme=<name>` skips the prompt
- Switching themes via `bearnie add styles-<name> --overwrite` records the choice in `bearnie.json`, keeping `diff`/`update` and the MCP `list_installed` tool comparing against the active palette

## [0.2.0 / 0.5.0 / 0.2.0] - 2026-08-30

- bearnie diff and bearnie update commands for pulling registry fixes into existing projects
- add now prompts before overwriting existing files; new --overwrite flag
- Richer init: @/* tsconfig alias, @tailwindcss/vite wiring, base styles install
- Package-manager detection (npm, pnpm, yarn, bun) across CLI, create-bearnie, and MCP
- MCP list_installed tool reporting per-component update status
- Tag-triggered npm publish workflow using trusted publishing (OIDC)
- Dependency majors: chalk 6, commander 15, diff 9, execa 10, ora 9; Node >=22.12 now required


### Added

- CLI `diff` command: compare installed components against the registry with per-file diffs
- CLI `update` command: pull the latest registry version of installed components, with confirmation and automatic npm dependency install
- CLI `add` now asks before overwriting existing files; new `--overwrite` flag
- Richer `init`: adds the `@/*` tsconfig path alias, wires `@tailwindcss/vite` into simple Astro configs, and installs `src/styles/bearnie.css`
- Package-manager detection (npm, pnpm, yarn, bun) across the CLI, create-bearnie, and the MCP server
- MCP `list_installed` tool: shows installed components and whether each is up to date with the registry
- Tag-triggered npm publish workflow (`publish.yml`) with a re-runnable `scripts/publish-packages.ts` that only publishes new versions

### Changed

- `init` installs the `cn` utility from the registry so fresh projects start clean in `bearnie diff`
- Updated CLI dependencies to latest majors: chalk 6, commander 15, diff 9, execa 10, ora 9
- Node requirement raised from >=18 to >=22.12 across all packages, matching Astro 7's own requirement (TypeScript stays on 5.x for `astro check` compatibility)

## [create-bearnie 0.4.4] - 2026-08-05

- Bump create-bearnie to 0.4.4 for canvas token in template

## [0.1.7 / 0.4.3 / 0.1.3] - 2026-08-05

- Release automation script with changelog, tagging, and optional npm publish
- CI workflow with build, smoke tests, and registry drift check
- MCP add_components batch tool with dependency resolution and barrel-last ordering
- create-bearnie writes bearnie.json on all scaffolds for CLI-ready projects
- Restored TypeScript declaration builds for bearnie, create-bearnie, and @bearnie/mcp
- Coordinated registry versioning via registryVersion field
- CLI list theme/meta categories, barrel discoverability, and docs polish
- Vertical toggle-group docs with correct align icons


## [0.1.6 / 0.4.2 / 0.1.2] - 2026-08-05

### Added

- npm workspaces monorepo with unified `build:packages` and `build:all` scripts
- Barrel export via `bearnie add barrel` for `import { ... } from "@/components/bearnie"`
- `toggle-group` registry alias for docs-aligned installs
- MCP local registry path support and improved install paths for styles/utilities
- Public docs for barrel imports, Astro 7 requirement, and MCP batch workflows

### Changed

- CLI `--version` reads from `package.json` dynamically
- `create-bearnie` template bumped to Astro 7 with aligned Tailwind v4
- `create-bearnie --full` installs to `src/components/bearnie/` with barrel last
- MCP usage examples and install paths use `@/components/bearnie`

### Fixed

- Vertical `ToggleGroup` connected border and corner rounding
- Theme/runtime consistency for dialog, dropdown, and tabs components
