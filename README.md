# Tiny Helmet

A modern Chrome extension scaffold powered by Rspack, React 19, Tailwind CSS v4, shadcn UI primitives, and Zustand state management. Configure hosts, theme, and side panel behaviour with minimal setup and ship production-ready MV3 bundles quickly.

## Quick start

1. Install dependencies with `pnpm install`.
2. Run `pnpm dev` to produce a watched build in `dist/`.
3. Load `dist/` as an unpacked extension in Chrome (`chrome://extensions`).
4. For production, run `pnpm build`.

## Project layout

- `src/entries/` — MV3 entrypoints for background, content script, popup, and side panel UIs.
- `src/entries/content/` — React-powered content script that mounts inside a Shadow DOM with Tailwind styling.
- `src/shared/` — Reusable configuration, hooks, providers, state, and shadcn-style UI primitives.
- `src/styles/` — Tailwind 4 design tokens and layer definitions.
- `_locales/` & `public/` — i18n resources and static assets copied to the build.

## Tech stack highlights

- **Rspack** for fast, multi-entry bundling tailored to Chrome extensions.
- **React 19 + Tailwind 4** for ergonomics and theming inside popup and side panel surfaces.
- **shadcn UI primitives** (`Button`, `Card`, `Input`) with `class-variance-authority` and `tailwind-merge`.
- **Zustand + chrome.storage** store shared across background, popup, and side panel.
- **React Query** provider ready for async data caching and cross-surface reuse.
- **Localization ready** via `_locales`, with theme-aware content script helpers.

## Useful commands

- `pnpm dev` — Watch mode build; rebuilds extension outputs on file change.
- `pnpm build` — Production bundle with minified assets.
- `pnpm typecheck` — Run TypeScript in no-emit mode to validate types.
- `pnpm test` — Execute the Vitest suite once (CI-friendly).
- `pnpm test:watch` — Re-run tests on file change during local development.
- `pnpm test:coverage` — Generate HTML/LCOV coverage output under `coverage/`.
- `pnpm lint` — Run Biome lint rules without mutating files.
- `pnpm format` — Apply Biome formatting fixes in-place.
- `pnpm check` — Run Biome’s combined lint/format/import organization checks in read-only mode.

## Testing workflow

- Unit and component tests live under `src/__tests__/` and use Vitest with Testing Library.
- The `vitest.config.ts` file mirrors extension aliases (e.g. `@/`) and bootstraps a happy-path Chrome API stub via `src/__tests__/setup/test-setup.ts`.
- Prefer co-locating tests near shared logic (`@/shared`) to validate hooks, stores, and shadcn primitives.
- Before opening a PR, run `pnpm typecheck`, `pnpm check`, and `pnpm test` (or `pnpm test:coverage` when you need a report for reviewers).
- When tests require additional Chrome APIs, extend the shared stub instead of mocking per file to keep behaviour consistent.

## Content script UI

- The content script (`src/entries/content`) mounts a React tree into a Shadow DOM host so Tailwind utilities stay isolated from the page.
- `contentScript.css` is shipped as a web-accessible resource; the runtime fetches it via `chrome.runtime.getURL(...)` and injects it into the Shadow DOM.
- Theme data (`data-theme` plus `data-theme-preference`) stays in sync across popup, side panel, and content script surfaces.
- If you add more UI, keep it inside the existing React root and reuse shadcn primitives or Tailwind classes for consistent styling.

## Next steps

- Tweak `extensionConfig` + `manifest.json` to add new hosts, permissions, or surfaces.
- Drop additional React entrypoints under `src/entries` and register them inside `rspack.config.js`.
- Expand `_locales/` alongside UI updates so popup, side panel, and content script stay translated.
