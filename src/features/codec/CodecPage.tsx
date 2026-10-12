import {
  Clipboard,
  Play,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CodeEditor } from "../../components/CodeEditor";
import { IconButton } from "../../components/IconButton";
import { useToast } from "../../components/ToastRegion";
import { ToolPageHeader } from "../../components/ToolPageHeader";
import { copyText } from "../../utils/clipboard";
import type { PreferenceStore } from "../preferences/storage";
import { usePreferences } from "../preferences/usePreferences";
import {
  CODEC_METHODS,
  runCodecMethod,
  type CodecMethod,
  type CodecMethodId,
} from "./codecEngine";

interface CodecPageProps {
  preferenceStore?: PreferenceStore;
}

function groupMethods(group: CodecMethod["group"]) {
  return CODEC_METHODS.filter((method) => method.group === group);
}

export default function CodecPage({ preferenceStore }: CodecPageProps) {
  const preferences = usePreferences(preferenceStore);
  const { notify } = useToast();
  const [methodId, setMethodId] = useState<CodecMethodId>("url-encode");
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("等待输入");
  const [isRunning, setIsRunning] = useState(false);
  const encodeMethods = useMemo(() => groupMethods("encode"), []);
  const decodeMethods = useMemo(() => groupMethods("decode"), []);
  const activeMethod = CODEC_METHODS.find((method) => method.id === methodId);

  useEffect(() => {
    preferences.markRecent("codec");
  }, [preferences.markRecent]);

  async function convert(nextStatus = "已转换", options = { running: true }) {
    if (!input) {
      setOutput("");
      setError("");
      setStatus("等待输入");
      return;
    }

    if (options.running) {
      setIsRunning(true);
    }
    const result = await runCodecMethod(methodId, input);
    if (options.running) {
      setIsRunning(false);
    }
    if (result.ok) {
      setOutput(result.value);
      setError("");
      setStatus(nextStatus);
      return;
    }

    setError(result.message);
    setStatus("转换失败");
  }

  useEffect(() => {
    if (!input) {
      setOutput("");
      setError("");
      setStatus("等待输入");
      return;
    }

    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      const result = await runCodecMethod(methodId, input);
      if (cancelled) {
        return;
      }
      if (result.ok) {
        setOutput(result.value);
        setError("");
        setStatus("已自动转换");
        return;
      }
      setError(result.message);
      setStatus("转换失败");
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [input, methodId]);

  function clear() {
    setInput("");
    setOutput("");
    setError("");
    setStatus("等待输入");
  }

  async function copy() {
    if (await copyText(output)) {
      setStatus("已复制结果");
      notify("已复制结果");
      return;
    }

    setStatus("复制失败");
    notify("复制失败");
  }

  function renderMethodButton(method: CodecMethod) {
    return (
      <button
        aria-label={method.label}
        aria-pressed={method.id === methodId}
        className="codec-method-button"
        key={method.id}
        onClick={() => {
          setMethodId(method.id);
          setError("");
          setStatus(input ? "已切换方法" : "等待输入");
        }}
        type="button"
      >
        <span>{method.label}</span>
      </button>
    );
  }

  return (
    <main className="codec-tool-page" id="main-content">
      <ToolPageHeader
        toolId="codec"
        description="在浏览器本地处理常见编码、解码、摘要和结构化文本解析。"
        preferenceStore={preferenceStore}
        actions={
          <button className="secondary-button" onClick={clear} type="button">
            <RotateCcw aria-hidden="true" />
            清空
          </button>
        }
      />

      <section className="codec-workspace">
        <aside className="codec-methods" aria-label="编解码方法">
          <section aria-labelledby="codec-encode-heading">
            <h2 id="codec-encode-heading">加密 / 编码</h2>
            <div className="codec-method-list">
              {encodeMethods.map(renderMethodButton)}
            </div>
          </section>
          <section aria-labelledby="codec-decode-heading">
            <h2 id="codec-decode-heading">解密 / 解码</h2>
            <div className="codec-method-list">
              {decodeMethods.map(renderMethodButton)}
            </div>
          </section>
        </aside>

        <section className="codec-main-panel" aria-labelledby="codec-active-heading">
          <div className="codec-active-bar">
            <div>
              <p className="codec-kicker">Current method</p>
              <h2 id="codec-active-heading">{activeMethod?.label}</h2>
            </div>
            <button
              className="primary-button"
              disabled={isRunning}
              onClick={() => void convert()}
              type="button"
            >
              <Play aria-hidden="true" />
              {isRunning ? "转换中" : "转换"}
            </button>
          </div>

          <div className="codec-editors">
            <CodeEditor
              label="待处理内容"
              language="plaintext"
              onChange={setInput}
              value={input}
            />
            <div className="codec-output-pane">
              <div className="codec-output-actions">
                <IconButton
                  disabled={!output}
                  label="复制结果"
                  onClick={copy}
                >
                  <Clipboard aria-hidden="true" />
                </IconButton>
              </div>
              <CodeEditor
                label="处理结果"
                language="plaintext"
                readOnly
                value={output}
              />
            </div>
          </div>

          <footer className="codec-status-bar">
            <div className="codec-error-slot">
              {error ? (
                <span id="codec-error" role="alert">
                  {error}
                </span>
              ) : (
                <span aria-hidden="true">&nbsp;</span>
              )}
            </div>
            <span aria-live="polite">{status}</span>
          </footer>
        </section>
      </section>
    </main>
  );
}
