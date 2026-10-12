# AGENTS.md

## Project Overview

OmniCommonTools is a local-only Vite + React + TypeScript developer toolbox.
The MVP tools are:

- JSON formatter
- Text / JSON Diff
- Timestamp converter
- Information codec

All user inputs and generated results must stay in browser memory. Do not persist
JSON text, Diff text, imported file contents, timestamps entered by the user, or
codec input, or conversion results.

Allowed persisted data:

- Theme preference
- Favorite tool IDs
- Recent tool IDs and timestamps
- Tool settings explicitly supported by `src/features/preferences/storage.ts`

## Common Commands

Run from the project root:

```bash
npm install
npm run dev
npm test -- --run
npm run build
npm run e2e
```

Local production preview:

```bash
npm run preview -- --host 127.0.0.1
```

If Playwright browsers are unavailable, use local Chrome:

```bash
PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" npm run e2e
```

## Architecture Notes

- Routes are defined in `src/app/router.tsx`.
- Shared shell and editor components live under `src/components`.
- Catalog metadata lives under `src/features/catalog`.
- Preferences are allow-listed in `src/features/preferences/storage.ts`.
- Each tool keeps its engine separate from React page components:
  - JSON: `src/features/json/jsonEngine.ts`
  - Diff: `src/features/diff`
  - Time: `src/features/time/timeEngine.ts`
  - Codec: `src/features/codec/codecEngine.ts`

## Implementation Rules

- Prefer existing components and CSS patterns over adding new abstractions.
- Keep tool engines framework-independent where practical.
- Use Monaco editor APIs through shared components instead of page-local hacks.
- For JSON, preserve large decimal number text with `lossless-json`.
- For Diff, preserve JSON type semantics and array order; object key order should
  not create JSON-mode differences.
- For Time, use Luxon/IANA zones and never manually add fixed timezone offsets.
- Do not store user input in local storage, URLs, cookies, logs, or analytics.

## Current UX Decisions

- JSON formatting runs automatically after input changes and still keeps the
  manual Format button.
- JSON output uses fixed 2-space formatting; there is no indentation selector.
- Diff input panes synchronize vertical scrolling in side-by-side view.
- Diff highlights changed rows inside the A/B input editors while typing, using
  a short debounce. The Compare button remains for immediate comparison.
- Codec methods are shown in a compact two-column picker. Codec conversion runs
  automatically after input changes and still keeps the manual Convert button.

## Testing Guidance

- Follow test-first changes for behavior updates.
- For focused changes, run the relevant feature tests first, then run:

```bash
npm test -- --run
npm run build
```

- Before claiming browser behavior, verify through Playwright or the local
  preview page.
- Known non-blocking build warning: Monaco-related chunks exceed Vite's default
  500 kB warning threshold.

## Git Notes

- Do not revert unrelated user changes.
- Do not commit generated design docs or `.superpowers` artifacts unless the
  user explicitly asks.
- Keep commits scoped to source, tests, config, and dependency files needed for
  the requested change.
