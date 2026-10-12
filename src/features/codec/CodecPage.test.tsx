import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  createPreferenceStore,
  STORAGE_KEY,
  type StorageLike,
} from "../preferences/storage";
import CodecPage from "./CodecPage";

vi.mock("../../components/CodeEditor", () => ({
  CodeEditor({
    label,
    onChange,
    readOnly,
    value,
  }: {
    label: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
    value: string;
  }) {
    return (
      <textarea
        aria-label={label}
        onChange={(event) => onChange?.(event.target.value)}
        readOnly={readOnly}
        value={value}
      />
    );
  },
}));

function createMemoryStorage() {
  const values = new Map<string, string>();
  const storage: StorageLike = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  return storage;
}

function renderCodecPage(storage = createMemoryStorage()) {
  const preferenceStore = createPreferenceStore(storage);
  return {
    ...render(
      <MemoryRouter>
        <CodecPage preferenceStore={preferenceStore} />
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

it("marks the codec tool as recent and renders no AI decoding placeholder", async () => {
  const { storage } = renderCodecPage();

  expect(screen.getByRole("heading", { name: "信息编解码" })).toBeVisible();
  expect(screen.getByText("本地处理")).toBeVisible();
  expect(screen.queryByText(/AI|智能解码/)).not.toBeInTheDocument();
  await waitFor(() => {
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).recent).toEqual([
      expect.objectContaining({ toolId: "codec" }),
    ]);
  });
});

it("converts with the selected method, copies the result, and clears both panes", async () => {
  const user = userEvent.setup();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  renderCodecPage();

  await user.click(screen.getByRole("button", { name: "Base64 编码" }));
  fireEvent.change(screen.getByLabelText("待处理内容"), {
    target: { value: "中文" },
  });
  await user.click(screen.getByRole("button", { name: "转换" }));

  expect(screen.getByLabelText("处理结果")).toHaveValue("5Lit5paH");

  await user.click(screen.getByRole("button", { name: "复制结果" }));
  expect(writeText).toHaveBeenCalledWith("5Lit5paH");

  await user.click(screen.getByRole("button", { name: "清空" }));
  expect(screen.getByLabelText("待处理内容")).toHaveValue("");
  expect(screen.getByLabelText("处理结果")).toHaveValue("");
});

it("automatically converts after input changes and keeps method buttons compact", async () => {
  const user = userEvent.setup();
  renderCodecPage();

  await user.click(screen.getByRole("button", { name: "Base64 编码" }));
  fireEvent.change(screen.getByLabelText("待处理内容"), {
    target: { value: "中文" },
  });

  await waitFor(() => {
    expect(screen.getByLabelText("处理结果")).toHaveValue("5Lit5paH");
  });
  expect(screen.queryByText("使用 UTF-8 字节进行 Base64 编码。")).not.toBeInTheDocument();
});

it("reports decoding errors without overwriting the previous successful result", async () => {
  const user = userEvent.setup();
  renderCodecPage();

  await user.click(screen.getByRole("button", { name: "URL 编码" }));
  fireEvent.change(screen.getByLabelText("待处理内容"), {
    target: { value: "a b" },
  });
  await user.click(screen.getByRole("button", { name: "转换" }));
  expect(screen.getByLabelText("处理结果")).toHaveValue("a%20b");

  await user.click(screen.getByRole("button", { name: "Base64 解码" }));
  fireEvent.change(screen.getByLabelText("待处理内容"), {
    target: { value: "%%%" },
  });
  await user.click(screen.getByRole("button", { name: "转换" }));

  expect(screen.getByRole("alert")).toHaveTextContent(/Base64/);
  expect(screen.getByLabelText("处理结果")).toHaveValue("a%20b");
});
