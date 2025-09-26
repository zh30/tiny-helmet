# Repository Guidelines

## Project Structure & Module Organization
- `src/entries/` houses MV3 entrypoints: `background/`, `content/`, `popup/`, and `side-panel/` ship TypeScript + React code paired with HTML shells.
- `src/shared/` contains cross-surface logic—`config/`, `platform/`, `state/`, `hooks/`, `providers/`, and `ui/` export extension defaults, Chrome wrappers, Zustand stores, React Query providers, and shadcn-style primitives.
- `src/styles/` defines Tailwind 4 tokens used across popup, side panel, and injected UI; adjust here before editing generated CSS.
- `_locales/` stores i18n strings consumed via `chrome.i18n.getMessage`; update both `en` and `zh_CN` when UI copy changes.
- `public/` holds static assets copied verbatim to `dist/`; keep filenames stable for manifest references.

## Build, Test & Development Commands
- `pnpm install` hydrates dependencies and updates `pnpm-lock.yaml` (pinned to pnpm v9).
- `pnpm dev` runs `rspack build --watch`, emitting MV3 assets into `dist/` for use with `chrome://extensions`.
- `pnpm build` performs a production build: minified bundles, cleaned output, copied assets/locales.
- `pnpm typecheck` executes TypeScript in no-emit mode using bundler resolution; run before sending a PR.

## Coding Style & Naming Conventions
- TypeScript + React 19 with functional components, hooks, and Zustand for shared state. Favor `@/shared/...` imports via tsconfig paths.
- Stick to two-space indentation, trailing semicolons, and single quotes (JSX attributes may use double quotes).
- Entry folders use kebab-case, component files PascalCase (`SomeComponent.tsx`), shared utilities camelCase, assets kebab-case.
- Tailwind utilities live inline; compose reusable patterns through shadcn primitives (`src/shared/ui`) or tokens in `tailwind.config.ts`.

## Testing Guidelines
- Automated tests are not configured; document manual verification steps (popup + side panel flows, Chrome side panel toggling) in PRs.
- When introducing tests, colocate in `src/__tests__/` and target Vitest-style APIs so we can wire the runner later.
- Mock `chrome.*` APIs and storage listeners to keep unit tests deterministic.

## Commit & Pull Request Guidelines
- Follow Conventional Commits (`type(scope): subject`), matching existing history (`refactor(rspack)`, `docs:`).
- Reference related issues, highlight user-facing impact, and note any manual extension reload steps for reviewers.
- Provide screenshots or recordings for UI changes and confirm `_locales/` entries stay in sync.

## Extension Packaging & Localization Tips
- After `pnpm build`, zip `dist/` for Chrome Web Store uploads; omit source maps unless debugging.
- Keep `extensionConfig` in sync with `manifest.json` (entry file paths, matches, permissions) to avoid drift.
- Prefer `getMessage` helpers over hard-coded strings in React surfaces or content scripts to stay localization-ready.
