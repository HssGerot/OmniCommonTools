import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  createPreferenceStore,
  STORAGE_KEY,
  type StorageLike,
} from "../preferences/storage";
import TimeConverterPage from "./TimeConverterPage";

function createMemoryStorage(timeZone = "UTC") {
  const values = new Map<string, string>();
  values.set(
    STORAGE_KEY,
    JSON.stringify({
      favorites: [],
      recent: [],
      settings: { timeZone },
      theme: "system",
    }),
  );
  const storage: StorageLike = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  return storage;
}

function renderTimePage(storage = createMemoryStorage()) {
  const preferenceStore = createPreferenceStore(storage);
  return {
    ...render(
      <MemoryRouter>
        <TimeConverterPage preferenceStore={preferenceStore} />
      </MemoryRouter>,
    ),
    storage,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

it("marks the Time tool as recent and renders the shared local context", async () => {
  const { container, storage } = renderTimePage();

  expect(screen.getByRole("link", { name: "返回全部工具" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(screen.getByText("本地处理")).toBeVisible();
  expect(container.querySelector(".tool-page-icon svg")).toBeInTheDocument();
  await waitFor(() => {
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).recent).toEqual([
      expect.objectContaining({ toolId: "timestamp-converter" }),
    ]);
  });
});

it("keeps copy buttons outside labels for other form controls", () => {
  renderTimePage();

  for (const button of screen.getAllByRole("button", { name: /^复制/ })) {
    expect(button.closest("label")).toBeNull();
  }
});

it("converts in both directions and keeps the epoch stable across zone changes", async () => {
  const user = userEvent.setup();
  renderTimePage();

  await user.type(screen.getByLabelText("时间戳"), "0");
  await user.click(screen.getByRole("radio", { name: "秒" }));
  expect(screen.getByLabelText("ISO 8601 结果")).toHaveValue(
    "1970-01-01T00:00:00.000Z",
  );

  await user.selectOptions(screen.getByLabelText("目标时区"), "Asia/Shanghai");
  expect(screen.getByLabelText("秒时间戳结果")).toHaveValue("0");
  expect(screen.getByLabelText("目标时区结果")).toHaveValue(
    "1970-01-01 08:00:00.000 GMT+8",
  );

  await user.type(
    screen.getByLabelText("日期时间"),
    "1970-01-01 08:00:00.000",
  );
  expect(screen.getByLabelText("秒时间戳结果")).toHaveValue("0");
  expect(screen.getByLabelText("毫秒时间戳结果")).toHaveValue("0");
});

it("shows a DST gap alert and lets the user select an overlap candidate", async () => {
  const user = userEvent.setup();
  renderTimePage();

  await user.selectOptions(
    screen.getByLabelText("目标时区"),
    "America/Los_Angeles",
  );
  const dateTime = screen.getByLabelText("日期时间");
  await user.type(dateTime, "2026-03-08 02:30:00.000");
  expect(screen.getByRole("alert")).toHaveTextContent(/夏令时.*不存在/);

  await user.clear(dateTime);
  await user.type(dateTime, "2026-11-01 01:30:00.000");
  expect(screen.getByRole("alert")).toHaveTextContent(/多个有效时区偏移/);
  expect(screen.getByRole("radio", { name: "-07:00" })).toBeVisible();
  expect(screen.getByRole("radio", { name: "-08:00" })).toBeVisible();

  await user.click(screen.getByRole("radio", { name: "-08:00" }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(screen.getByLabelText("ISO 8601 结果")).toHaveValue(
    "2026-11-01T09:30:00.000Z",
  );
});

it("associates conversion errors only with the active input", () => {
  renderTimePage();
  const timestamp = screen.getByLabelText("时间戳");
  const dateTime = screen.getByLabelText("日期时间");

  fireEvent.change(timestamp, { target: { value: "invalid" } });
  expect(timestamp).toHaveAttribute(
    "aria-describedby",
    "time-conversion-error",
  );
  expect(dateTime).toHaveAttribute("aria-describedby", "date-time-hint");

  fireEvent.change(dateTime, { target: { value: "invalid" } });
  expect(timestamp).not.toHaveAttribute("aria-describedby");
  expect(dateTime).toHaveAttribute(
    "aria-describedby",
    "date-time-hint time-conversion-error",
  );
});

it("persists only the selected time zone and timestamp unit, never inputs", async () => {
  const user = userEvent.setup();
  const { storage } = renderTimePage();

  await user.selectOptions(screen.getByLabelText("目标时区"), "Asia/Shanghai");
  await user.click(screen.getByRole("radio", { name: "毫秒" }));
  await user.type(screen.getByLabelText("时间戳"), "1791768645123");
  await user.type(
    screen.getByLabelText("日期时间"),
    "PRIVATE_DATE_TIME_INPUT",
  );

  const persisted = JSON.parse(storage.getItem(STORAGE_KEY)!);
  expect(persisted.settings).toEqual({
    timeZone: "Asia/Shanghai",
    timestampUnit: "milliseconds",
  });
  expect(JSON.stringify(persisted)).not.toContain("1791768645123");
  expect(JSON.stringify(persisted)).not.toContain("PRIVATE_DATE_TIME_INPUT");
});

it("pauses the current clock, copies a current value, and fills the converter", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-12T01:30:45.123Z"));
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  renderTimePage();

  expect(screen.getByLabelText("当前秒时间戳")).toHaveValue("1791768645");
  expect(screen.getByLabelText("当前毫秒时间戳")).toHaveValue("1791768645123");

  fireEvent.click(screen.getByRole("button", { name: "暂停时钟" }));
  vi.advanceTimersByTime(2_000);
  expect(screen.getByLabelText("当前毫秒时间戳")).toHaveValue("1791768645123");

  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "复制当前毫秒时间戳" }));
    await vi.runAllTicks();
  });
  expect(writeText).toHaveBeenCalledWith("1791768645123");

  fireEvent.click(screen.getByRole("button", { name: "填入当前时间戳" }));
  expect(screen.getByLabelText("时间戳")).toHaveValue("1791768645123");
  expect(screen.getByRole("radio", { name: "毫秒" })).toBeChecked();
});
