import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { forwardRef, useImperativeHandle, useRef } from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import {
  createPreferenceStore,
  STORAGE_KEY,
  type StorageLike,
} from "../preferences/storage";
import JsonFormatterPage from "./JsonFormatterPage";

vi.mock("../../components/CodeEditor", () => ({
  CodeEditor: forwardRef(function CodeEditor(
    {
      label,
      onChange,
      readOnly,
      value,
    }: {
      label: string;
      onChange?: (value: string) => void;
      readOnly?: boolean;
      value: string;
    },
    ref,
  ) {
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    useImperativeHandle(ref, () => ({
      focusPosition: () => textareaRef.current?.focus(),
    }));

    return (
      <textarea
        ref={textareaRef}
        aria-label={label}
        onChange={(event) => onChange?.(event.target.value)}
        readOnly={readOnly}
        value={value}
      />
    );
  }),
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

function renderJsonPage(storage = createMemoryStorage()) {
  const preferenceStore = createPreferenceStore(storage);
  return {
    ...render(<JsonFormatterPage preferenceStore={preferenceStore} />),
    storage,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  vi.useRealTimers();
});

it("formats, copies, clears, and keeps the last successful output on error", async () => {
  const user = userEvent.setup();
  const writeText = vi.fn().mockResolvedValue(undefined);
  Object.defineProperty(navigator, "clipboard", {
    configurable: true,
    value: { writeText },
  });
  renderJsonPage();

  const input = screen.getByLabelText("JSON 输入");
  fireEvent.change(input, { target: { value: '{"id":9007199254740993}' } });
  await user.click(screen.getByRole("button", { name: "格式化" }));

  const output = screen.getByLabelText("JSON 结果");
  expect((output as HTMLTextAreaElement).value).toContain("9007199254740993");

  await user.click(screen.getByRole("button", { name: "复制结果" }));
  expect(writeText).toHaveBeenCalledWith(expect.stringContaining("9007199254740993"));

  await user.clear(input);
  fireEvent.change(input, { target: { value: '{"id":' } });

  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent(/第 1 行/);
  expect((output as HTMLTextAreaElement).value).toContain("9007199254740993");

  await user.click(alert);
  expect(input).toHaveFocus();

  await user.click(screen.getByRole("button", { name: "清空" }));
  expect(input).toHaveValue("");
  expect(output).toHaveValue("");
});

it("minifies, loads a sample, downloads locally, and saves only preferences", async () => {
  const user = userEvent.setup();
  const { storage } = renderJsonPage();
  const createObjectURL = vi.fn(() => "blob:json-result");
  const revokeObjectURL = vi.fn();
  Object.defineProperties(URL, {
    createObjectURL: { configurable: true, value: createObjectURL },
    revokeObjectURL: { configurable: true, value: revokeObjectURL },
  });
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => undefined);

  await user.selectOptions(screen.getByLabelText("缩进"), "4");
  await user.click(screen.getByRole("checkbox", { name: "排序对象键" }));
  await user.click(screen.getByRole("button", { name: "载入示例" }));
  await user.click(screen.getByRole("button", { name: "压缩" }));

  const outputValue = (screen.getByLabelText("JSON 结果") as HTMLTextAreaElement)
    .value;
  expect(outputValue).not.toContain("\n");

  await user.click(screen.getByRole("button", { name: "下载结果" }));
  expect(createObjectURL).toHaveBeenCalledOnce();
  expect(revokeObjectURL).toHaveBeenCalledWith("blob:json-result");

  const persisted = JSON.parse(storage.getItem(STORAGE_KEY)!);
  expect(persisted.settings).toEqual({
    jsonIndent: 4,
    jsonSortKeys: true,
  });
  expect(JSON.stringify(persisted)).not.toContain(outputValue);
  expect(JSON.stringify(persisted)).not.toContain('"example"');
});

it("imports one JSON file and rejects files larger than 5 MB", async () => {
  const user = userEvent.setup();
  renderJsonPage();
  const fileInput = screen.getByLabelText("导入 JSON 文件");

  await user.upload(
    fileInput,
    new File(['{"imported":9007199254740993}'], "data.json", {
      type: "application/json",
    }),
  );
  expect(screen.getByLabelText("JSON 输入")).toHaveValue(
    '{"imported":9007199254740993}',
  );

  const oversized = new File(["x"], "large.json", {
    type: "application/json",
  });
  Object.defineProperty(oversized, "size", { value: 5 * 1024 * 1024 + 1 });
  await user.upload(fileInput, oversized);

  expect(screen.getByRole("alert")).toHaveTextContent(/5 MB/);
  expect(screen.getByLabelText("JSON 输入")).toHaveValue(
    '{"imported":9007199254740993}',
  );
});
