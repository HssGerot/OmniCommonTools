import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "@playwright/test";

const CORE_ROUTES = [
  "/",
  "/tools/json-formatter",
  "/tools/text-json-diff",
  "/tools/timestamp-converter",
];

async function tabTo(page: Page, target: Locator, maximumTabs = 80) {
  for (let index = 0; index < maximumTabs; index += 1) {
    await page.keyboard.press("Tab");
    if (await target.evaluate((element) => element === document.activeElement)) {
      return;
    }
  }
  throw new Error(`Keyboard focus did not reach ${await target.getAttribute("aria-label")}`);
}

test("core routes have no serious accessibility violations", async ({ page }) => {
  for (const path of CORE_ROUTES) {
    await page.goto(path);
    const results = await new AxeBuilder({ page }).analyze();
    expect(
      results.violations.filter((item) =>
        ["serious", "critical"].includes(item.impact ?? ""),
      ),
      `${path}: ${results.violations.map((item) => item.id).join(", ")}`,
    ).toEqual([]);
  }
});

test("keyboard-only flow filters, opens, runs, and copies JSON", async ({
  context,
  page,
}) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/");

  const search = page.getByRole("searchbox");
  await tabTo(page, search);
  await page.keyboard.insertText("大整数");

  const formatCategory = page.getByRole("button", { name: "格式化" });
  await tabTo(page, formatCategory);
  await page.keyboard.press("Enter");

  const jsonLink = page.getByRole("link", { name: /JSON 美化/ });
  await tabTo(page, jsonLink);
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/tools\/json-formatter/);

  const sample = page.getByRole("button", { name: "载入示例" });
  await tabTo(page, sample);
  await page.keyboard.press("Enter");

  const format = page.getByRole("button", { name: "格式化" });
  await tabTo(page, format);
  await page.keyboard.press("Enter");

  const copy = page.getByRole("button", { name: "复制结果" });
  await tabTo(page, copy);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toContainText("已复制结果");
});

test("mobile pages have no horizontal document overflow and use touch targets", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const path of CORE_ROUTES) {
    await page.goto(path);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      path,
    ).toBe(true);

    const undersized = await page.locator("button, a, select, .file-button").evaluateAll(
      (elements) =>
        elements
          .filter((element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0;
          })
          .map((element) => {
            const rect = element.getBoundingClientRect();
            return {
              height: rect.height,
              name:
                element.getAttribute("aria-label") ??
                element.textContent?.trim() ??
                element.tagName,
              width: rect.width,
            };
          })
          .filter(({ height, width }) => height < 44 || width < 44),
    );
    expect(undersized, path).toEqual([]);
  }
});

test("focus is visible and reduced motion shortens transitions", async ({
  page,
}) => {
  await page.goto("/");
  const search = page.getByRole("searchbox");
  await tabTo(page, search);
  const focusStyle = await search.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      style: style.outlineStyle,
      width: Number.parseFloat(style.outlineWidth),
    };
  });
  expect(focusStyle.style).not.toBe("none");
  expect(focusStyle.width).toBeGreaterThanOrEqual(2);

  await page.emulateMedia({ reducedMotion: "reduce" });
  const duration = await page.evaluate(() => {
    const probe = document.createElement("div");
    probe.style.transitionDuration = "2s";
    document.body.append(probe);
    const value = getComputedStyle(probe).transitionDuration;
    probe.remove();
    return value;
  });
  expect(Number.parseFloat(duration)).toBeLessThanOrEqual(0.001);
});

test("core routes emit no console or uncaught page errors", async ({ page }) => {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  for (const path of CORE_ROUTES) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }

  expect(errors).toEqual([]);
});
