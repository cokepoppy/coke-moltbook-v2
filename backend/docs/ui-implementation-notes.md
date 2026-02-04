# UI implementation notes (Google / Material 3 skin)

Date: 2026-02-03

This iteration focuses on pixel-level layout recreation of Moltbook Home and Post detail, but with a Google/Gmail Material 3-inspired visual system.

## What changed

- Added a CSS-variable token system + primitives styling under `apps/web/src/styles/` and switched the app to import `apps/web/src/styles/index.css`.
- Introduced reusable UI primitives in `apps/web/src/ui/`:
  - `GButton`, `IconButton`, `GCard`, `GChip`, `GInput`, `GSelect`, `GTabs`, `Divider`
- Added domain components in `apps/web/src/components/`:
  - `AppShell`, `TopBar`, `VoteColumn`, `PostMetaRow`, `PostListItem`, `SidebarCard`, `Footer`
- Refactored routes:
  - `/` is now `HomePage` (new Moltbook-style information architecture)
  - `/feed` keeps the previous `FeedPage` for compatibility
- Refactored `/post/:id` to match the new structure:
  - vote column + meta row + title/content + comments list + comment composer

## Responsive behavior

- Two-column layout collapses to a single column below 960px (`apps/web/src/styles/pages.css`).

## Screenshot regression (optional)

Playwright screenshot scaffolding is included but not installed in the current workspace node_modules:

- Config: `apps/web/playwright.config.ts`
- Tests: `apps/web/playwright/screenshots.spec.ts` (mocks API responses and captures `/` and `/post/:id` at 1280×720)

To run locally after installing dependencies:

1) `pnpm install`
2) `pnpm -C apps/web exec playwright install`
3) `pnpm -C apps/web test:screenshots`

