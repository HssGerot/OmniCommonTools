import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { expect, it, vi } from "vitest";
import { CodeEditor, type CodeEditorHandle } from "./CodeEditor";

vi.mock("./configureMonaco", () => ({}));

const monaco = vi.hoisted(() => ({
  focus: vi.fn(),
  options: undefined as Record<string, unknown> | undefined,
  revealPositionInCenter: vi.fn(),
  setPosition: vi.fn(),
}));

vi.mock("@monaco-editor/react", () => ({
  default: ({
    onMount,
    options,
  }: {
    onMount?: (instance: typeof monaco) => void;
    options?: Record<string, unknown>;
  }) => {
    monaco.options = options;
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
