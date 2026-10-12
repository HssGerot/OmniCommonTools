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
