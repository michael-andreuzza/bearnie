# Changelog

All notable changes to Bearnie publishable packages and the component registry are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added (registry 0.10.0)

- **Sidebar icon rail.** `collapsible="icon"` keeps a 3rem rail of icons when collapsed on desktop (labels and group labels hide automatically).
- **Sidebar persistence.** New `persist` prop (a localStorage key) saves and restores the open/collapsed state across page loads on desktop.
- **Sidebar mobile backdrop.** When the sidebar overlays content on mobile, a backdrop appears behind it; clicking it closes the sidebar.
- **Sortable tables.** `TableHead` accepts `sortable` — clicking cycles ascending/descending with `aria-sort` and indicator icons, sorting numerically when cell text is numeric (currency/percent formatting stripped) and alphabetically otherwise.
- **Stepper gating.** New `linear` prop blocks clicking steps beyond the furthest step reached (locked triggers get `aria-disabled` styling). Buttons with `data-stepper-next`/`data-stepper-prev` placed next to the stepper advance or rewind it, and the stepper dispatches a bubbling `stepper-change` CustomEvent with `{ step }`.
- **Carousel breakpoints.** New `breakpoints` prop maps media queries to `slidesPerView`/`spacing` overrides, e.g. `{ "(min-width: 1024px)": { slidesPerView: 3 } }`.

### Added (registry 0.9.0)

- **Dropdown menu submenus + checkbox/radio items.** New `DropdownMenuSub`, `DropdownMenuSubTrigger`, `DropdownMenuSubContent`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioGroup`, and `DropdownMenuRadioItem`. Submenus open on hover, click, or ArrowRight and close with ArrowLeft/Escape; checkbox/radio items keep the menu open and dispatch `dropdown-checkbox-change` / `dropdown-radio-change` CustomEvents.
- **Context menu submenus + checkbox/radio items.** The same six sub-components for `ContextMenu` (`ContextMenuSub`, `ContextMenuSubTrigger`, `ContextMenuSubContent`, `ContextMenuCheckboxItem`, `ContextMenuRadioGroup`, `ContextMenuRadioItem`), with `context-menu-checkbox-change` / `context-menu-radio-change` events.
- **Enter/exit animation system (`overlay` utility).** Popover, dropdown menu, context menu, tooltip, hover card, dialog, alert dialog, sheet, and the command dialog now animate open and closed, driven by `data-state` and keyframes in `bearnie.css`. Exit animations complete before the element is hidden, sheets slide from their edge, backdrops fade, and everything is disabled under `prefers-reduced-motion`. Override or remove the animations by targeting the `[data-*-content][data-state]` selectors in your own CSS.
- **Nested modal support.** Body scroll lock is now reference-counted across dialogs, alert dialogs, sheets, and the command dialog — closing a nested modal no longer unlocks scrolling while the outer one is open — and Escape closes only the topmost open modal instead of all of them.
- **Tabs URL sync.** New `syncKey` prop: selecting a tab updates a `?<syncKey>=` URL param via `history.replaceState`, and links with the param activate that tab on load.

### Changed (registry 0.9.0)

- The active-tab pill now slides between tab triggers: the tabs runtime renders a single `[data-tabs-indicator]` element (styled in `bearnie.css`, motion disabled under reduced motion) instead of each trigger painting its own background, and repositions it on activation and layout changes.
- Submenu panels (`DropdownMenuSubContent`, `ContextMenuSubContent`, `MenubarSubContent`) now use `w-max` so long labels don't wrap — absolutely-positioned panels otherwise shrink-to-fit against the parent menu's width — and button-based menu items set `text-left` so wrapped text can't center.
- `DropdownMenuContent` and `ContextMenuContent` no longer set `overflow-hidden` (submenus must overflow the panel); `ContextMenuContent` also dropped inert `animate-in fade-in-0 zoom-in-95` classes that referenced undefined utilities.
- The `position` utility's cleanup no longer clears inline coordinates, so closing overlays hold their place while the exit animation plays.

### Added (registry 0.8.0)

- **`field` component.** New form primitives: `Field`, `FieldGroup`, `FieldLabel`, `FieldDescription`, `FieldError`. `Field` wires the label to the control, connects description/error via `aria-describedby`, and sets `aria-invalid` automatically (toggle `data-invalid` from your own validation code). `Input`, `Textarea`, `Select`, and `Checkbox` now style themselves when `aria-invalid` is set.
- **Collision-aware positioning (`position` utility).** Tooltip, popover, hover-card, dropdown menu, and combobox now position with `position: fixed`, flip to the opposite side when there's no room, shift to stay inside the viewport, and are no longer clipped by `overflow` containers. Content elements expose `data-side`/`data-align` reflecting the resolved position, and a `--trigger-width` CSS variable.
- **Toast upgrades.** Hovering a toast pauses its auto-dismiss timer; `Toaster` has a `max` prop (default 5) that dismisses the oldest toast when exceeded; new `toast.promise(promise, { loading, success, error })` and `toast.dismiss(el)`; toasts animate in.
- **File-upload validation.** `accept` and `maxSize` are now enforced (previously advertised but never checked, and drag-and-drop bypassed the picker filter entirely). Rejected files show an error and are removed from the input; the root dispatches `file-upload-change` with `{ files, rejected }`.
- **Command palette.** Typing now auto-selects the first result so Enter activates it immediately; Home/End navigation added.
- `DialogClose` — wraps any element to close the dialog on click (parity with `SheetClose`).
- `DropdownMenuItem` accepts `href` and renders a link.
- InputOTP dispatches `otp-change` and `otp-complete` CustomEvents.
- ScrollArea: standard `scrollbar-width`/`scrollbar-color` support (Firefox and Chromium 121+) and horizontal-scrollbar sizing.
- `CarouselThumbnails`/`CarouselThumbnail` are now documented.

### Removed (registry 0.8.0)

- The undocumented declarative `Toast`, `ToastTitle`, and `ToastDescription` (the programmatic `toast()` API is the toast API), `StepperContent`, and `BreadcrumbDropdownItem`.
- `Radio` — use `RadioGroupItem`, which now takes an optional `name` for standalone use.
- `BreadcrumbEllipsis` is now a static indicator (as in shadcn); compose it with `DropdownMenu` for clickable collapsed crumbs.
- 18 unused icon exports pruned from `icons.ts`.
- The barrel `index.ts` is now auto-generated from folder contents by `generate-registry`, so it can't drift.

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
