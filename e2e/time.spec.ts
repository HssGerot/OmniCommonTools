import { expect, test } from "@playwright/test";

test.beforeEach(async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/tools/timestamp-converter");
});

test("converts epoch zero across time zones and announces copy", async ({
  page,
}) => {
  await page.getByLabel("时间戳", { exact: true }).fill("0");
  await page.getByRole("radio", { name: "秒", exact: true }).check();
  await expect(page.getByLabel("ISO 8601 结果")).toHaveValue(
    "1970-01-01T00:00:00.000Z",
  );

  await page.getByLabel("目标时区", { exact: true }).selectOption("Asia/Shanghai");
  await expect(page.getByLabel("秒时间戳结果")).toHaveValue("0");
  await expect(page.getByLabel("目标时区结果")).toHaveValue(
    "1970-01-01 08:00:00.000 GMT+8",
  );

  await page.getByRole("button", { name: "复制ISO 8601 结果" }).click();
  await expect(page.getByRole("status")).toContainText("已复制ISO 8601 结果");
});

test("time preferences persist but converter inputs do not", async ({ page }) => {
  await page.getByLabel("目标时区", { exact: true }).selectOption("Asia/Shanghai");
  await page.getByRole("radio", { name: "毫秒" }).check();
  await page.getByLabel("时间戳", { exact: true }).fill("1791768645123");
  await page.getByLabel("日期时间", { exact: true }).fill(
    "2026-10-12 09:30:45.123",
  );

  await page.reload();
  await expect(page.getByLabel("目标时区", { exact: true })).toHaveValue(
    "Asia/Shanghai",
  );
  await expect(page.getByRole("radio", { name: "毫秒" })).toBeChecked();
  await expect(page.getByLabel("时间戳", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("日期时间", { exact: true })).toHaveValue("");
});
