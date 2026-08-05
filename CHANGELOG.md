# Changelog

All notable changes to Bearnie publishable packages and the component registry are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

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
