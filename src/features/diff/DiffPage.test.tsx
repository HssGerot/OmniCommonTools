import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import {
  createPreferenceStore,
  STORAGE_KEY,
  type StorageLike,
} from "../preferences/storage";
import DiffPage from "./DiffPage";

const monaco = vi.hoisted(() => {
  const originalEditor = {
    revealLineInCenter: vi.fn(),
    setPosition: vi.fn(),
  };
  const modifiedEditor = {
    revealLineInCenter: vi.fn(),
    setPosition: vi.fn(),
  };

  return {
    modifiedEditor,
    originalEditor,
    props: vi.fn(),
    instance: {
      getModifiedEditor: () => modifiedEditor,
      getOriginalEditor: () => originalEditor,
    },
  };
});

vi.mock("../../components/CodeEditor", () => ({
  CodeEditor: ({
    label,
    onChange,
    readOnly,
    value,
  }: {
    label: string;
    onChange?: (value: string) => void;
    readOnly?: boolean;
    value: string;
  }) => (
    <textarea
      aria-label={label}
      onChange={(event) => onChange?.(event.target.value)}
      readOnly={readOnly}
      value={value}
    />
  ),
}));

vi.mock("@monaco-editor/react", () => ({
  DiffEditor: ({
    modified,
    onMount,
    options,
    original,
  }: ComponentProps<"div"> & {
    modified: string;
    onMount?: (instance: typeof monaco.instance) => void;
    options?: Record<string, unknown>;
    original: string;
  }) => {
    monaco.props({ modified, options, original });
    onMount?.(monaco.instance);
    return (
      <div aria-label="并排差异结果">
        <pre>{original}</pre>
        <pre>{modified}</pre>
      </div>
    );
  },
}));

function createMemoryStorage(initial?: Record<string, string>) {
  const values = new Map(Object.entries(initial ?? {}));
  const storage: StorageLike = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
  return storage;
}

function renderDiffPage(storage = createMemoryStorage()) {
  const preferenceStore = createPreferenceStore(storage);
  return {
    ...render(
      <MemoryRouter>
        <DiffPage preferenceStore={preferenceStore} />
      </MemoryRouter>,
    ),
    storage,
  };
}

beforeEach(() => {
  vi.restoreAllMocks();
  monaco.modifiedEditor.revealLineInCenter.mockClear();
  monaco.modifiedEditor.setPosition.mockClear();
  monaco.originalEditor.revealLineInCenter.mockClear();
  monaco.originalEditor.setPosition.mockClear();
  monaco.props.mockClear();
  Object.defineProperty(HTMLElement.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockReturnValue({
      addEventListener: vi.fn(),
      matches: false,
      removeEventListener: vi.fn(),
    }),
  });
});

it("marks Diff as recent and renders the shared tool context", async () => {
  const { container, storage } = renderDiffPage();

  expect(screen.getByRole("link", { name: "返回全部工具" })).toHaveAttribute(
    "href",
    "/",
  );
  expect(screen.getByText("本地处理")).toBeVisible();
  expect(container.querySelector(".tool-page-icon svg")).toBeInTheDocument();
  await waitFor(() => {
    expect(JSON.parse(storage.getItem(STORAGE_KEY)!).recent).toEqual([
      expect.objectContaining({ toolId: "text-json-diff" }),
    ]);
  });
});

it("switches modes, swaps sides, and cycles through differences", async () => {
  const user = userEvent.setup();
  renderDiffPage();
  const left = screen.getByLabelText("A 侧内容");
  const right = screen.getByLabelText("B 侧内容");

  fireEvent.change(left, { target: { value: "one\ntwo" } });
  fireEvent.change(right, { target: { value: "one\nthree" } });
  await user.click(screen.getByRole("button", { name: "开始对比" }));

  expect(screen.getByText(/发现 1 处差异/)).toBeVisible();
  expect(screen.getByText("1 / 1")).toBeVisible();
  await user.click(screen.getByRole("button", { name: "交换左右" }));
  expect(left).toHaveValue("one\nthree");
  expect(right).toHaveValue("one\ntwo");

  await user.click(screen.getByRole("button", { name: "上一处差异" }));
  await user.click(screen.getByRole("button", { name: "下一处差异" }));
  expect(screen.getByText("1 / 1")).toBeVisible();

  await user.click(screen.getByRole("button", { name: "JSON 模式" }));
  expect(screen.queryByRole("checkbox", { name: "忽略空白" })).not.toBeInTheDocument();
});

it("uses the real JSON engine and identifies A and B syntax errors", async () => {
  const user = userEvent.setup();
  renderDiffPage();
  await user.click(screen.getByRole("button", { name: "JSON 模式" }));

  fireEvent.change(screen.getByLabelText("A 侧内容"), {
    target: { value: '{\n  "value": 1,\n}' },
  });
  fireEvent.change(screen.getByLabelText("B 侧内容"), {
    target: { value: '{"value":1}' },
  });
  await user.click(screen.getByRole("button", { name: "开始对比" }));
  expect(screen.getByRole("alert")).toHaveTextContent(/A 侧.*第 3 行/);

  fireEvent.change(screen.getByLabelText("A 侧内容"), {
    target: { value: '{"value":1}' },
  });
  fireEvent.change(screen.getByLabelText("B 侧内容"), {
    target: { value: '{\n"value": "1"\n}' },
  });
  await user.click(screen.getByRole("button", { name: "开始对比" }));
  expect(screen.getByText(/发现 1 处差异/)).toBeVisible();
  expect(screen.getByText(/修改 1/)).toBeVisible();
});

it("persists only view and ignore preferences, never inputs or results", async () => {
  const user = userEvent.setup();
  const { storage } = renderDiffPage();

  await user.click(screen.getByRole("checkbox", { name: "忽略空白" }));
  await user.click(screen.getByRole("checkbox", { name: "忽略大小写" }));
  await user.click(screen.getByRole("button", { name: "统一视图" }));
  fireEvent.change(screen.getByLabelText("A 侧内容"), {
    target: { value: "PRIVATE_LEFT" },
  });
  fireEvent.change(screen.getByLabelText("B 侧内容"), {
    target: { value: "PRIVATE_RIGHT" },
  });
  await user.click(screen.getByRole("button", { name: "开始对比" }));

  const persisted = JSON.parse(storage.getItem(STORAGE_KEY)!);
  expect(persisted.settings).toEqual({
    diffIgnoreCase: true,
    diffIgnoreWhitespace: true,
    diffView: "unified",
  });
  expect(JSON.stringify(persisted)).not.toContain("PRIVATE");
});

it("imports each side, rejects files over 5 MB, loads a sample, and clears", async () => {
  const user = userEvent.setup();
  renderDiffPage();

  await user.upload(
    screen.getByLabelText("导入 A 侧文件"),
    new File(["left file"], "left.txt", { type: "text/plain" }),
  );
  await user.upload(
    screen.getByLabelText("导入 B 侧文件"),
    new File(["right file"], "right.txt", { type: "text/plain" }),
  );
  expect(screen.getByLabelText("A 侧内容")).toHaveValue("left file");
  expect(screen.getByLabelText("B 侧内容")).toHaveValue("right file");

  const oversized = new File(["x"], "large.txt", { type: "text/plain" });
  Object.defineProperty(oversized, "size", { value: 5 * 1024 * 1024 + 1 });
  await user.upload(screen.getByLabelText("导入 B 侧文件"), oversized);
  expect(screen.getByRole("alert")).toHaveTextContent(/B 侧.*5 MB/);
  expect(screen.getByLabelText("B 侧内容")).toHaveValue("right file");

  await user.click(screen.getByRole("button", { name: "载入示例" }));
  expect(screen.getByLabelText("A 侧内容")).not.toHaveValue("");
  expect(screen.getByLabelText("B 侧内容")).not.toHaveValue("");
  await user.click(screen.getByRole("button", { name: "清空" }));
  expect(screen.getByLabelText("A 侧内容")).toHaveValue("");
  expect(screen.getByLabelText("B 侧内容")).toHaveValue("");
});

it("defaults narrow screens to an accessible unified result with text markers", async () => {
  const user = userEvent.setup();
  vi.mocked(window.matchMedia).mockReturnValue({
    addEventListener: vi.fn(),
    matches: true,
    removeEventListener: vi.fn(),
  } as unknown as MediaQueryList);
  renderDiffPage();

  expect(screen.getByRole("button", { name: "统一视图" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  fireEvent.change(screen.getByLabelText("A 侧内容"), {
    target: { value: "same\nold" },
  });
  fireEvent.change(screen.getByLabelText("B 侧内容"), {
    target: { value: "same\nnew" },
  });
  await user.click(screen.getByRole("button", { name: "开始对比" }));

  const result = screen.getByRole("region", { name: "统一差异结果" });
  expect(result).toHaveTextContent("− 删除");
  expect(result).toHaveTextContent("+ 新增");
  expect(result).toHaveTextContent("修改");
});

it("uses the same ignore semantics in the summary and unified result", async () => {
  const user = userEvent.setup();
  renderDiffPage();

  await user.click(screen.getByRole("checkbox", { name: "忽略空白" }));
  await user.click(screen.getByRole("checkbox", { name: "忽略大小写" }));
  await user.click(screen.getByRole("button", { name: "统一视图" }));
  fireEvent.change(screen.getByLabelText("A 侧内容"), {
    target: { value: " Alpha   Value \nold" },
  });
  fireEvent.change(screen.getByLabelText("B 侧内容"), {
    target: { value: "alpha value\nnew" },
  });
  await user.click(screen.getByRole("button", { name: "开始对比" }));

  expect(screen.getByText("发现 1 处差异")).toBeVisible();
  const result = screen.getByRole("region", { name: "统一差异结果" });
  expect(result).toHaveTextContent("alpha value");
  expect(
    Array.from(result.querySelectorAll("mark"), (mark) => mark.textContent),
  ).toEqual(["old", "new"]);

  await user.click(screen.getByRole("button", { name: "双栏视图" }));
  expect(monaco.props).toHaveBeenLastCalledWith(
    expect.objectContaining({
      modified: "alpha value\nnew",
      original: "alpha value\nold",
    }),
  );
});

it.each([
  {
    checkbox: "忽略大小写",
    left: "A\nold",
    normalizedLeft: "a\nold",
    normalizedRight: "a\nnew",
    right: "a\nnew",
  },
  {
    checkbox: "忽略空白",
    left: "Alpha   Value\nold",
    normalizedLeft: "Alpha Value\nold",
    normalizedRight: "Alpha Value\nnew",
    right: "Alpha Value\nnew",
  },
])(
  "recomputes an existing result when toggling $checkbox",
  async ({ checkbox, left, normalizedLeft, normalizedRight, right }) => {
    const user = userEvent.setup();
    renderDiffPage();

    fireEvent.change(screen.getByLabelText("A 侧内容"), {
      target: { value: left },
    });
    fireEvent.change(screen.getByLabelText("B 侧内容"), {
      target: { value: right },
    });
    await user.click(screen.getByRole("button", { name: "开始对比" }));

    expect(screen.getByText("发现 2 处差异")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "下一处差异" }));
    expect(screen.getByText("2 / 2")).toBeVisible();

    await user.click(screen.getByRole("checkbox", { name: checkbox }));

    expect(screen.getByText("发现 1 处差异")).toBeVisible();
    expect(screen.getByText("1 / 1")).toBeVisible();
    expect(monaco.props).toHaveBeenLastCalledWith(
      expect.objectContaining({
        modified: normalizedRight,
        original: normalizedLeft,
      }),
    );
  },
);

it("configures Monaco to show default whitespace changes without collapsing side-by-side", async () => {
  const user = userEvent.setup();
  renderDiffPage();

  fireEvent.change(screen.getByLabelText("A 侧内容"), {
    target: { value: "value " },
  });
  fireEvent.change(screen.getByLabelText("B 侧内容"), {
    target: { value: "value" },
  });
  await user.click(screen.getByRole("button", { name: "开始对比" }));

  expect(screen.getByText("发现 1 处差异")).toBeVisible();
  expect(monaco.props).toHaveBeenLastCalledWith(
    expect.objectContaining({
      options: expect.objectContaining({
        ignoreTrimWhitespace: false,
        renderSideBySide: true,
        useInlineViewWhenSpaceIsLimited: false,
      }),
    }),
  );
});

it("focuses and scrolls each unified change while navigation wraps", async () => {
  const user = userEvent.setup();
  const scrollIntoView = vi.mocked(HTMLElement.prototype.scrollIntoView);
  renderDiffPage();

  await user.click(screen.getByRole("button", { name: "统一视图" }));
  fireEvent.change(screen.getByLabelText("A 侧内容"), {
    target: { value: "old one\nsame\nold two" },
  });
  fireEvent.change(screen.getByLabelText("B 侧内容"), {
    target: { value: "new one\nsame\nnew two" },
  });
  await user.click(screen.getByRole("button", { name: "开始对比" }));

  const first = document.querySelector<HTMLElement>('[data-change-index="0"]');
  const second = document.querySelector<HTMLElement>('[data-change-index="1"]');
  expect(first).toHaveFocus();
  expect(first).toHaveAttribute("aria-current", "true");

  await user.click(screen.getByRole("button", { name: "下一处差异" }));
  expect(second).toHaveFocus();
  expect(second).toHaveAttribute("aria-current", "true");

  await user.click(screen.getByRole("button", { name: "下一处差异" }));
  expect(first).toHaveFocus();
  expect(scrollIntoView).toHaveBeenCalledWith({ block: "center" });
});

it("navigates JSON array, repeated-key, and deletion changes by exact side and line", async () => {
  const user = userEvent.setup();
  renderDiffPage();
  await user.click(screen.getByRole("button", { name: "JSON 模式" }));

  fireEvent.change(screen.getByLabelText("A 侧内容"), {
    target: {
      value:
        '{"gone":1,"items":[1,2],"left":{"id":1},"right":{"id":2}}',
    },
  });
  fireEvent.change(screen.getByLabelText("B 侧内容"), {
    target: {
      value: '{"items":[1,2,3],"left":{"id":9},"right":{"id":3}}',
    },
  });
  await user.click(screen.getByRole("button", { name: "开始对比" }));

  expect(monaco.originalEditor.setPosition).toHaveBeenLastCalledWith({
    lineNumber: 2,
    column: 1,
  });

  await user.click(screen.getByRole("button", { name: "下一处差异" }));
  expect(monaco.modifiedEditor.setPosition).toHaveBeenLastCalledWith({
    lineNumber: 5,
    column: 1,
  });

  await user.click(screen.getByRole("button", { name: "下一处差异" }));
  expect(monaco.modifiedEditor.setPosition).toHaveBeenLastCalledWith({
    lineNumber: 8,
    column: 1,
  });

  await user.click(screen.getByRole("button", { name: "下一处差异" }));
  expect(monaco.modifiedEditor.setPosition).toHaveBeenLastCalledWith({
    lineNumber: 11,
    column: 1,
  });

  await user.click(screen.getByRole("button", { name: "下一处差异" }));
  expect(monaco.originalEditor.setPosition).toHaveBeenLastCalledWith({
    lineNumber: 2,
    column: 1,
  });

  await user.click(screen.getByRole("button", { name: "统一视图" }));
  for (let index = 0; index < 4; index += 1) {
    expect(
      document.querySelector(`[data-change-index="${index}"]`),
    ).toBeInTheDocument();
  }
});
