import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { AppShell } from "./AppShell";

it("renders primary navigation and page content", () => {
  render(
    <MemoryRouter>
      <AppShell>
        <main>Page body</main>
      </AppShell>
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "全部工具" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(screen.getByRole("link", { name: "收藏" })).toHaveAttribute(
    "href",
    "/favorites",
  );
  expect(screen.getByText("Page body")).toBeInTheDocument();
});
