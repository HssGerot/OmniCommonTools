import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
});

test("homepage search opens JSON formatter", async ({ page }) => {
  await page.getByRole("searchbox").fill("大整数");
  await expect(page.getByRole("link", { name: /JSON 美化/ })).toBeVisible();
  await page.getByRole("link", { name: /JSON 美化/ }).click();
  await expect(page).toHaveURL(/tools\/json-formatter/);
});

test("favorites, recent tools, theme, and settings persist", async ({ page }) => {
  await page.getByRole("button", { name: "收藏 JSON 美化" }).click();
  await page.getByRole("button", { name: /切换主题/ }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("link", { name: /JSON 美化/ }).click();
  await page.getByRole("checkbox", { name: "排序对象键" }).check();
  await page.getByRole("link", { name: "返回全部工具" }).click();
  await page.reload();

  await expect(
    page.getByRole("button", { name: "取消收藏 JSON 美化" }).first(),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "最近使用" })).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("link", { name: /JSON 美化/ }).first().click();
  await expect(page.getByRole("checkbox", { name: "排序对象键" })).toBeChecked();
});

test("persisted and system theme changes update Monaco editors", async ({
  page,
}) => {
  await page.evaluate(() => {
    localStorage.setItem(
      "omni-common-tools.preferences",
      JSON.stringify({
        favorites: [],
        recent: [],
        settings: {},
        theme: "dark",
      }),
    );
  });
  await page.goto("/tools/json-formatter");
  await expect(page.locator(".monaco-editor").first()).toHaveClass(/vs-dark/);

  await page.evaluate(() => {
    localStorage.setItem(
      "omni-common-tools.preferences",
      JSON.stringify({
        favorites: [],
        recent: [],
        settings: {},
        theme: "system",
      }),
    );
  });
  await page.emulateMedia({ colorScheme: "light" });
  await page.reload();
  await expect(page.locator(".monaco-editor").first()).toHaveClass(/vs/);
  await expect(page.locator(".monaco-editor").first()).not.toHaveClass(/vs-dark/);

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator(".monaco-editor").first()).toHaveClass(/vs-dark/);

  await page.goto("/tools/text-json-diff");
  await page.getByRole("button", { name: "双栏视图" }).click();
  await page.getByRole("button", { name: "载入示例" }).click();
  await page.getByRole("button", { name: "开始对比" }).click();
  await expect(page.locator(".diff-result .monaco-editor.vs-dark")).toHaveCount(
    2,
  );
});

test("mobile navigation opens from a compact menu", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  const menu = page.getByRole("button", { name: "打开主导航" });
  await expect(menu).toBeVisible();
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeHidden();

  await menu.click();
  await expect(page.getByRole("navigation", { name: "主导航" })).toBeVisible();
  await page.getByRole("link", { name: "收藏", exact: true }).click();
  await expect(page).toHaveURL(/favorites/);
});

test("unknown routes use the route recovery boundary", async ({ page }) => {
  await page.goto("/missing-tool");

  await expect(
    page.getByRole("heading", { name: "此工具暂时无法显示" }),
  ).toBeVisible();
  await expect(page.getByText("未找到请求的页面。")).toBeVisible();
  await expect(page.getByRole("link", { name: "返回全部工具" })).toHaveAttribute(
    "href",
    "/",
  );
});
