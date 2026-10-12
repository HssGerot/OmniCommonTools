import Editor, { type OnMount } from "@monaco-editor/react";
import { forwardRef, useImperativeHandle, useRef } from "react";
import type { editor } from "monaco-editor";
import "./configureMonaco";

export interface CodeEditorHandle {
  focusPosition(line: number, column: number): void;
}

interface CodeEditorProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  language?: "json" | "plaintext";
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    { label, language = "json", onChange, readOnly = false, value },
    ref,
  ) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

    const handleMount: OnMount = (instance) => {
      editorRef.current = instance;
    };

    useImperativeHandle(ref, () => ({
      focusPosition(line: number, column: number) {
        const instance = editorRef.current;
        if (!instance) {
          return;
        }

        const position = { lineNumber: line, column };
        instance.setPosition(position);
        instance.revealPositionInCenter(position);
        instance.focus();
      },
    }));

    return (
      <section className="code-editor" aria-label={label}>
        <div className="code-editor-label">{label}</div>
        <Editor
          height="100%"
          language={language}
          onChange={(nextValue) => onChange?.(nextValue ?? "")}
          onMount={handleMount}
          options={{
            ariaLabel: label,
            automaticLayout: true,
            fontFamily:
              '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
            fontSize: 13,
            lineNumbersMinChars: 3,
            minimap: { enabled: false },
            padding: { top: 12, bottom: 12 },
            readOnly,
            renderValidationDecorations: "off",
            scrollBeyondLastLine: false,
            tabSize: 2,
            tabFocusMode: true,
            wordWrap: "on",
          }}
          theme={
            document.documentElement.dataset.theme === "dark"
              ? "vs-dark"
              : "light"
          }
          value={value}
        />
      </section>
    );
  },
);
