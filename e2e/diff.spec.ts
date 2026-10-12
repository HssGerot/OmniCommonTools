import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.goto("/tools/text-json-diff");
});

test("compares text in a unified view with non-color markers", async ({
  page,
}) => {
  await page.getByRole("button", { name: "载入示例" }).click();
  await page.getByRole("button", { name: "统一视图" }).click();
  await page.getByRole("button", { name: "开始对比" }).click();

  await expect(page.getByText(/发现 \d+ 处差异/)).toBeVisible();
  const result = page.getByRole("region", { name: "统一差异结果" });
  await expect(result.getByLabel("差异标记说明")).toContainText("− 删除");
  await expect(result.getByLabel("差异标记说明")).toContainText("+ 新增");
  await expect(
    result.locator(".diff-line-marker", { hasText: "−" }).first(),
  ).toBeVisible();
  await expect(
    result.locator(".diff-line-marker", { hasText: "+" }).first(),
  ).toBeVisible();
});

test("view preference persists but compared input does not", async ({ page }) => {
  await page.getByRole("button", { name: "统一视图" }).click();
  const left = page.getByRole("region", { name: "A 侧内容" });
  await left.locator(".monaco-editor").click({
    position: { x: 120, y: 80 },
  });
  await page.keyboard.insertText("PRIVATE_DIFF_INPUT");
  await expect(left.locator(".view-lines")).toContainText(
    "PRIVATE_DIFF_INPUT",
  );

  await page.reload();
  await expect(page.getByRole("button", { name: "统一视图" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(
    page.getByRole("region", { name: "A 侧内容" }).locator(".view-lines"),
  ).not.toContainText("PRIVATE_DIFF_INPUT");
});
