import { DateTime, IANAZone } from "luxon";

export type TimestampUnit = "auto" | "seconds" | "milliseconds";
export type TimeFailure = {
  ok: false;
  code: "invalid" | "ambiguous" | "nonexistent";
  message: string;
};
export type TimeSuccess = {
  ok: true;
  epochSeconds: string;
  epochMilliseconds: string;
  zoned: string;
  utc: string;
  iso: string;
  relative: string;
};

const LOCAL_DATE_TIME =
  /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?$/;
const ISO_WITH_OFFSET =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const INTEGER_TIMESTAMP = /^-?\d+$/;

interface WallTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  millisecond: number;
}

interface WallTimeCandidate {
  millis: number;
  offset: string;
}

function invalid(message: string): TimeFailure {
  return { ok: false, code: "invalid", message };
}

function isValidZone(zone: string) {
  return IANAZone.isValidZone(zone);
}

function formatOffset(offsetMinutes: number) {
  const sign = offsetMinutes < 0 ? "-" : "+";
  const absolute = Math.abs(offsetMinutes);
  const hours = Math.floor(absolute / 60);
  const minutes = absolute % 60;
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatEpochSeconds(milliseconds: number) {
  const value = BigInt(milliseconds);
  const sign = value < 0n ? "-" : "";
  const absolute = value < 0n ? -value : value;
  const seconds = absolute / 1000n;
  const remainder = absolute % 1000n;

  if (remainder === 0n) {
    return `${sign}${seconds}`;
  }

  const fraction = remainder.toString().padStart(3, "0").replace(/0+$/, "");
  return `${sign}${seconds}.${fraction}`;
}

function formatRelative(milliseconds: number) {
  const difference = milliseconds - Date.now();
  const absolute = Math.abs(difference);
  let value: number;
  let unit: string;

  if (absolute < 500) {
    return "现在";
  }
  if (absolute < 60_000) {
    value = Math.round(absolute / 1000);
    unit = "秒";
  } else if (absolute < 3_600_000) {
    value = Math.round(absolute / 60_000);
    unit = "分钟";
  } else if (absolute < 86_400_000) {
    value = Math.round(absolute / 3_600_000);
    unit = "小时";
  } else {
    value = Math.round(absolute / 86_400_000);
    unit = "天";
  }

  return `${value} ${unit}${difference < 0 ? "前" : "后"}`;
}

function success(milliseconds: number, zone: string): TimeSuccess {
  const zoned = DateTime.fromMillis(milliseconds, { zone });
  const utc = zoned.toUTC();

  return {
    ok: true,
    epochSeconds: formatEpochSeconds(milliseconds),
    epochMilliseconds: String(milliseconds),
    zoned: zoned.toFormat("yyyy-MM-dd HH:mm:ss.SSS ZZZZ"),
    utc: utc.toFormat("yyyy-MM-dd HH:mm:ss.SSS 'UTC'"),
    iso: utc.toISO({
      includeOffset: true,
      suppressMilliseconds: false,
    })!,
    relative: formatRelative(milliseconds),
  };
}

function parseWallTime(value: string): WallTime | null {
  const match = LOCAL_DATE_TIME.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute, second, millisecond] = match;
  const wallTime = {
    year: Number(year),
    month: Number(month),
    day: Number(day),
    hour: Number(hour),
    minute: Number(minute),
    second: Number(second),
    millisecond: Number(millisecond ?? "0"),
  };
  const validation = DateTime.fromObject(wallTime, { zone: "UTC" });

  return validation.isValid ? wallTime : null;
}

function matchesWallTime(dateTime: DateTime, wallTime: WallTime) {
  return (
    dateTime.year === wallTime.year &&
    dateTime.month === wallTime.month &&
    dateTime.day === wallTime.day &&
    dateTime.hour === wallTime.hour &&
    dateTime.minute === wallTime.minute &&
    dateTime.second === wallTime.second &&
    dateTime.millisecond === wallTime.millisecond
  );
}

function findWallTimeCandidates(
  wallTime: WallTime,
  zone: string,
): WallTimeCandidate[] {
  const wallMilliseconds = DateTime.fromObject(wallTime, {
    zone: "UTC",
  }).toMillis();
  const offsets = new Set<number>();
  const sampleRadius = 72 * 60 * 60 * 1000;
  const sampleStep = 30 * 60 * 1000;

  for (
    let sample = wallMilliseconds - sampleRadius;
    sample <= wallMilliseconds + sampleRadius;
    sample += sampleStep
  ) {
    const sampledDateTime = DateTime.fromMillis(sample, { zone });
    if (sampledDateTime.isValid) {
      offsets.add(sampledDateTime.offset);
    }
  }

  return [...offsets]
    .map((offsetMinutes) => {
      const millis = wallMilliseconds - offsetMinutes * 60_000;
      const candidate = DateTime.fromMillis(millis, { zone });
      if (
        !candidate.isValid ||
        candidate.offset !== offsetMinutes ||
        !matchesWallTime(candidate, wallTime)
      ) {
        return null;
      }
      return {
        millis,
        offset: formatOffset(offsetMinutes),
      };
    })
    .filter((candidate): candidate is WallTimeCandidate => candidate !== null)
    .sort((left, right) => left.millis - right.millis);
}

function ambiguous(candidates: WallTimeCandidate[]): TimeFailure {
  return {
    ok: false,
    code: "ambiguous",
    message: `该本地时间存在多个有效时区偏移，请选择 ${candidates
      .map((candidate) => candidate.offset)
      .join(" 或 ")}。`,
  };
}

export function fromTimestamp(
  value: string,
  unit: TimestampUnit,
  zone: string,
): TimeSuccess | TimeFailure {
  if (!isValidZone(zone)) {
    return invalid("请选择有效的 IANA 时区。");
  }
  if (!INTEGER_TIMESTAMP.test(value)) {
    return invalid("时间戳必须是未加空格的十进制整数。");
  }

  let resolvedUnit = unit;
  if (unit === "auto") {
    const digitCount = value.startsWith("-") ? value.length - 1 : value.length;
    if (digitCount === 10) {
      resolvedUnit = "seconds";
    } else if (digitCount === 13) {
      resolvedUnit = "milliseconds";
    } else {
      return invalid("自动识别仅接受 10 位秒时间戳或 13 位毫秒时间戳。");
    }
  }

  const integer = BigInt(value);
  const milliseconds =
    resolvedUnit === "seconds" ? integer * 1000n : integer;
  const numericMilliseconds = Number(milliseconds);
  if (
    !Number.isSafeInteger(numericMilliseconds) ||
    !DateTime.fromMillis(numericMilliseconds, { zone: "UTC" }).isValid
  ) {
    return invalid("时间戳超出可转换范围。");
  }

  return success(numericMilliseconds, zone);
}

export function fromDateTime(
  value: string,
  zone: string,
  overlapOffset?: string,
): TimeSuccess | TimeFailure {
  if (!isValidZone(zone)) {
    return invalid("请选择有效的 IANA 时区。");
  }

  if (ISO_WITH_OFFSET.test(value)) {
    const dateTime = DateTime.fromISO(value, { setZone: true });
    if (!dateTime.isValid) {
      return invalid("请输入有效的 ISO 8601 日期时间。");
    }
    return success(dateTime.toMillis(), zone);
  }

  const wallTime = parseWallTime(value);
  if (!wallTime) {
    return invalid(
      "请输入 YYYY-MM-DD HH:mm:ss[.SSS]，或带显式偏移的 ISO 8601 时间。",
    );
  }

  const candidates = findWallTimeCandidates(wallTime, zone);
  if (candidates.length === 0) {
    return {
      ok: false,
      code: "nonexistent",
      message: "该本地时间因夏令时切换而不存在，请选择其他时间。",
    };
  }
  if (candidates.length > 1) {
    const selected = candidates.find(
      (candidate) => candidate.offset === overlapOffset,
    );
    return selected ? success(selected.millis, zone) : ambiguous(candidates);
  }

  return success(candidates[0].millis, zone);
}
