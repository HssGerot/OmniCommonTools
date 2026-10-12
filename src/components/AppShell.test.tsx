import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import {
  createPreferenceStore,
  STORAGE_KEY,
  type StorageLike,
} from "../features/preferences/storage";
import { AppShell } from "./AppShell";

function createMemoryStorage() {
  const values = new Map<string, string>();
  const storage: StorageLike = {
    getItem: (key) => values.get(key) ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
  return storage;
}

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

it("opens the mobile navigation from an accessible menu button", async () => {
  const user = userEvent.setup();
  render(
    <MemoryRouter>
      <AppShell>
        <main>Page body</main>
      </AppShell>
    </MemoryRouter>,
  );

  const menu = screen.getByRole("button", { name: "打开主导航" });
  const navigation = screen.getByRole("navigation", { name: "主导航" });
  expect(menu).toHaveAttribute("aria-expanded", "false");
  expect(navigation).toHaveAttribute("data-open", "false");

  await user.click(menu);

  expect(
    screen.getByRole("button", { name: "关闭主导航" }),
  ).toHaveAttribute("aria-expanded", "true");
  expect(navigation).toHaveAttribute("data-open", "true");
});

it("persists and applies theme changes", async () => {
  const user = userEvent.setup();
  const storage = createMemoryStorage();
  const preferenceStore = createPreferenceStore(storage);
  render(
    <MemoryRouter>
      <AppShell preferenceStore={preferenceStore}>
        <main>Page body</main>
      </AppShell>
    </MemoryRouter>,
  );

  await user.click(screen.getByRole("button", { name: /切换主题/ }));

  expect(document.documentElement.dataset.theme).toBe("dark");
  expect(JSON.parse(storage.getItem(STORAGE_KEY)!).theme).toBe("dark");
});
