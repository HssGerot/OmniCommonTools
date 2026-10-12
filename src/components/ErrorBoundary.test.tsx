import { render, screen } from "@testing-library/react";
import {
  createMemoryRouter,
  MemoryRouter,
  RouterProvider,
} from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { ErrorBoundary, RouteErrorBoundary } from "./ErrorBoundary";

function BrokenRoute(): never {
  throw new Error("route exploded");
}

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

it("contains route errors and offers recovery actions", () => {
  render(
    <MemoryRouter>
      <ErrorBoundary>
        <BrokenRoute />
      </ErrorBoundary>
    </MemoryRouter>,
  );

  expect(
    screen.getByRole("heading", { name: "此工具暂时无法显示" }),
  ).toBeVisible();
  expect(screen.getByText("route exploded")).toBeVisible();
  expect(screen.getByRole("link", { name: "返回全部工具" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(screen.getByRole("button", { name: "重新加载" })).toBeVisible();
});

it("renders the recovery UI for data-router errors", async () => {
  const router = createMemoryRouter(
    [
      {
        element: <p>Route content</p>,
        errorElement: <RouteErrorBoundary />,
        loader: () => {
          throw new Error("loader exploded");
        },
        path: "/broken",
      },
    ],
    { initialEntries: ["/broken"] },
  );

  render(<RouterProvider router={router} />);

  expect(
    await screen.findByRole("heading", { name: "此工具暂时无法显示" }),
  ).toBeVisible();
  expect(screen.getByText("loader exploded")).toBeVisible();
});
