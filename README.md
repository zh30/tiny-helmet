# CRXKit

A lightweight Chrome MV3 extension framework powered by Rspack, React 19, Tailwind CSS v4, shadcn UI primitives, Zustand, and a small project-local CLI. Configure entrypoints, manifest metadata, permissions, hosts, and defaults from `extension.config.json`, then ship production-ready bundles from `dist/`.

## Quick start

1. Install dependencies with `pnpm install`.
2. Run `pnpm dev` to produce a watched build in `dist/`.
3. Load `dist/` as an unpacked extension in Chrome (`chrome://extensions`).
4. For production, run `pnpm build`.

## Project layout

- `extension.config.json` — Single source of truth for MV3 entries, permissions, hosts, defaults, and manifest metadata.
- `src/entries/` — MV3 entrypoints for background, content script, popup, side panel, options, and new tab UIs.
- `src/entries/content/` — React-powered content script that mounts inside a Shadow DOM with Tailwind styling.
- `src/shared/` — Reusable configuration, hooks, providers, state, and shadcn-style UI primitives.
- `src/styles/` — Tailwind 4 design tokens and layer definitions.
- `scripts/lib/` & `bin/crxkit.mjs` — Manifest, Rspack, validation, scaffold, and packaging helpers.
- `_locales/` & `public/` — i18n resources and static assets copied to the build.

## Tech stack highlights

- **Config-driven Rspack** for fast, multi-entry bundling tailored to Chrome extensions.
- **React 19 + Tailwind 4** for ergonomics and theming inside popup and side panel surfaces.
- **shadcn UI primitives** (`Button`, `Card`, `Input`) with `class-variance-authority` and `tailwind-merge`.
- **Zustand + chrome.storage** store shared across background, popup, and side panel.
- **React Query** provider ready for async data caching and cross-surface reuse.
- **Localization ready** via `_locales`, with theme-aware content script helpers.
- **CRXKit CLI** for validation, entry generation, manifest inspection, project creation, and zip packaging.

## Useful commands

- `pnpm dev` — Watch mode build; rebuilds extension outputs on file change.
- `pnpm build` — Production bundle with minified assets.
- `pnpm typecheck` — Run TypeScript in no-emit mode to validate types.
- `pnpm test` — Execute the Vitest suite once (CI-friendly).
- `pnpm test:unit` — Execute unit and component tests with Vitest.
- `pnpm test:e2e` — Execute Playwright E2E and browser smoke tests after `pnpm build`.
- `pnpm test:ci` — Run typecheck, Biome, unit tests, build, validation, and E2E.
- `pnpm test:watch` — Re-run tests on file change during local development.
- `pnpm test:coverage` — Generate HTML/LCOV coverage output under `coverage/`.
- `pnpm lint` — Run Biome lint rules without mutating files.
- `pnpm format` — Apply Biome formatting fixes in-place.
- `pnpm check` — Run Biome’s combined lint/format/import organization checks in read-only mode.
- `pnpm validate` — Validate `extension.config.json`, entries, locales, and manifest derivation.
- `pnpm crx manifest --print` — Print the generated MV3 manifest.
- `pnpm crx entry add demo --kind page` — Add a React page entry and update `extension.config.json`.
- `pnpm crx package --out CrxKit.zip` — Build and package `dist/` for Chrome Web Store upload.

## Framework configuration

`extension.config.json` drives both runtime code and build output:

- `entries` are converted into Rspack inputs, HTML outputs, service worker registration, content scripts, side panel, options, and new tab manifest fields.
- `permissions`, `hostPermissions`, `webAccessibleResources`, `minimumChromeVersion`, and localized manifest message keys are emitted into `dist/manifest.json`.
- `settings` and `sidePanel.allowedHosts` are imported by `src/shared/config/extension.ts`, so runtime defaults and manifest/build output stay aligned.

Do not edit `dist/manifest.json` by hand. The source manifest is generated from config during `pnpm build`.

## Testing workflow

- Unit and component tests live under `src/__tests__/` and use Vitest with Testing Library.
- CLI and config tests live under `src/__tests__/unit/scripts/`.
- Extension E2E tests live under `tests/e2e/` and use Playwright.
- The `vitest.config.mjs` file mirrors extension aliases (e.g. `@/`) and bootstraps a happy-path Chrome API stub via `src/__tests__/setup/test-setup.ts`.
- Prefer co-locating tests near shared logic (`@/shared`) to validate hooks, stores, and shadcn primitives.
- Before opening a PR, run `pnpm test:ci` when browser dependencies are installed, or at minimum `pnpm typecheck`, `pnpm check`, `pnpm test:unit`, `pnpm build`, and `pnpm validate`.
- When tests require additional Chrome APIs, extend the shared stub instead of mocking per file to keep behaviour consistent.
- Core extension sideload tests use Playwright bundled Chromium. Chrome and Edge projects are smoke tests for built HTML pages because current browser policies do not reliably support sideloaded extension flags there.

## Content script UI

- The content script (`src/entries/content`) mounts a React tree into a Shadow DOM host so Tailwind utilities stay isolated from the page.
- `contentScript.css` is shipped as a web-accessible resource; the runtime fetches it via `chrome.runtime.getURL(...)` and injects it into the Shadow DOM.
- Theme data (`data-theme` plus `data-theme-preference`) stays in sync across popup, side panel, and content script surfaces.
- If you add more UI, keep it inside the existing React root and reuse shadcn primitives or Tailwind classes for consistent styling.

## Next steps

- Tweak `extension.config.json` to add new hosts, permissions, or surfaces.
- Run `pnpm crx entry add <name> --kind page` to generate additional React entrypoints.
- Expand `_locales/` alongside UI updates so popup, side panel, and content script stay translated.
