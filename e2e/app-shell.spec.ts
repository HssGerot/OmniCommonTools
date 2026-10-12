import { expect, test } from "@playwright/test";

test("renders the application shell on the home page", async ({ page }) => {
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("link", { name: "Toolbox" })).toBeVisible();

  const navigation = page.getByRole("navigation", { name: "主导航" });
  await expect(navigation.getByRole("link", { name: "全部工具" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "收藏" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "关于" })).toBeVisible();
});
