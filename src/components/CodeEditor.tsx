import Editor, { type OnMount } from "@monaco-editor/react";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import type { editor } from "monaco-editor";
import "./configureMonaco";
import { useMonacoTheme } from "./ResolvedTheme";

export interface CodeEditorHandle {
  focusPosition(line: number, column: number): void;
  setScrollTop(scrollTop: number): void;
}

export interface CodeEditorDecoration {
  className: string;
  lineNumber: number;
}

interface CodeEditorProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  onScrollTopChange?: (scrollTop: number) => void;
  readOnly?: boolean;
  language?: "json" | "plaintext";
  decorations?: CodeEditorDecoration[];
}

export const CodeEditor = forwardRef<CodeEditorHandle, CodeEditorProps>(
  function CodeEditor(
    {
      decorations = [],
      label,
      language = "json",
      onChange,
      onScrollTopChange,
      readOnly = false,
      value,
    },
    ref,
  ) {
    const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
    const decorationsRef =
      useRef<editor.IEditorDecorationsCollection | null>(null);
    const scrollSubscriptionRef = useRef<{ dispose(): void } | null>(null);
    const onScrollTopChangeRef = useRef(onScrollTopChange);
    const resolvedTheme = useMonacoTheme();

    useEffect(() => {
      onScrollTopChangeRef.current = onScrollTopChange;
    }, [onScrollTopChange]);

    const handleMount: OnMount = (instance) => {
      editorRef.current = instance;
      scrollSubscriptionRef.current?.dispose();
      scrollSubscriptionRef.current = instance.onDidScrollChange((event) => {
        if (event.scrollTopChanged) {
          onScrollTopChangeRef.current?.(event.scrollTop);
        }
      });
    };

    useEffect(() => {
      const instance = editorRef.current;
      if (!instance) {
        return;
      }

      const nextDecorations = decorations.map((decoration) => ({
        range: {
          startLineNumber: decoration.lineNumber,
          startColumn: 1,
          endLineNumber: decoration.lineNumber,
          endColumn: 1,
        },
        options: {
          className: decoration.className,
          isWholeLine: true,
        },
      }));

      if (!decorationsRef.current) {
        decorationsRef.current =
          instance.createDecorationsCollection(nextDecorations);
        return;
      }

      decorationsRef.current.set(nextDecorations);
    }, [decorations]);

    useEffect(
      () => () => {
        scrollSubscriptionRef.current?.dispose();
        decorationsRef.current?.clear();
      },
      [],
    );

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
      setScrollTop(scrollTop: number) {
        editorRef.current?.setScrollTop(scrollTop);
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
          theme={resolvedTheme}
          value={value}
        />
      </section>
    );
  },
);
