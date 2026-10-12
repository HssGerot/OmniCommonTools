import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach } from "vitest";
import { HomePage } from "./HomePage";

function renderHome() {
  return render(
    <MemoryRouter>
      <HomePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

it("describes the toolbox with search-focused homepage copy", () => {
  renderHome();

  expect(
    screen.getByRole("heading", { name: "开发者在线工具箱" }),
  ).toBeVisible();
  expect(
    screen.getByText(
      "提供 JSON 格式化与校验、文本和 JSON 差异对比、Unix 时间戳转换、信息编解码等常用开发工具。所有输入均在浏览器本地处理。",
    ),
  ).toBeVisible();
});

it("combines category and search and supports favorites", async () => {
  const user = userEvent.setup();
  renderHome();

  await user.click(screen.getByRole("button", { name: "文本对比" }));
  await user.type(screen.getByRole("searchbox"), "JSON");

  expect(
    screen.getByRole("link", { name: /文本 \/ JSON Diff/ }),
  ).toBeVisible();
  expect(
    screen.queryByRole("link", { name: /JSON 美化/ }),
  ).not.toBeInTheDocument();

  await user.click(
    screen.getByRole("button", { name: "收藏 文本 / JSON Diff" }),
  );

  expect(
    screen.getByRole("button", { name: "取消收藏 文本 / JSON Diff" }),
  ).toBeVisible();
});

it("clears search and category filters from the empty state", async () => {
  const user = userEvent.setup();
  renderHome();

  await user.click(screen.getByRole("button", { name: "文本对比" }));
  await user.type(screen.getByRole("searchbox"), "毫秒");

  expect(screen.getByText("没有匹配的工具")).toBeVisible();

  await user.click(screen.getByRole("button", { name: "清除筛选" }));

  expect(screen.getByRole("searchbox")).toHaveValue("");
  expect(screen.getByRole("button", { name: "全部" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(screen.getByRole("link", { name: /JSON 美化/ })).toBeVisible();
  expect(
    screen.getByRole("link", { name: /文本 \/ JSON Diff/ }),
  ).toBeVisible();
  expect(screen.getByRole("link", { name: /时间戳转换/ })).toBeVisible();
  expect(screen.getByRole("link", { name: /信息编解码/ })).toBeVisible();
});
