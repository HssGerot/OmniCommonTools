import { expect, test } from "@playwright/test";

test("uses an explicit fixed viewport project", async ({ page }, testInfo) => {
  const expectedViewports = {
    desktop: { height: 900, width: 1440 },
    mobile: { height: 844, width: 390 },
  } as const;

  expect(testInfo.project.name).toMatch(/^(desktop|mobile)$/);
  expect(page.viewportSize()).toEqual(
    expectedViewports[testInfo.project.name as keyof typeof expectedViewports],
  );
});

test("renders the desktop application shell on the home page", async (
  { page },
  testInfo,
) => {
  test.skip(testInfo.project.name === "mobile", "Desktop navigation is collapsed");
  const response = await page.goto("/");

  expect(response?.ok()).toBe(true);
  await expect(page.getByRole("link", { name: "Toolbox" })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "打开主导航" }),
  ).toBeHidden();

  const navigation = page.getByRole("navigation", { name: "主导航" });
  await expect(navigation.getByRole("link", { name: "全部工具" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "收藏" })).toBeVisible();
  await expect(navigation.getByRole("link", { name: "关于" })).toBeVisible();
});
