import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { expect, it, vi } from "vitest";
import { CodeEditor, type CodeEditorHandle } from "./CodeEditor";
import { ResolvedThemeProvider } from "./ResolvedTheme";

vi.mock("./configureMonaco", () => ({}));

const monaco = vi.hoisted(() => ({
  focus: vi.fn(),
  options: undefined as Record<string, unknown> | undefined,
  revealPositionInCenter: vi.fn(),
  setPosition: vi.fn(),
  theme: undefined as string | undefined,
}));

vi.mock("@monaco-editor/react", () => ({
  default: ({
    onMount,
    options,
    theme,
  }: {
    onMount?: (instance: typeof monaco) => void;
    options?: Record<string, unknown>;
    theme?: string;
  }) => {
    monaco.options = options;
    monaco.theme = theme;
    onMount?.(monaco);
    return <div>Monaco editor</div>;
  },
}));

function EditorHarness() {
  const ref = useRef<CodeEditorHandle>(null);
  return (
    <>
      <CodeEditor ref={ref} label="JSON 输入" value="" />
      <button onClick={() => ref.current?.focusPosition(3, 7)} type="button">
        定位错误
      </button>
    </>
  );
}

it("sets, reveals, and focuses the exact requested Monaco position", async () => {
  const user = userEvent.setup();
  render(<EditorHarness />);

  await user.click(screen.getByRole("button", { name: "定位错误" }));

  const position = { lineNumber: 3, column: 7 };
  expect(monaco.setPosition).toHaveBeenCalledWith(position);
  expect(monaco.revealPositionInCenter).toHaveBeenCalledWith(position);
  expect(monaco.focus).toHaveBeenCalledOnce();
});

it("allows keyboard users to tab out of the editor", () => {
  render(<CodeEditor label="JSON 输入" value="" />);

  expect(monaco.options).toMatchObject({ tabFocusMode: true });
});

it("renders the resolved application theme instead of reading the DOM", () => {
  document.documentElement.dataset.theme = "light";

  render(
    <ResolvedThemeProvider preference="dark">
      <CodeEditor label="JSON 输入" value="" />
    </ResolvedThemeProvider>,
  );

  expect(monaco.theme).toBe("vs-dark");
});
