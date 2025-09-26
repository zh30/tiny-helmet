# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Tiny Helmet** is a Chrome Extension Manifest v3 scaffold that ships with React 19, Tailwind CSS v4, shadcn UI primitives, Zustand, TanStack React Query, and Rspack. It exposes React-based popup and side panel surfaces, a configurable background service worker, and a themed, localization-aware content script helper.

## Development Commands

- `pnpm dev` – Incremental build that watches all MV3 entrypoints and writes to `dist/`.
- `pnpm build` – Production build with minification and asset copying.
- `pnpm typecheck` – Run TypeScript in no-emit mode using bundler-style resolution.
- **Package manager**: `pnpm@9` (pinned in `package.json`).

## Architecture

- **Entries** (`src/entries/`)
  - `background/` – Service worker orchestrating side panel enablement and host automation.
  - `content/` – Content script that syncs theme preferences, renders a floating opener, and reacts to storage updates.
  - `popup/` – React UI for managing hosts, theme, and automation flags.
  - `side-panel/` – React UI rendered inside Chrome's side panel, reflecting shared state in real time.
- **Shared modules** (`src/shared/`)
  - `config/extension.ts` – Central defaults, entry asset paths, host allowlists, and settings shape.
  - `platform/` – Chrome wrappers (`storage.ts`, `i18n.ts`) that guard access when APIs are unavailable.
  - `state/useExtensionStore.ts` – Persisted Zustand store with hydration helpers and Chrome event subscription.
  - `hooks/` – React hooks for hydration (`useExtensionHydration`) and metadata (`useChromeManifest`).
  - `providers/AppProviders.tsx` – Singleton React Query client for popup + side panel surfaces.
  - `ui/` – shadcn-inspired primitives (`Button`, `Card`, `Input`).
  - `lib/utils.ts` – Utility helpers (`cn`, runtime checks, URL parsing).
- **Styles** (`src/styles/tailwind.css`) – Tailwind 4 tokens for light/dark theming.

## Key Behaviours

- Background worker toggles and optionally opens the side panel based on default hosts and user-pinned domains stored in `chrome.storage`.
- Content script applies the persisted theme and exposes a localized floating action button when the active domain is allowed.
- Popup and side panel hydrate shared state via the Zustand store, backed by React Query for extension metadata and ready for future async data.
- Manifest restricts content scripts and host permissions to the default allowlist; update both alongside `extensionConfig` when adding domains.

## Notes for Contributors

- Add new React surfaces under `src/entries/<feature>` and register them in both `rspack.config.js` and `src/manifest.json`.
- Extend `extensionConfig` when altering storage shape, asset locations, or Chrome permissions to keep background/content logic aligned.
- Prefer shared utilities/hooks/providers to avoid duplicating storage or Chrome API access patterns.
- Use `getMessage` wrappers for user-facing strings and update `_locales/en` + `_locales/zh_CN` together.
- Tailwind tokens power shadcn components; extend `tailwind.config.ts` for new palettes or animations instead of inlining custom CSS.
