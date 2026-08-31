# Changelog

All notable changes to Bearnie publishable packages and the component registry are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Breaking (registry 0.7.0)

API unifications from the consistency audit. If you installed components before this version, `bearnie diff` will show these renames; update your usage when you pull them:

- `Combobox`, `InputOTP`, and `MenubarRadioGroup`: the `value` prop is now `defaultValue`, matching Tabs, RadioGroup, ToggleGroup, and Slider
- One icon-button convention everywhere: `PaginationLink` replaces `size="icon"` with `iconOnly` (default `true`, so bare usage is unchanged); `InputGroupButton` replaces `size="icon-xs" | "icon-sm"` with `size="xs" | "sm"` plus `iconOnly`
- `ComboboxItem` slots renamed `leading`/`trailing` to `left-icon`/`right-icon`; `MenubarMegaItem` slot `icon` renamed to `left-icon` (matching Button)
- Toaster: `toast.error()` is now `toast.destructive()` (`type: "destructive"`), matching the variant vocabulary used by Button, Badge, Alert, and the declarative Toast — which now also supports `success`, `warning`, and `info` variants
- Overlay triggers (popover, dialog, alert dialog, sheet, command dialog) now expose `data-state="open|closed"` like dropdown and menubar, so `data-[state=open]:` styling works on all of them; the dialog-family triggers also gained `aria-haspopup`/`aria-expanded`
- `PaginationLink`, `PaginationPrevious`, and `PaginationNext` no longer default `href` to `"#"`: with an `href` they render an anchor, without one they render a `<button type="button">`, matching Button, SidebarMenuButton, and StepperTrigger

## [0.3.2 / 0.6.2 / 0.3.2] - 2026-08-31

- See commit history for details.


### Changed

- **Consistency pass (registry 0.6.0).** Findings from a full component consistency audit:
  - `AlertDialogAction`, `AlertDialogCancel`, and `ThemeToggle` now forward `class`, `id`, `aria-*`, and `data-*` attributes like every other component
  - Dialog and alert dialog now lock body scroll while open, matching sheet and command dialog
  - `CommandDialogContent` declares `role="dialog"` and `aria-modal="true"`
  - Context menu moves focus into the menu on open and restores it on close; theme toggle and breadcrumb ellipsis menus gained arrow-key/Home/End navigation and focus restore, matching the other `role="menu"` components
  - Dropdown menu Escape now works at document level (previously only when focus was inside the menu); menubar's document-level Escape restores trigger focus
  - Decorative SVGs in menubar items, toaster, and file-upload previews are now `aria-hidden`; the toaster close button has an accessible label
  - `AlertDialog`, `Sheet`, and `ContextMenu` scripts moved into shared runtime modules (`ui-runtime-alert-dialog`, `ui-runtime-sheet`, `ui-runtime-context-menu`) loaded via `registerUiInit`, removing the duplicated inline copies. Run `bearnie update` to pull the new modules with the updated components.

## [0.3.1 / 0.6.1 / 0.3.1] - 2026-08-30

- See commit history for details.


## [0.3.0 / 0.6.0 / 0.3.0] - 2026-08-30

- See commit history for details.


### Added

- Theme picker: every Tailwind base color (9 gray scales) x accent color (17 colors plus a neutral default) combination — 161 themes generated from Tailwind's official oklch palette as registry entries (`styles-blue`, `styles-slate`, `styles-slate-blue`, ...)
- `bearnie init` and `create-bearnie` ask for base and accent; `create-bearnie --theme=<name>` skips the prompts
- Switching themes via `bearnie add styles-<name> --overwrite` records the choice in `bearnie.json`, keeping `diff`/`update` and the MCP `list_installed` tool comparing against the active palette

### Changed

- **Per-feature UI runtime (registry 0.4.0).** The monolithic `ui-boot.ts` is gone; components now register only the runtime modules they use via `registerUiInit()` in `src/utils/runtime/loader.ts`. Installing e.g. `tabs` no longer pulls in popover, dialog, command, combobox, and dropdown code. The duplicated Enter/Space keyboard shims in `DialogTrigger`, `AlertDialogTrigger`, `SheetTrigger`, and `CollapsibleTrigger` were consolidated into the shared `disclosure-triggers` runtime.
- Component script fixes: stepper content panels now show/hide with the active step, tree folder icons swap open/closed, buttons default to `type="button"`, file-upload removes files from `input.files`, sliders no longer scroll the page during touch drag, toasts escape user-provided strings, and document-level listeners no longer leak across view-transition navigations (popover, dialog, dropdown, command, sheet, sidebar, carousel).

### Upgrading existing projects

Run `bearnie update` to pull the new loader and component scripts together. A leftover `src/utils/runtime/ui-boot.ts` from older installs is orphaned and safe to delete.

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
