# Developer Tools Web MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive, local-only developer tools SPA with an extensible catalog, JSON formatter, text/JSON diff, and timestamp converter.

**Architecture:** Use a Vite React TypeScript SPA with route-level lazy loading. Keep catalog metadata, persistence, and each tool engine independent from React so the same engines can later be reused by a browser extension. Use Monaco for editing/diff presentation, `lossless-json` for numeric fidelity, and Luxon for IANA timezone behavior.

**Tech Stack:** Node.js 20+, React, TypeScript, Vite, React Router, Monaco Editor, lossless-json, jsdiff, Luxon, Lucide React, Vitest, Testing Library, Playwright, axe-core.

## Global Constraints

- All implementation files, tests, generated lockfiles, and project documentation live under `/Users/bytedance/go/src/study/OmniCommonTools`.
- All tool input and output remains in browser memory; never persist user content in Local Storage, IndexedDB, cookies, URLs, logs, or analytics.
- Persist only theme, favorites, recent tool IDs/timestamps, and per-tool preferences named in the approved spec.
- The web MVP has no backend and must build as a static site.
- JSON formatting and JSON diff must preserve decimal text beyond JavaScript's safe integer range.
- JSON diff ignores object-key order, preserves array order, and compares JSON types strictly.
- Timestamp conversion supports seconds, milliseconds, IANA zones, negative timestamps, zero, and DST gap/overlap handling.
- Each imported file is limited to 5 MB.
- Desktop tools use two panes where specified; narrow screens use a single-column layout with no clipped controls.
- Use Lucide icons for familiar actions and provide accessible names/tooltips for icon-only controls.
- Meet WCAG 2.1 AA contrast, visible focus, keyboard operation, reduced-motion, and non-color-only diff indicators.
- Do not implement browser-extension behavior, accounts, cloud storage, sharing, AI features, or tools outside the three-tool MVP.

---

### Task 1: Bootstrap the SPA and shared application shell

**Files:**
- Create: `package.json`
- Create: `package-lock.json`
- Create: `index.html`
- Create: `tsconfig.json`
- Create: `tsconfig.app.json`
- Create: `vite.config.ts`
- Create: `playwright.config.ts`
- Create: `src/main.tsx`
- Create: `src/app/App.tsx`
- Create: `src/app/router.tsx`
- Create: `src/components/AppShell.tsx`
- Create: `src/components/IconButton.tsx`
- Create: `src/styles/global.css`
- Create: `src/styles/tokens.css`
- Create: `src/test/setup.ts`
- Create: `src/components/AppShell.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Produces: `App`, `AppShell`, `IconButton`, shared CSS tokens, and lazy route placeholders used by all later tasks.
- Produces route contract: `/`, `/favorites`, `/tools/json-formatter`, `/tools/text-json-diff`, `/tools/timestamp-converter`, `/about`.

- [ ] **Step 1: Write the failing shell test**

```tsx
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";

it("renders primary navigation and page content", () => {
  render(
    <MemoryRouter>
      <AppShell><main>Page body</main></AppShell>
    </MemoryRouter>,
  );
  expect(screen.getByRole("link", { name: "全部工具" })).toHaveAttribute("href", "/");
  expect(screen.getByRole("link", { name: "收藏" })).toHaveAttribute("href", "/favorites");
  expect(screen.getByText("Page body")).toBeInTheDocument();
});
```

- [ ] **Step 2: Install the app and test dependencies, then verify the test fails**

Run:

```bash
npm init -y
npm install react react-dom react-router-dom lucide-react @monaco-editor/react monaco-editor lossless-json diff luxon
npm install -D typescript vite @vitejs/plugin-react vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event @types/react @types/react-dom @types/diff @types/luxon playwright @playwright/test @axe-core/playwright
npx vitest run src/components/AppShell.test.tsx
```

Expected: FAIL because the Vite configuration and `AppShell` do not exist yet.

- [ ] **Step 3: Add configuration and the minimal application shell**

Implement:

```tsx
// src/components/AppShell.tsx
import type { PropsWithChildren } from "react";
import { Link, NavLink } from "react-router-dom";
import { Moon, Star } from "lucide-react";
import { IconButton } from "./IconButton";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">Toolbox</Link>
        <nav aria-label="主导航">
          <NavLink to="/" end>全部工具</NavLink>
          <NavLink to="/favorites">收藏</NavLink>
          <NavLink to="/about">关于</NavLink>
        </nav>
        <div className="topbar-actions">
          <IconButton label="查看收藏"><Star /></IconButton>
          <IconButton label="切换主题"><Moon /></IconButton>
        </div>
      </header>
      {children}
    </div>
  );
}
```

Configure `vitest` with `jsdom`, `src/test/setup.ts`, React plugin, TypeScript strict mode, scripts for `dev`, `build`, `test`, `test:watch`, and `e2e`, and global CSS tokens for light/dark themes. Configure Playwright to own the test server:

```ts
// playwright.config.ts
export default defineConfig({
  testDir: "./e2e",
  use: { baseURL: "http://127.0.0.1:4173" },
  webServer: {
    command: "npm run preview -- --host 127.0.0.1",
    port: 4173,
    reuseExistingServer: !process.env.CI,
  },
});
```

- [ ] **Step 4: Run shell tests and production build**

Run:

```bash
npm test -- --run src/components/AppShell.test.tsx
npm run build
```

Expected: shell test PASS and Vite build exits 0.

- [ ] **Step 5: Commit the bootstrapped shell**

```bash
git add package.json package-lock.json index.html tsconfig*.json vite.config.ts playwright.config.ts src README.md
git commit -m "feat: bootstrap developer tools web app"
```

---

### Task 2: Implement the extensible catalog, favorites, and recent tools

**Files:**
- Create: `src/features/catalog/types.ts`
- Create: `src/features/catalog/tools.ts`
- Create: `src/features/catalog/search.ts`
- Create: `src/features/preferences/storage.ts`
- Create: `src/features/preferences/usePreferences.ts`
- Create: `src/components/ToolCard.tsx`
- Create: `src/components/ToolGrid.tsx`
- Create: `src/pages/HomePage.tsx`
- Create: `src/pages/FavoritesPage.tsx`
- Create: `src/pages/AboutPage.tsx`
- Create: `src/features/catalog/search.test.ts`
- Create: `src/features/preferences/storage.test.ts`
- Create: `src/pages/HomePage.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces: `ToolDefinition`, `TOOLS`, `filterTools`, `PreferenceStore`, `usePreferences`.
- `ToolDefinition`:

```ts
export type ToolCategory = "format" | "diff" | "time";

export interface ToolDefinition {
  id: "json-formatter" | "text-json-diff" | "timestamp-converter";
  name: string;
  description: string;
  category: ToolCategory;
  keywords: readonly string[];
  route: string;
  order: number;
}
```

- [ ] **Step 1: Write failing catalog and persistence tests**

```ts
it("filters by category and normalized search text", () => {
  expect(filterTools(TOOLS, "JSON", "diff")).toHaveLength(1);
  expect(filterTools(TOOLS, "毫秒", "all").map((tool) => tool.id))
    .toEqual(["timestamp-converter"]);
});

it("stores only approved preference fields", () => {
  const store = createPreferenceStore(memoryStorage);
  store.toggleFavorite("json-formatter");
  store.markRecent("json-formatter", 123);
  expect(JSON.parse(memoryStorage.getItem(STORAGE_KEY)!)).toEqual({
    favorites: ["json-formatter"],
    recent: [{ toolId: "json-formatter", usedAt: 123 }],
    settings: {},
    theme: "system",
  });
});
```

- [ ] **Step 2: Run focused tests and confirm failure**

Run:

```bash
npm test -- --run src/features/catalog/search.test.ts src/features/preferences/storage.test.ts
```

Expected: FAIL because catalog and storage modules do not exist.

- [ ] **Step 3: Implement catalog search and allow-listed local persistence**

Implement `TOOLS` with the three approved entries. Normalize query text with `trim().toLocaleLowerCase()` and search the concatenated name, description, and keywords. Store only:

```ts
export interface PersistedPreferences {
  theme: "light" | "dark" | "system";
  favorites: ToolDefinition["id"][];
  recent: Array<{ toolId: ToolDefinition["id"]; usedAt: number }>;
  settings: {
    jsonIndent?: 2 | 4 | "tab";
    jsonSortKeys?: boolean;
    diffView?: "side-by-side" | "unified";
    diffIgnoreWhitespace?: boolean;
    diffIgnoreCase?: boolean;
    timeZone?: string;
    timestampUnit?: "auto" | "seconds" | "milliseconds";
  };
}
```

Discard unknown tool IDs and cap recent entries at five.

- [ ] **Step 4: Write the failing homepage behavior test**

```tsx
it("combines category and search and supports favorites", async () => {
  const user = userEvent.setup();
  renderHome();
  await user.click(screen.getByRole("button", { name: "文本对比" }));
  await user.type(screen.getByRole("searchbox"), "JSON");
  expect(screen.getByRole("link", { name: /文本 \/ JSON Diff/ })).toBeVisible();
  expect(screen.queryByRole("link", { name: /JSON 美化/ })).not.toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "收藏 文本 / JSON Diff" }));
  expect(screen.getByRole("button", { name: "取消收藏 文本 / JSON Diff" })).toBeVisible();
});
```

- [ ] **Step 5: Implement responsive home, favorites, and about pages**

Use a compact heading, primary search box, category chips, three-column/two-column/one-column responsive grid, conditional recent section, empty states, and icon tooltips. Opening a card calls `markRecent` before routing. About explains local processing and how to clear persisted preferences.

- [ ] **Step 6: Run catalog, page, and build verification**

Run:

```bash
npm test -- --run src/features/catalog src/features/preferences src/pages/HomePage.test.tsx
npm run build
```

Expected: all focused tests PASS and build exits 0.

- [ ] **Step 7: Commit the catalog milestone**

```bash
git add src
git commit -m "feat: add extensible tool catalog"
```

---

### Task 3: Implement lossless JSON formatting and the JSON tool page

**Files:**
- Create: `src/features/json/jsonEngine.ts`
- Create: `src/features/json/jsonEngine.test.ts`
- Create: `src/features/json/JsonFormatterPage.tsx`
- Create: `src/features/json/JsonFormatterPage.test.tsx`
- Create: `src/components/ToolPageHeader.tsx`
- Create: `src/components/CodeEditor.tsx`
- Create: `src/utils/files.ts`
- Modify: `src/app/router.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces:

```ts
export type JsonIndent = 2 | 4 | "tab";
export type JsonSuccess = { ok: true; value: string };
export type JsonFailure = { ok: false; message: string; line: number; column: number };
export type JsonResult = JsonSuccess | JsonFailure;

export function formatJson(source: string, indent: JsonIndent, sortKeys: boolean): JsonResult;
export function minifyJson(source: string, sortKeys: boolean): JsonResult;
```

- [ ] **Step 1: Write failing lossless engine tests**

```ts
it("preserves unsafe integer text while formatting and minifying", () => {
  const source = '{"id":9007199254740993,"nested":{"z":1,"a":2}}';
  expect(formatJson(source, 2, true)).toEqual({
    ok: true,
    value: '{\n  "id": 9007199254740993,\n  "nested": {\n    "a": 2,\n    "z": 1\n  }\n}',
  });
  expect(minifyJson(source, false)).toMatchObject({
    ok: true,
    value: '{"id":9007199254740993,"nested":{"z":1,"a":2}}',
  });
});

it("returns line and column for malformed strict JSON", () => {
  expect(formatJson('{\n  "a": 1\n  "b": 2\n}', 2, false)).toMatchObject({
    ok: false,
    line: 3,
  });
});
```

- [ ] **Step 2: Run engine tests and confirm failure**

Run: `npm test -- --run src/features/json/jsonEngine.test.ts`

Expected: FAIL because `jsonEngine.ts` does not exist.

- [ ] **Step 3: Implement the JSON engine**

Use `parseLossless` and `stringify` from `lossless-json`. Recursively sort plain object keys with:

```ts
function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value && typeof value === "object" && !isLosslessNumber(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, child]) => [key, sortJsonValue(child)]),
    );
  }
  return value;
}
```

Convert parser positions to one-based line/column without logging source text.

- [ ] **Step 4: Write failing page interaction tests**

```tsx
it("formats, copies, clears, and keeps the last successful output on error", async () => {
  const user = userEvent.setup();
  renderJsonPage();
  await user.type(screen.getByLabelText("JSON 输入"), '{"id":9007199254740993}');
  await user.click(screen.getByRole("button", { name: "格式化" }));
  expect(screen.getByLabelText("JSON 结果")).toHaveValue(expect.stringContaining("9007199254740993"));
  await user.clear(screen.getByLabelText("JSON 输入"));
  await user.type(screen.getByLabelText("JSON 输入"), '{"id":');
  expect(screen.getByRole("alert")).toHaveTextContent(/第 1 行/);
  expect(screen.getByLabelText("JSON 结果")).toHaveValue(expect.stringContaining("9007199254740993"));
});
```

- [ ] **Step 5: Implement the lazy JSON page**

Add Monaco input/output editors, 250 ms validation debounce, format/minify/sample/import/clear actions, indent selector, sort toggle, copy/download actions, 5 MB import guard, stable status bar, and click-to-focus error location. Never persist editor content.

- [ ] **Step 6: Run JSON tests and build**

Run:

```bash
npm test -- --run src/features/json
npm run build
```

Expected: JSON engine/page tests PASS and build exits 0.

- [ ] **Step 7: Commit the JSON milestone**

```bash
git add src
git commit -m "feat: add lossless JSON formatter"
```

---

### Task 4: Implement text/JSON diff semantics and the Diff tool page

**Files:**
- Create: `src/features/diff/types.ts`
- Create: `src/features/diff/textDiff.ts`
- Create: `src/features/diff/jsonDiff.ts`
- Create: `src/features/diff/diffEngine.test.ts`
- Create: `src/features/diff/DiffPage.tsx`
- Create: `src/features/diff/DiffPage.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces:

```ts
export interface DiffSummary { added: number; removed: number; modified: number }
export interface DiffResult {
  leftDisplay: string;
  rightDisplay: string;
  summary: DiffSummary;
  changes: Array<{ kind: "added" | "removed" | "modified"; path: string }>;
}

export function compareText(
  left: string,
  right: string,
  options: { ignoreWhitespace: boolean; ignoreCase: boolean },
): DiffResult;

export function compareJson(left: string, right: string): DiffResult | JsonFailure;
```

- [ ] **Step 1: Write failing semantic tests**

```ts
it("normalizes whitespace without deleting semantic separators", () => {
  expect(compareText("a   b", " a b ", { ignoreWhitespace: true, ignoreCase: false }).summary)
    .toEqual({ added: 0, removed: 0, modified: 0 });
  expect(compareText("a b", "ab", { ignoreWhitespace: true, ignoreCase: false }).summary.modified)
    .toBe(1);
});

it("ignores object key order, preserves array order, and compares types", () => {
  expect(compareJson('{"a":1,"b":2}', '{"b":2,"a":1}')).toMatchObject({
    summary: { added: 0, removed: 0, modified: 0 },
  });
  expect(compareJson('{"a":[1,2]}', '{"a":[2,1]}')).toMatchObject({
    summary: { modified: 2 },
  });
  expect(compareJson('{"a":"1"}', '{"a":1}')).toMatchObject({
    summary: { modified: 1 },
  });
});
```

- [ ] **Step 2: Run semantic tests and confirm failure**

Run: `npm test -- --run src/features/diff/diffEngine.test.ts`

Expected: FAIL because diff engines do not exist.

- [ ] **Step 3: Implement text and lossless structural JSON diff**

Use jsdiff for line and word changes. For JSON, parse losslessly and recursively compare:

- Object keys: sorted union, order ignored.
- Arrays: compare each index in order.
- Scalars: compare both JSON type and lossless decimal text.
- Missing left/right paths: removed/added.

Return canonical formatted JSON for Monaco display and path-based change records for summary/navigation.

- [ ] **Step 4: Write failing page interaction tests**

```tsx
it("switches modes, swaps sides, and navigates differences", async () => {
  const user = userEvent.setup();
  renderDiffPage();
  await user.type(screen.getByLabelText("A 侧内容"), "one\ntwo");
  await user.type(screen.getByLabelText("B 侧内容"), "one\nthree");
  await user.click(screen.getByRole("button", { name: "开始对比" }));
  expect(screen.getByText(/发现 1 处差异/)).toBeVisible();
  await user.click(screen.getByRole("button", { name: "交换左右" }));
  expect(screen.getByLabelText("A 侧内容")).toHaveValue("one\nthree");
  await user.click(screen.getByRole("button", { name: "下一处差异" }));
  expect(screen.getByText("1 / 1")).toBeVisible();
});
```

- [ ] **Step 5: Implement the Diff page**

Use Monaco DiffEditor for side-by-side display and a unified renderer for narrow screens. Add text/JSON segmented mode, side import, sample, swap, clear, ignore options for text mode only, side-specific JSON errors, summary counts, previous/next navigation, synchronized scrolling, and non-color diff labels.

- [ ] **Step 6: Run Diff tests and build**

Run:

```bash
npm test -- --run src/features/diff
npm run build
```

Expected: Diff engine/page tests PASS and build exits 0.

- [ ] **Step 7: Commit the Diff milestone**

```bash
git add src
git commit -m "feat: add text and JSON diff tool"
```

---

### Task 5: Implement timezone-safe timestamp conversion and the Time tool page

**Files:**
- Create: `src/features/time/timeEngine.ts`
- Create: `src/features/time/timeEngine.test.ts`
- Create: `src/features/time/TimeConverterPage.tsx`
- Create: `src/features/time/TimeConverterPage.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/styles/global.css`

**Interfaces:**
- Produces:

```ts
export type TimestampUnit = "auto" | "seconds" | "milliseconds";
export type TimeFailure = { ok: false; code: "invalid" | "ambiguous" | "nonexistent"; message: string };
export type TimeSuccess = {
  ok: true;
  epochSeconds: string;
  epochMilliseconds: string;
  zoned: string;
  utc: string;
  iso: string;
  relative: string;
};

export function fromTimestamp(value: string, unit: TimestampUnit, zone: string): TimeSuccess | TimeFailure;
export function fromDateTime(value: string, zone: string, overlapOffset?: string): TimeSuccess | TimeFailure;
```

- [ ] **Step 1: Write failing unit, timezone, and DST tests**

```ts
it("auto-detects only 10-digit seconds and 13-digit milliseconds", () => {
  expect(fromTimestamp("1791775608", "auto", "Asia/Shanghai")).toMatchObject({ ok: true });
  expect(fromTimestamp("1791775608123", "auto", "Asia/Shanghai")).toMatchObject({ ok: true });
  expect(fromTimestamp("12345", "auto", "Asia/Shanghai")).toMatchObject({ ok: false, code: "invalid" });
});

it("supports zero, negative values, DST gaps, and DST overlaps", () => {
  expect(fromTimestamp("0", "seconds", "UTC")).toMatchObject({ epochSeconds: "0" });
  expect(fromTimestamp("-1", "seconds", "UTC")).toMatchObject({ epochMilliseconds: "-1000" });
  expect(fromDateTime("2026-03-08 02:30:00.000", "America/Los_Angeles"))
    .toMatchObject({ ok: false, code: "nonexistent" });
  expect(fromDateTime("2026-11-01 01:30:00.000", "America/Los_Angeles"))
    .toMatchObject({ ok: false, code: "ambiguous" });
});
```

- [ ] **Step 2: Run time-engine tests and confirm failure**

Run: `npm test -- --run src/features/time/timeEngine.test.ts`

Expected: FAIL because `timeEngine.ts` does not exist.

- [ ] **Step 3: Implement timezone-safe conversion**

Use Luxon IANA zones. Parse `YYYY-MM-DD HH:mm:ss.SSS` strictly, accept ISO 8601 with an explicit offset, and calculate DST candidates by testing valid offsets around the local wall time. Return `ambiguous` with candidate offsets, `nonexistent` for DST gaps, and never manually add fixed offsets.

- [ ] **Step 4: Write failing page interaction tests**

```tsx
it("converts in both directions and keeps the epoch stable across zone changes", async () => {
  const user = userEvent.setup();
  renderTimePage();
  await user.type(screen.getByLabelText("时间戳"), "0");
  await user.click(screen.getByRole("radio", { name: "秒" }));
  expect(screen.getByLabelText("ISO 8601 结果")).toHaveValue("1970-01-01T00:00:00.000Z");
  await user.selectOptions(screen.getByLabelText("目标时区"), "Asia/Shanghai");
  expect(screen.getByLabelText("秒时间戳结果")).toHaveValue("0");
});
```

- [ ] **Step 5: Implement the Time page**

Add stable-width current-time cells, pause/copy, IANA zone selector, current-time fill, timestamp unit segmented control, both converters, target-zone/UTC/ISO/relative results, per-result copy, negative/zero support, DST gap alert, and overlap candidate selection. Persist only zone and unit.

- [ ] **Step 6: Run Time tests and build**

Run:

```bash
npm test -- --run src/features/time
npm run build
```

Expected: Time engine/page tests PASS and build exits 0.

- [ ] **Step 7: Commit the Time milestone**

```bash
git add src
git commit -m "feat: add timezone timestamp converter"
```

---

### Task 6: Harden responsive behavior, accessibility, and end-to-end flows

**Files:**
- Create: `e2e/home.spec.ts`
- Create: `e2e/json.spec.ts`
- Create: `e2e/diff.spec.ts`
- Create: `e2e/time.spec.ts`
- Create: `e2e/accessibility.spec.ts`
- Create: `src/components/ErrorBoundary.tsx`
- Create: `src/components/ToastRegion.tsx`
- Modify: `src/app/App.tsx`
- Modify: `src/styles/global.css`
- Modify: `README.md`

**Interfaces:**
- Consumes all routes and public UI labels from Tasks 1-5.
- Produces tested desktop/mobile workflows and documented local development commands.

- [ ] **Step 1: Write failing Playwright workflows**

```ts
test("homepage search opens JSON formatter", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("searchbox").fill("大整数");
  await expect(page.getByRole("link", { name: /JSON 美化/ })).toBeVisible();
  await page.getByRole("link", { name: /JSON 美化/ }).click();
  await expect(page).toHaveURL(/tools\/json-formatter/);
});

test("mobile pages have no horizontal document overflow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ["/", "/tools/json-formatter", "/tools/text-json-diff", "/tools/timestamp-converter"]) {
    await page.goto(path);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
});
```

- [ ] **Step 2: Run E2E tests and confirm the new coverage fails where hardening is missing**

Run:

```bash
npx playwright install chromium
npm run build
npm run e2e
```

Expected: at least one workflow or accessibility assertion FAILS before hardening.

- [ ] **Step 3: Add error containment, status feedback, and responsive fixes**

Implement route-level `ErrorBoundary`, aria-live toast feedback for copy/download, 44 px mobile targets, visible `:focus-visible`, reduced-motion overrides, mobile menus, stacked tool panes, horizontal category scrolling, stable dynamic widths, and non-color diff markers.

- [ ] **Step 4: Add axe and keyboard tests**

```ts
test("core routes have no serious accessibility violations", async ({ page }) => {
  for (const path of ["/", "/tools/json-formatter", "/tools/text-json-diff", "/tools/timestamp-converter"]) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations.filter((item) => ["serious", "critical"].includes(item.impact ?? ""))).toEqual([]);
  }
});
```

Add a keyboard-only test that tabs to search, filters, opens a tool, runs its primary action, and reaches copy.

- [ ] **Step 5: Run the full verification suite**

Run:

```bash
npm test -- --run
npm run build
npm run e2e
```

Expected: all unit/component tests PASS, build exits 0, and all Playwright tests PASS on desktop and mobile Chromium.

- [ ] **Step 6: Start the production preview and visually verify**

Run:

```bash
npm run preview -- --host 127.0.0.1
```

Verify at desktop `1440x900` and mobile `390x844`:

- no overlap, clipping, blank editor, or layout shift;
- each tool can complete its primary workflow;
- theme, favorite, recent, and settings persist;
- editor contents do not return after reload.

- [ ] **Step 7: Commit the release hardening**

```bash
git add e2e src README.md playwright.config.ts
git commit -m "test: verify developer tools MVP"
```
