import { DiffEditor, type DiffOnMount } from "@monaco-editor/react";
import {
  ArrowDown,
  ArrowUp,
  FileUp,
  GitCompareArrows,
  RotateCcw,
  Sparkles,
  SwitchCamera,
} from "lucide-react";
import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import {
  CodeEditor,
  type CodeEditorDecoration,
  type CodeEditorHandle,
} from "../../components/CodeEditor";
import { useMonacoTheme } from "../../components/ResolvedTheme";
import { ToolPageHeader } from "../../components/ToolPageHeader";
import { readTextFile } from "../../utils/files";
import type { PreferenceStore } from "../preferences/storage";
import { usePreferences } from "../preferences/usePreferences";
import { compareJson } from "./jsonDiff";
import { buildUnifiedDiff, compareText } from "./textDiff";
import type { DiffResult, JsonFailure } from "./types";

type DiffMode = "text" | "json";
type DiffView = "side-by-side" | "unified";
type Side = "A" | "B";
type TextDiffOptions = Parameters<typeof compareText>[2];

const TEXT_SAMPLE = {
  left: "server:\n  host: localhost\n  port: 3000\n  debug: false",
  right: "server:\n  host: localhost\n  port: 8080\n  debug: true",
};
const JSON_SAMPLE = {
  left: '{"service":{"name":"api","replicas":2,"enabled":true}}',
  right: '{"service":{"name":"api","replicas":3,"enabled":true}}',
};

interface DiffPageProps {
  preferenceStore?: PreferenceStore;
}

function initialView(preferred?: DiffView): DiffView {
  if (preferred) {
    return preferred;
  }
  return typeof window !== "undefined" &&
    window.matchMedia?.("(max-width: 56rem)").matches
    ? "unified"
    : "side-by-side";
}

function differenceCount(result: DiffResult) {
  return result.summary.added + result.summary.removed + result.summary.modified;
}

function revealLineFor(
  result: DiffResult,
  index: number,
  mount: Parameters<DiffOnMount>[0],
) {
  const change = result.changes[index];
  if (!change) {
    return;
  }

  const editor =
    change.kind === "removed" ? mount.getOriginalEditor() : mount.getModifiedEditor();
  const line =
    change.kind === "removed"
      ? change.leftLine
      : change.rightLine ?? change.leftLine;
  if (line === undefined) {
    return;
  }
  editor.revealLineInCenter(line);
  editor.setPosition({ lineNumber: line, column: 1 });
}

function buildInputDecorations(
  result: DiffResult | null,
  side: Side,
  view: DiffView,
): CodeEditorDecoration[] {
  if (!result || view !== "side-by-side") {
    return [];
  }

  return result.changes.flatMap((change) => {
    if (side === "A") {
      if (change.kind === "added" || change.leftLine === undefined) {
        return [];
      }
      return [
        {
          className:
            change.kind === "removed"
              ? "diff-input-line-removed"
              : "diff-input-line-modified",
          lineNumber: change.leftLine,
        },
      ];
    }

    if (change.kind === "removed" || change.rightLine === undefined) {
      return [];
    }
    return [
      {
        className:
          change.kind === "added"
            ? "diff-input-line-added"
            : "diff-input-line-modified",
        lineNumber: change.rightLine,
      },
    ];
  });
}

export default function DiffPage({ preferenceStore }: DiffPageProps) {
  const preferences = usePreferences(preferenceStore);
  const monacoTheme = useMonacoTheme();
  const [mode, setMode] = useState<DiffMode>("text");
  const [left, setLeft] = useState("");
  const [right, setRight] = useState("");
  const [result, setResult] = useState<DiffResult | null>(null);
  const [error, setError] = useState<JsonFailure | { side: Side; message: string } | null>(
    null,
  );
  const [currentDifference, setCurrentDifference] = useState(0);
  const [view, setView] = useState<DiffView>(() =>
    initialView(preferences.settings.diffView),
  );
  const leftEditorRef = useRef<CodeEditorHandle>(null);
  const rightEditorRef = useRef<CodeEditorHandle>(null);
  const diffEditorRef = useRef<Parameters<DiffOnMount>[0] | null>(null);
  const unifiedLineRefs = useRef(new Map<number, HTMLDivElement>());
  const leftFileRef = useRef<HTMLInputElement>(null);
  const rightFileRef = useRef<HTMLInputElement>(null);
  const syncScrollRef = useRef(false);
  const ignoreWhitespace =
    preferences.settings.diffIgnoreWhitespace ?? false;
  const ignoreCase = preferences.settings.diffIgnoreCase ?? false;

  useEffect(() => {
    preferences.markRecent("text-json-diff");
  }, [preferences.markRecent]);

  useEffect(() => {
    if (!result) {
      return;
    }
    if (view === "side-by-side" && diffEditorRef.current) {
      revealLineFor(result, currentDifference, diffEditorRef.current);
      return;
    }
    if (view === "unified") {
      const line = unifiedLineRefs.current.get(currentDifference);
      line?.scrollIntoView({ block: "center" });
      line?.focus();
    }
  }, [currentDifference, result, view]);

  function calculate(
    leftValue = left,
    rightValue = right,
    activeMode = mode,
    textOptions: TextDiffOptions = { ignoreCase, ignoreWhitespace },
  ) {
    const next =
      activeMode === "json"
        ? compareJson(leftValue, rightValue)
        : compareText(leftValue, rightValue, textOptions);

    if ("ok" in next) {
      setResult(null);
      setError(next);
      setCurrentDifference(0);
      return;
    }

    setResult(next);
    setError(null);
    setCurrentDifference(0);
  }

  useEffect(() => {
    if (!left || !right) {
      setResult(null);
      setError(null);
      setCurrentDifference(0);
      return;
    }

    const timeout = window.setTimeout(() => {
      calculate(left, right, mode, { ignoreCase, ignoreWhitespace });
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [left, right, mode, ignoreCase, ignoreWhitespace]);

  function handleIgnoreOptions(nextOptions: TextDiffOptions) {
    if (nextOptions.ignoreWhitespace !== ignoreWhitespace) {
      preferences.setSetting(
        "diffIgnoreWhitespace",
        nextOptions.ignoreWhitespace,
      );
    }
    if (nextOptions.ignoreCase !== ignoreCase) {
      preferences.setSetting("diffIgnoreCase", nextOptions.ignoreCase);
    }
    if (mode === "text" && result) {
      calculate(left, right, mode, nextOptions);
    }
  }

  function updateInput(side: Side, value: string) {
    if (side === "A") {
      setLeft(value);
    } else {
      setRight(value);
    }
    setResult(null);
    setError(null);
    setCurrentDifference(0);
  }

  function handleMode(nextMode: DiffMode) {
    setMode(nextMode);
    setResult(null);
    setError(null);
    setCurrentDifference(0);
  }

  function handleSwap() {
    setLeft(right);
    setRight(left);
    setError(null);
    if (result) {
      calculate(right, left);
    }
  }

  function handleSample() {
    const sample = mode === "json" ? JSON_SAMPLE : TEXT_SAMPLE;
    setLeft(sample.left);
    setRight(sample.right);
    setResult(null);
    setError(null);
    setCurrentDifference(0);
  }

  function handleClear() {
    setLeft("");
    setRight("");
    setResult(null);
    setError(null);
    setCurrentDifference(0);
    if (leftFileRef.current) {
      leftFileRef.current.value = "";
    }
    if (rightFileRef.current) {
      rightFileRef.current.value = "";
    }
  }

  function handleView(nextView: DiffView) {
    setView(nextView);
    preferences.setSetting("diffView", nextView);
  }

  async function handleImport(
    side: Side,
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      updateInput(side, await readTextFile(file));
    } catch (importError) {
      setError({
        side,
        message:
          importError instanceof Error ? importError.message : "文件读取失败",
      });
    } finally {
      event.target.value = "";
    }
  }

  function navigate(offset: number) {
    if (!result?.changes.length) {
      return;
    }
    setCurrentDifference(
      (current) => (current + offset + result.changes.length) % result.changes.length,
    );
  }

  function syncInputScroll(source: Side, scrollTop: number) {
    if (syncScrollRef.current || view !== "side-by-side") {
      return;
    }

    syncScrollRef.current = true;
    const target = source === "A" ? rightEditorRef.current : leftEditorRef.current;
    target?.setScrollTop(scrollTop);
    window.requestAnimationFrame(() => {
      syncScrollRef.current = false;
    });
  }

  const total = result ? differenceCount(result) : 0;
  const language = mode === "json" ? "json" : "plaintext";
  const leftDecorations = buildInputDecorations(result, "A", view);
  const rightDecorations = buildInputDecorations(result, "B", view);
  const unifiedRows = result
    ? buildUnifiedDiff(result.leftRender, result.rightRender, result.changes)
    : [];
  const errorLocation =
    error && "line" in error
      ? `第 ${error.line} 行，第 ${error.column} 列：`
      : "";

  return (
    <main className="diff-tool-page" id="main-content">
      <ToolPageHeader
        toolId="text-json-diff"
        description="在浏览器本地比较文本或严格 JSON，输入内容不会离开设备。"
        preferenceStore={preferenceStore}
        actions={
          <>
            <button
              className="secondary-button"
              onClick={handleSample}
              type="button"
            >
              <Sparkles aria-hidden="true" />
              载入示例
            </button>
            <button
              className="secondary-button"
              onClick={handleSwap}
              type="button"
            >
              <SwitchCamera aria-hidden="true" />
              交换左右
            </button>
            <button
              className="secondary-button"
              onClick={handleClear}
              type="button"
            >
              <RotateCcw aria-hidden="true" />
              清空
            </button>
          </>
        }
      />

      <section className="diff-controls" aria-label="差异比较设置">
        <div className="diff-segmented" aria-label="比较模式">
          <button
            aria-pressed={mode === "text"}
            onClick={() => handleMode("text")}
            type="button"
          >
            文本模式
          </button>
          <button
            aria-pressed={mode === "json"}
            onClick={() => handleMode("json")}
            type="button"
          >
            JSON 模式
          </button>
        </div>
        {mode === "text" ? (
          <div className="diff-ignore-options">
            <label className="checkbox-label">
              <input
                checked={ignoreWhitespace}
                onChange={(event) =>
                  handleIgnoreOptions({
                    ignoreCase,
                    ignoreWhitespace: event.target.checked,
                  })
                }
                type="checkbox"
              />
              忽略空白
            </label>
            <label className="checkbox-label">
              <input
                checked={ignoreCase}
                onChange={(event) =>
                  handleIgnoreOptions({
                    ignoreCase: event.target.checked,
                    ignoreWhitespace,
                  })
                }
                type="checkbox"
              />
              忽略大小写
            </label>
          </div>
        ) : (
          <span className="diff-json-note">严格 JSON · 对象键序不影响结果</span>
        )}
        <div className="diff-segmented diff-view-switch" aria-label="结果视图">
          <button
            aria-pressed={view === "side-by-side"}
            onClick={() => handleView("side-by-side")}
            type="button"
          >
            双栏视图
          </button>
          <button
            aria-pressed={view === "unified"}
            onClick={() => handleView("unified")}
            type="button"
          >
            统一视图
          </button>
        </div>
      </section>

      <section className="diff-inputs" aria-label="待比较内容">
        <div className="diff-input-pane">
          <label className="secondary-button file-button diff-import-button">
            <FileUp aria-hidden="true" />
            导入 A
            <input
              ref={leftFileRef}
              accept={mode === "json" ? ".json,application/json" : ".txt,text/plain"}
              aria-label="导入 A 侧文件"
              onChange={(event) => void handleImport("A", event)}
              type="file"
            />
          </label>
          <CodeEditor
            ref={leftEditorRef}
            decorations={leftDecorations}
            label="A 侧内容"
            language={language}
            onChange={(value) => updateInput("A", value)}
            onScrollTopChange={(scrollTop) => syncInputScroll("A", scrollTop)}
            value={left}
          />
        </div>
        <div className="diff-input-pane">
          <label className="secondary-button file-button diff-import-button">
            <FileUp aria-hidden="true" />
            导入 B
            <input
              ref={rightFileRef}
              accept={mode === "json" ? ".json,application/json" : ".txt,text/plain"}
              aria-label="导入 B 侧文件"
              onChange={(event) => void handleImport("B", event)}
              type="file"
            />
          </label>
          <CodeEditor
            ref={rightEditorRef}
            decorations={rightDecorations}
            label="B 侧内容"
            language={language}
            onChange={(value) => updateInput("B", value)}
            onScrollTopChange={(scrollTop) => syncInputScroll("B", scrollTop)}
            value={right}
          />
        </div>
      </section>

      <section className="diff-action-bar" aria-label="比较操作">
        <button className="primary-button" onClick={() => calculate()} type="button">
          <GitCompareArrows aria-hidden="true" />
          开始对比
        </button>
        <div className="diff-summary" aria-live="polite">
          {result ? (
            <>
              <strong>发现 {total} 处差异</strong>
              <span>新增 {result.summary.added}</span>
              <span>删除 {result.summary.removed}</span>
              <span>修改 {result.summary.modified}</span>
            </>
          ) : (
            <span>输入 A、B 两侧内容后开始对比</span>
          )}
        </div>
        <div className="diff-navigation" aria-label="差异导航">
          <button
            aria-label="上一处差异"
            disabled={!result?.changes.length}
            onClick={() => navigate(-1)}
            type="button"
          >
            <ArrowUp aria-hidden="true" />
          </button>
          <span>{result?.changes.length ? `${currentDifference + 1} / ${result.changes.length}` : "0 / 0"}</span>
          <button
            aria-label="下一处差异"
            disabled={!result?.changes.length}
            onClick={() => navigate(1)}
            type="button"
          >
            <ArrowDown aria-hidden="true" />
          </button>
        </div>
      </section>

      {error ? (
        <div className="diff-error" role="alert">
          <strong>{error.side} 侧：</strong>
          {errorLocation}
          {error.message}
        </div>
      ) : null}

      {result ? (
        view === "side-by-side" ? (
          <section className="diff-result diff-result-side" aria-label="双栏差异结果">
            <DiffEditor
              height="100%"
              language={language}
              modified={result.rightRender}
              onMount={(instance) => {
                diffEditorRef.current = instance;
                revealLineFor(result, currentDifference, instance);
              }}
              options={{
                automaticLayout: true,
                fontSize: 13,
                minimap: { enabled: false },
                readOnly: true,
                ignoreTrimWhitespace: false,
                renderSideBySide: true,
                scrollBeyondLastLine: false,
                useInlineViewWhenSpaceIsLimited: false,
              }}
              original={result.leftRender}
              theme={monacoTheme}
            />
          </section>
        ) : (
          <section
            className="diff-result diff-result-unified"
            aria-label="统一差异结果"
          >
            {total === 0 ? (
              <p className="diff-no-changes">内容一致，没有发现差异。</p>
            ) : (
              <>
                <div className="diff-legend" aria-label="差异标记说明">
                  <span>− 删除</span>
                  <span>+ 新增</span>
                  <span>修改</span>
                </div>
                <div className="diff-unified-lines">
                  {unifiedRows.map((row, rowIndex) => (
                    <div
                      aria-current={
                        row.changeIndex === currentDifference ? "true" : undefined
                      }
                      className={`diff-line is-${row.kind}`}
                      data-change-index={row.changeIndex}
                      key={`${row.kind}-${rowIndex}`}
                      ref={(element) => {
                        if (row.changeIndex === undefined) {
                          return;
                        }
                        if (element) {
                          unifiedLineRefs.current.set(row.changeIndex, element);
                        } else {
                          unifiedLineRefs.current.delete(row.changeIndex);
                        }
                      }}
                      tabIndex={row.changeIndex === undefined ? undefined : -1}
                    >
                      <span className="diff-line-marker" aria-hidden="true">
                        {row.kind === "removed"
                          ? "−"
                          : row.kind === "added"
                            ? "+"
                            : " "}
                      </span>
                      <span className="visually-hidden">
                        {row.kind === "removed"
                          ? "删除："
                          : row.kind === "added"
                            ? "新增："
                            : "未更改："}
                      </span>
                      <code>
                        {row.segments.map((segment, segmentIndex) =>
                          segment.changed ? (
                            <mark key={segmentIndex}>{segment.text}</mark>
                          ) : (
                            <span key={segmentIndex}>{segment.text}</span>
                          ),
                        )}
                      </code>
                    </div>
                  ))}
                </div>
                <ol className="diff-change-list" aria-label="差异位置">
                  {result.changes.map((change, index) => (
                    <li
                      aria-current={index === currentDifference ? "true" : undefined}
                      key={`${change.kind}-${change.path}-${index}`}
                    >
                      <span>
                        {change.kind === "added"
                          ? "+ 新增"
                          : change.kind === "removed"
                            ? "− 删除"
                            : "修改"}
                      </span>
                      <code>{change.path}</code>
                    </li>
                  ))}
                </ol>
              </>
            )}
          </section>
        )
      ) : null}
    </main>
  );
}
