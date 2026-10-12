import { DateTime, IANAZone } from "luxon";
import {
  Clipboard,
  Clock3,
  Pause,
  Play,
  RotateCcw,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { IconButton } from "../../components/IconButton";
import { useToast } from "../../components/ToastRegion";
import { ToolPageHeader } from "../../components/ToolPageHeader";
import type { PreferenceStore } from "../preferences/storage";
import { usePreferences } from "../preferences/usePreferences";
import {
  fromDateTime,
  fromTimestamp,
  type TimeFailure,
  type TimeSuccess,
  type TimestampUnit,
} from "./timeEngine";

const FALLBACK_TIME_ZONES = [
  "UTC",
  "America/Los_Angeles",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Shanghai",
  "Asia/Tokyo",
  "Asia/Kolkata",
  "Australia/Sydney",
];

type ActiveConverter = "timestamp" | "dateTime";

interface TimeConverterPageProps {
  preferenceStore?: PreferenceStore;
}

interface ResultFieldProps {
  label: string;
  onCopy: (value: string, label: string) => void;
  value: string;
}

function availableTimeZones() {
  const supportedValuesOf = (
    Intl as typeof Intl & {
      supportedValuesOf?: (key: "timeZone") => string[];
    }
  ).supportedValuesOf;
  const browserZones = supportedValuesOf?.("timeZone") ?? [];
  const zones = new Set([...FALLBACK_TIME_ZONES, ...browserZones]);

  return [
    "UTC",
    ...[...zones]
      .filter((zone) => zone !== "UTC")
      .sort((left, right) => left.localeCompare(right)),
  ];
}

function defaultTimeZone(preferred?: string) {
  if (preferred && IANAZone.isValidZone(preferred)) {
    return preferred;
  }

  const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return browserZone && IANAZone.isValidZone(browserZone) ? browserZone : "UTC";
}

function overlapOffsets(error: TimeFailure | null) {
  if (error?.code !== "ambiguous") {
    return [];
  }
  return [...new Set(error.message.match(/[+-]\d{2}:\d{2}/g) ?? [])];
}

function ResultField({ label, onCopy, value }: ResultFieldProps) {
  return (
    <div className="time-result-field">
      <span>{label}</span>
      <span className="time-result-control">
        <input aria-label={label} readOnly value={value} />
        <IconButton
          disabled={!value}
          label={`复制${label}`}
          onClick={() => onCopy(value, label)}
        >
          <Clipboard aria-hidden="true" />
        </IconButton>
      </span>
    </div>
  );
}

export default function TimeConverterPage({
  preferenceStore,
}: TimeConverterPageProps) {
  const preferences = usePreferences(preferenceStore);
  const { notify } = useToast();
  const [zone, setZone] = useState(() =>
    defaultTimeZone(preferences.settings.timeZone),
  );
  const [unit, setUnit] = useState<TimestampUnit>(
    preferences.settings.timestampUnit ?? "auto",
  );
  const [timestamp, setTimestamp] = useState("");
  const [dateTime, setDateTime] = useState("");
  const [activeConverter, setActiveConverter] =
    useState<ActiveConverter>("timestamp");
  const [overlapOffset, setOverlapOffset] = useState("");
  const [clockMilliseconds, setClockMilliseconds] = useState(() => Date.now());
  const [paused, setPaused] = useState(false);
  const [status, setStatus] = useState("");
  const zones = useMemo(availableTimeZones, []);

  useEffect(() => {
    preferences.markRecent("timestamp-converter");
  }, [preferences.markRecent]);

  useEffect(() => {
    if (paused) {
      return;
    }

    const interval = window.setInterval(() => {
      setClockMilliseconds(Date.now());
    }, 250);
    return () => window.clearInterval(interval);
  }, [paused]);

  const conversion = useMemo<TimeSuccess | TimeFailure | null>(() => {
    if (activeConverter === "timestamp") {
      return timestamp ? fromTimestamp(timestamp, unit, zone) : null;
    }
    return dateTime
      ? fromDateTime(dateTime, zone, overlapOffset || undefined)
      : null;
  }, [activeConverter, dateTime, overlapOffset, timestamp, unit, zone]);
  const error = conversion && !conversion.ok ? conversion : null;
  const result = conversion?.ok ? conversion : null;
  const candidates = overlapOffsets(error);
  const currentSeconds = String(Math.floor(clockMilliseconds / 1000));
  const currentMilliseconds = String(clockMilliseconds);
  const currentZoned = DateTime.fromMillis(clockMilliseconds, { zone }).toFormat(
    "yyyy-MM-dd HH:mm:ss.SSS ZZZZ",
  );

  function selectZone(nextZone: string) {
    setZone(nextZone);
    preferences.setSetting("timeZone", nextZone);
    setOverlapOffset("");
  }

  function selectUnit(nextUnit: TimestampUnit) {
    setUnit(nextUnit);
    preferences.setSetting("timestampUnit", nextUnit);
    if (timestamp) {
      setActiveConverter("timestamp");
    }
  }

  function updateTimestamp(value: string) {
    setTimestamp(value);
    setActiveConverter("timestamp");
  }

  function updateDateTime(value: string) {
    setDateTime(value);
    setOverlapOffset("");
    setActiveConverter("dateTime");
  }

  function toggleClock() {
    setPaused((current) => {
      if (current) {
        setClockMilliseconds(Date.now());
      }
      return !current;
    });
  }

  function fillTimestamp() {
    setTimestamp(currentMilliseconds);
    setUnit("milliseconds");
    preferences.setSetting("timestampUnit", "milliseconds");
    setActiveConverter("timestamp");
  }

  function fillDateTime() {
    setDateTime(
      DateTime.fromMillis(clockMilliseconds, { zone }).toFormat(
        "yyyy-MM-dd HH:mm:ss.SSS",
      ),
    );
    setOverlapOffset("");
    setActiveConverter("dateTime");
  }

  function clearInputs() {
    setTimestamp("");
    setDateTime("");
    setOverlapOffset("");
    setActiveConverter("timestamp");
    setStatus("");
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(`已复制${label}`);
      notify(`已复制${label}`);
    } catch {
      setStatus("复制失败");
      notify("复制失败");
    }
  }

  return (
    <main className="time-tool-page" id="main-content">
      <ToolPageHeader
        toolId="timestamp-converter"
        description="在浏览器本地进行时区安全的时间戳与日期时间转换。"
        preferenceStore={preferenceStore}
        actions={
          <button className="secondary-button" onClick={clearInputs} type="button">
            <RotateCcw aria-hidden="true" />
            清空
          </button>
        }
      />

      <section className="time-clock-panel" aria-labelledby="current-time-heading">
        <div className="time-section-heading">
          <div>
            <p className="time-kicker">Live clock</p>
            <h2 id="current-time-heading">当前时间</h2>
          </div>
          <button className="secondary-button" onClick={toggleClock} type="button">
            {paused ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
            {paused ? "继续时钟" : "暂停时钟"}
          </button>
        </div>
        <div className="time-current-grid">
          <ResultField
            label="当前秒时间戳"
            onCopy={copy}
            value={currentSeconds}
          />
          <ResultField
            label="当前毫秒时间戳"
            onCopy={copy}
            value={currentMilliseconds}
          />
          <ResultField
            label="当前时区时间"
            onCopy={copy}
            value={currentZoned}
          />
        </div>
      </section>

      <section className="time-settings" aria-label="时间转换设置">
        <label>
          <span>目标时区</span>
          <select
            aria-label="目标时区"
            onChange={(event) => selectZone(event.target.value)}
            value={zone}
          >
            {zones.map((timeZone) => (
              <option key={timeZone} value={timeZone}>
                {timeZone}
              </option>
            ))}
          </select>
        </label>
        <span>所有日期时间展示使用此 IANA 时区，时间戳本身保持不变。</span>
      </section>

      <div className="time-converter-grid">
        <section className="time-converter-card" aria-labelledby="timestamp-heading">
          <div className="time-card-heading">
            <div>
              <p className="time-kicker">Epoch to date</p>
              <h2 id="timestamp-heading">时间戳转日期时间</h2>
            </div>
            <button className="secondary-button" onClick={fillTimestamp} type="button">
              <Clock3 aria-hidden="true" />
              填入当前时间戳
            </button>
          </div>
          <label className="time-input-field">
            <span>时间戳</span>
            <input
              aria-describedby={
                activeConverter === "timestamp" && error
                  ? "time-conversion-error"
                  : undefined
              }
              aria-invalid={activeConverter === "timestamp" && Boolean(error)}
              inputMode="numeric"
              onChange={(event) => updateTimestamp(event.target.value)}
              placeholder="例如 1791768645"
              spellCheck="false"
              value={timestamp}
            />
          </label>
          <fieldset className="time-unit-fieldset">
            <legend>时间戳单位</legend>
            <div className="time-segmented">
              {(
                [
                  ["auto", "自动"],
                  ["seconds", "秒"],
                  ["milliseconds", "毫秒"],
                ] as const
              ).map(([value, label]) => (
                <label key={value}>
                  <input
                    checked={unit === value}
                    name="timestamp-unit"
                    onChange={() => selectUnit(value)}
                    type="radio"
                    value={value}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        </section>

        <section className="time-converter-card" aria-labelledby="date-time-heading">
          <div className="time-card-heading">
            <div>
              <p className="time-kicker">Date to epoch</p>
              <h2 id="date-time-heading">日期时间转时间戳</h2>
            </div>
            <button className="secondary-button" onClick={fillDateTime} type="button">
              <Clock3 aria-hidden="true" />
              填入当前日期时间
            </button>
          </div>
          <label className="time-input-field">
            <span>日期时间</span>
            <input
              aria-describedby={
                activeConverter === "dateTime" && error
                  ? "date-time-hint time-conversion-error"
                  : "date-time-hint"
              }
              aria-invalid={activeConverter === "dateTime" && Boolean(error)}
              onChange={(event) => updateDateTime(event.target.value)}
              placeholder="YYYY-MM-DD HH:mm:ss.SSS"
              spellCheck="false"
              value={dateTime}
            />
          </label>
          <p className="time-input-hint" id="date-time-hint">
            严格本地格式，或输入带显式偏移的 ISO 8601 时间。
          </p>
        </section>
      </div>

      {error ? (
        <div className={`time-alert is-${error.code}`} id="time-conversion-error" role="alert">
          <strong>
            {error.code === "ambiguous"
              ? "需要选择偏移"
              : error.code === "nonexistent"
                ? "时间不存在"
                : "无法转换"}
          </strong>
          <span>{error.message}</span>
          {candidates.length > 0 ? (
            <fieldset className="time-overlap-options">
              <legend>选择时区偏移</legend>
              {candidates.map((candidate) => (
                <label key={candidate}>
                  <input
                    checked={overlapOffset === candidate}
                    name="overlap-offset"
                    onChange={() => setOverlapOffset(candidate)}
                    type="radio"
                  />
                  {candidate}
                </label>
              ))}
            </fieldset>
          ) : null}
        </div>
      ) : null}

      <section className="time-results" aria-labelledby="time-results-heading">
        <div className="time-section-heading">
          <div>
            <p className="time-kicker">Canonical result</p>
            <h2 id="time-results-heading">转换结果</h2>
          </div>
          <span aria-live="polite">{status}</span>
        </div>
        <div className="time-results-grid">
          <ResultField
            label="秒时间戳结果"
            onCopy={copy}
            value={result?.epochSeconds ?? ""}
          />
          <ResultField
            label="毫秒时间戳结果"
            onCopy={copy}
            value={result?.epochMilliseconds ?? ""}
          />
          <ResultField
            label="目标时区结果"
            onCopy={copy}
            value={result?.zoned ?? ""}
          />
          <ResultField
            label="UTC 结果"
            onCopy={copy}
            value={result?.utc ?? ""}
          />
          <ResultField
            label="ISO 8601 结果"
            onCopy={copy}
            value={result?.iso ?? ""}
          />
          <ResultField
            label="相对时间结果"
            onCopy={copy}
            value={result?.relative ?? ""}
          />
        </div>
      </section>
    </main>
  );
}
