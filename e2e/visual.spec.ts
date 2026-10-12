import { mkdir } from "node:fs/promises";
import { expect, test, type Locator } from "@playwright/test";

const SCREENSHOT_DIR = ".superpowers/sdd/visual-task6";

test("captures verified primary flows at the configured viewport", async ({
  page,
}, testInfo) => {
  await mkdir(SCREENSHOT_DIR, { recursive: true });
  const screenshot = async (name: string, mobileTarget?: Locator) => {
    await page.evaluate(() => window.scrollTo(0, 0));
    if (testInfo.project.name === "mobile" && mobileTarget) {
      await mobileTarget.evaluate((element) =>
        element.scrollIntoView({ block: "start" }),
      );
      const visibleHeight = await mobileTarget.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return Math.max(
          0,
          Math.min(rect.bottom, window.innerHeight) - Math.max(rect.top, 0),
        );
      });
      const targetHeight = await mobileTarget.evaluate(
        (element) => element.getBoundingClientRect().height,
      );
      expect(visibleHeight).toBeGreaterThanOrEqual(Math.min(200, targetHeight));
    }
    return page.screenshot({
      path: `${SCREENSHOT_DIR}/${testInfo.project.name}-${name}.png`,
    });
  };

  await page.goto("/");
  await page.getByRole("searchbox").fill("大整数");
  await expect(page.getByRole("link", { name: /JSON 美化/ })).toBeVisible();
  await screenshot("home");

  await page.getByRole("link", { name: /JSON 美化/ }).click();
  await page.getByRole("button", { name: "载入示例" }).click();
  await page.getByRole("button", { name: "格式化" }).click();
  await expect(
    page.getByRole("region", { name: "JSON 结果" }).locator(".view-lines"),
  ).toContainText("9007199254740993");
  await screenshot("json", page.locator(".json-output-pane"));

  await page.goto("/tools/text-json-diff");
  await page.getByRole("button", { name: "载入示例" }).click();
  await page.getByRole("button", { name: "统一视图" }).click();
  await page.getByRole("button", { name: "开始对比" }).click();
  await expect(page.getByText(/发现 \d+ 处差异/)).toBeVisible();
  await screenshot("diff", page.locator(".diff-result"));

  await page.goto("/tools/timestamp-converter");
  await page.getByLabel("时间戳", { exact: true }).fill("0");
  const seconds = page.getByRole("radio", { name: "秒", exact: true });
  await seconds.focus();
  await page.keyboard.press("Space");
  await expect(
    page.getByRole("textbox", { name: "ISO 8601 结果", exact: true }),
  ).toHaveValue("1970-01-01T00:00:00.000Z");
  await screenshot("time", page.locator(".time-results"));
});
