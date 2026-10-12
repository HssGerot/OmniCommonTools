import { expect, test, type Page } from "@playwright/test";

async function replaceEditorText(page: Page, value: string) {
  const region = page.getByRole("region", { name: "JSON 输入" });
  const editor = region.getByRole("textbox", {
    name: "JSON 输入",
    exact: true,
  });
  await region.locator(".monaco-editor").click({ position: { x: 120, y: 80 } });
  await expect(editor).toBeFocused();
  await page.keyboard.press("ControlOrMeta+A");
  await page.evaluate((text) => navigator.clipboard.writeText(text), value);
  await page.keyboard.press("ControlOrMeta+V");
}

test.beforeEach(async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/tools/json-formatter");
});

test("formats lossless JSON and announces copy and download", async ({ page }) => {
  await page.getByRole("button", { name: "载入示例" }).click();
  await expect(
    page.getByRole("region", { name: "JSON 输入" }).locator(".view-lines"),
  ).toContainText("9007199254740993");
  await page.getByRole("button", { name: "格式化" }).click();

  const output = page
    .getByRole("region", { name: "JSON 结果" })
    .locator(".view-lines");
  await expect(output).toContainText("9007199254740993");

  await page.getByRole("button", { name: "复制结果" }).click();
  await expect(page.getByRole("status")).toContainText("已复制结果");

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "下载结果" }).click();
  expect((await downloadPromise).suggestedFilename()).toBe("formatted.json");
  await expect(page.getByRole("status")).toContainText("已下载结果");
});

test("reports and focuses the exact malformed JSON location", async ({ page }) => {
  const inputRegion = page.getByRole("region", { name: "JSON 输入" });
  const input = inputRegion.getByRole("textbox", {
    name: "JSON 输入",
    exact: true,
  });
  const sentinel = "__MONACO_SELECTION_SENTINEL__";
  await replaceEditorText(page, "true\nfalse");
  await page.getByRole("button", { name: "格式化" }).click();

  const error = page.locator(".json-error-slot [role=alert]");
  await expect(error).toContainText("第 2 行，第 1 列");
  await page.getByText(/第 2 行，第 1 列/).click();
  await page.getByRole("button", { name: "定位到错误" }).click();
  await expect(input).toBeFocused();
  await page.keyboard.insertText(sentinel);
  await expect(inputRegion.locator(".view-line").nth(1)).toContainText(
    `${sentinel}false`,
  );
  await page.keyboard.press("ControlOrMeta+Z");
  await expect(inputRegion.locator(".view-lines")).not.toContainText(sentinel);
});

test("editor content does not return after reload", async ({ page }) => {
  const input = page.getByRole("region", { name: "JSON 输入" });
  await input.locator(".monaco-editor").click({ position: { x: 120, y: 80 } });
  await expect(
    input.getByRole("textbox", { name: "JSON 输入", exact: true }),
  ).toBeFocused();
  await page.keyboard.insertText('{"PRIVATE_JSON_INPUT":true}');
  await expect(input.locator(".view-lines")).toContainText(
    "PRIVATE_JSON_INPUT",
  );

  await page.reload();
  await expect(
    page.getByRole("region", { name: "JSON 输入" }).locator(".view-lines"),
  ).not.toContainText("PRIVATE_JSON_INPUT");
});

test("long mobile errors stay within the status bar and use ellipsis", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();

  await replaceEditorText(page, "[".repeat(100));
  await page.getByRole("button", { name: "格式化" }).click();

  const error = page.locator(".json-error-slot [role=alert]");
  await expect(error).toContainText("第 1 行，第 101 列");
  const layout = await error.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    return {
      clientWidth: element.clientWidth,
      right: rect.right,
      scrollWidth: element.scrollWidth,
      textOverflow: style.textOverflow,
      whiteSpace: style.whiteSpace,
    };
  });

  expect(layout.textOverflow).toBe("ellipsis");
  expect(layout.whiteSpace).toBe("nowrap");
  expect(layout.scrollWidth).toBeGreaterThan(layout.clientWidth);
  expect(layout.right).toBeLessThanOrEqual(390);

  await page.getByText(/第 1 行，第 101 列/).click();
  await expect(error).toHaveCSS("white-space", "normal");
  await expect(error).toHaveAttribute("title", /.+/);
});
