import {
  Braces,
  Clipboard,
  Download,
  FileUp,
  Minimize2,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import {
  CodeEditor,
  type CodeEditorHandle,
} from "../../components/CodeEditor";
import { IconButton } from "../../components/IconButton";
import { ToolPageHeader } from "../../components/ToolPageHeader";
import { downloadText, readTextFile } from "../../utils/files";
import type { PreferenceStore } from "../preferences/storage";
import { usePreferences } from "../preferences/usePreferences";
import {
  formatJson,
  minifyJson,
  type JsonFailure,
  type JsonIndent,
  type JsonResult,
} from "./jsonEngine";

const SAMPLE_JSON =
  '{"example":{"id":9007199254740993,"active":true,"tags":["json","tools"]}}';

interface JsonFormatterPageProps {
  preferenceStore?: PreferenceStore;
}

interface PageError {
  message: string;
  line?: number;
  column?: number;
}

function resultError(result: JsonFailure): PageError {
  return {
    message: result.message,
    line: result.line,
    column: result.column,
  };
}

export default function JsonFormatterPage({
  preferenceStore,
}: JsonFormatterPageProps) {
  const preferences = usePreferences(preferenceStore);
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState<PageError | null>(null);
  const [status, setStatus] = useState("等待输入");
  const inputEditorRef = useRef<CodeEditorHandle>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const indent = preferences.settings.jsonIndent ?? 2;
  const sortKeys = preferences.settings.jsonSortKeys ?? false;

  useEffect(() => {
    if (!input) {
      setError(null);
      setStatus("等待输入");
      return;
    }

    const timeout = window.setTimeout(() => {
      const result = minifyJson(input, false);
      if (result.ok) {
        setError(null);
        setStatus("JSON 有效");
      } else {
        setError(resultError(result));
        setStatus("JSON 无效");
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [input]);

  function applyResult(result: JsonResult, successStatus: string) {
    if (result.ok) {
      setOutput(result.value);
      setError(null);
      setStatus(successStatus);
      return;
    }

    setError(resultError(result));
    setStatus("JSON 无效");
  }

  function handleFormat() {
    applyResult(formatJson(input, indent, sortKeys), "已格式化");
  }

  function handleMinify() {
    applyResult(minifyJson(input, sortKeys), "已压缩");
  }

  function handleClear() {
    setInput("");
    setOutput("");
    setError(null);
    setStatus("等待输入");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(output);
      setStatus("已复制结果");
    } catch {
      setStatus("复制失败");
    }
  }

  function handleDownload() {
    downloadText(output, "formatted.json");
    setStatus("已下载结果");
  }

  async function handleImport(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      const value = await readTextFile(file);
      setInput(value);
      setError(null);
      setStatus(`已导入 ${file.name}`);
    } catch (importError) {
      setError({
        message:
          importError instanceof Error ? importError.message : "文件读取失败",
      });
      setStatus("导入失败");
    } finally {
      event.target.value = "";
    }
  }

  function handleIndentChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value;
    const nextIndent: JsonIndent =
      value === "tab" ? "tab" : value === "4" ? 4 : 2;
    preferences.setSetting("jsonIndent", nextIndent);
  }

  function focusError() {
    if (error?.line && error.column) {
      inputEditorRef.current?.focusPosition(error.line, error.column);
    }
  }

  return (
    <main className="json-tool-page" id="main-content">
      <ToolPageHeader
        title="JSON 美化"
        description="在浏览器本地格式化、压缩与校验 JSON，完整保留大整数文本。"
        actions={
          <>
            <button
              className="secondary-button"
              onClick={() => setInput(SAMPLE_JSON)}
              type="button"
            >
              <Sparkles aria-hidden="true" />
              载入示例
            </button>
            <label className="secondary-button file-button">
              <FileUp aria-hidden="true" />
              导入
              <input
                ref={fileInputRef}
                accept=".json,application/json"
                aria-label="导入 JSON 文件"
                onChange={handleImport}
                type="file"
              />
            </label>
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

      <section className="json-toolbar" aria-label="JSON 操作">
        <div className="json-primary-actions">
          <button className="primary-button" onClick={handleFormat} type="button">
            <Braces aria-hidden="true" />
            格式化
          </button>
          <button
            className="secondary-button"
            onClick={handleMinify}
            type="button"
          >
            <Minimize2 aria-hidden="true" />
            压缩
          </button>
        </div>
        <div className="json-options">
          <label>
            <span>缩进</span>
            <select
              aria-label="缩进"
              onChange={handleIndentChange}
              value={String(indent)}
            >
              <option value="2">2 空格</option>
              <option value="4">4 空格</option>
              <option value="tab">Tab</option>
            </select>
          </label>
          <label className="checkbox-label">
            <input
              checked={sortKeys}
              onChange={(event) =>
                preferences.setSetting("jsonSortKeys", event.target.checked)
              }
              type="checkbox"
            />
            排序对象键
          </label>
        </div>
      </section>

      <section className="json-workspace">
        <CodeEditor
          ref={inputEditorRef}
          label="JSON 输入"
          onChange={setInput}
          value={input}
        />
        <div className="json-output-pane">
          <div className="json-output-actions">
            <IconButton
              disabled={!output}
              label="复制结果"
              onClick={handleCopy}
            >
              <Clipboard aria-hidden="true" />
            </IconButton>
            <IconButton
              disabled={!output}
              label="下载结果"
              onClick={handleDownload}
            >
              <Download aria-hidden="true" />
            </IconButton>
          </div>
          <CodeEditor label="JSON 结果" readOnly value={output} />
        </div>
      </section>

      <footer className="json-status-bar">
        <div className="json-error-slot">
          {error?.line && error.column ? (
            <button onClick={focusError} role="alert" type="button">
              第 {error.line} 行，第 {error.column} 列：{error.message}
            </button>
          ) : error ? (
            <span role="alert">{error.message}</span>
          ) : (
            <span aria-hidden="true">&nbsp;</span>
          )}
        </div>
        <span aria-live="polite">{status}</span>
      </footer>
    </main>
  );
}
