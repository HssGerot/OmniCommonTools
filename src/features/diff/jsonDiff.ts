import {
  isLosslessNumber,
  parse as parseLossless,
  stringify,
} from "lossless-json";
import type {
  DiffChange,
  DiffResult,
  DiffSummary,
  JsonFailure,
} from "./types";

const MISSING = Symbol("missing");

function parseFailure(
  error: unknown,
  source: string,
  side: JsonFailure["side"],
): JsonFailure {
  const rawMessage = error instanceof Error ? error.message : "JSON 语法无效";
  const positionMatch = rawMessage.match(/at position (\d+)\s*$/);
  const position = Math.min(
    positionMatch ? Number(positionMatch[1]) : 0,
    source.length,
  );
  const lines = source.slice(0, position).split("\n");

  return {
    ok: false,
    side,
    message:
      rawMessage.replace(/\s*at position \d+\s*$/, "") || "JSON 语法无效",
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
}

function parseSide(source: string, side: JsonFailure["side"]) {
  try {
    return { ok: true as const, value: parseLossless(source) };
  } catch (error) {
    return parseFailure(error, source, side);
  }
}

function valueType(value: unknown) {
  if (value === null) {
    return "null";
  }
  if (isLosslessNumber(value)) {
    return "number";
  }
  if (Array.isArray(value)) {
    return "array";
  }
  return typeof value === "object" ? "object" : typeof value;
}

function childPath(path: string, key: string) {
  return /^[A-Za-z_$][\w$]*$/.test(key)
    ? `${path}.${key}`
    : `${path}[${JSON.stringify(key)}]`;
}

interface FormattedJson {
  display: string;
  locations: Map<string, number>;
}

function formatJson(value: unknown): FormattedJson {
  const lines: string[] = [];
  const locations = new Map<string, number>();

  function write(
    current: unknown,
    path: string,
    indent: number,
    prefix = "",
  ) {
    const padding = " ".repeat(indent);
    locations.set(path, lines.length + 1);

    if (Array.isArray(current)) {
      lines.push(`${padding}${prefix}[`);
      current.forEach((child, index) => {
        write(child, `${path}[${index}]`, indent + 2);
        if (index < current.length - 1) {
          lines[lines.length - 1] += ",";
        }
      });
      lines.push(`${padding}]`);
      return;
    }

    if (current && typeof current === "object" && !isLosslessNumber(current)) {
      const entries = Object.entries(current as Record<string, unknown>).sort(
        ([left], [right]) => left.localeCompare(right),
      );
      lines.push(`${padding}${prefix}{`);
      entries.forEach(([key, child], index) => {
        write(
          child,
          childPath(path, key),
          indent + 2,
          `${JSON.stringify(key)}: `,
        );
        if (index < entries.length - 1) {
          lines[lines.length - 1] += ",";
        }
      });
      lines.push(`${padding}}`);
      return;
    }

    lines.push(`${padding}${prefix}${stringify(current) ?? "null"}`);
  }

  write(value, "$", 0);
  return { display: lines.join("\n"), locations };
}

function recordChange(
  changes: DiffChange[],
  summary: DiffSummary,
  kind: DiffChange["kind"],
  path: string,
) {
  summary[kind] += 1;
  changes.push({ kind, path });
}

function compareValue(
  left: unknown | typeof MISSING,
  right: unknown | typeof MISSING,
  path: string,
  changes: DiffChange[],
  summary: DiffSummary,
) {
  if (left === MISSING) {
    recordChange(changes, summary, "added", path);
    return;
  }
  if (right === MISSING) {
    recordChange(changes, summary, "removed", path);
    return;
  }

  const leftType = valueType(left);
  const rightType = valueType(right);
  if (leftType !== rightType) {
    recordChange(changes, summary, "modified", path);
    return;
  }

  if (leftType === "array") {
    const leftArray = left as unknown[];
    const rightArray = right as unknown[];
    const length = Math.max(leftArray.length, rightArray.length);
    for (let index = 0; index < length; index += 1) {
      compareValue(
        index < leftArray.length ? leftArray[index] : MISSING,
        index < rightArray.length ? rightArray[index] : MISSING,
        `${path}[${index}]`,
        changes,
        summary,
      );
    }
    return;
  }

  if (leftType === "object") {
    const leftObject = left as Record<string, unknown>;
    const rightObject = right as Record<string, unknown>;
    const keys = [...new Set([...Object.keys(leftObject), ...Object.keys(rightObject)])]
      .sort((first, second) => first.localeCompare(second));
    for (const key of keys) {
      compareValue(
        Object.hasOwn(leftObject, key) ? leftObject[key] : MISSING,
        Object.hasOwn(rightObject, key) ? rightObject[key] : MISSING,
        childPath(path, key),
        changes,
        summary,
      );
    }
    return;
  }

  const equal = isLosslessNumber(left)
    ? isLosslessNumber(right) && left.value === right.value
    : Object.is(left, right);
  if (!equal) {
    recordChange(changes, summary, "modified", path);
  }
}

export function compareJson(
  left: string,
  right: string,
): DiffResult | JsonFailure {
  const parsedLeft = parseSide(left, "A");
  if (!parsedLeft.ok) {
    return parsedLeft;
  }
  const parsedRight = parseSide(right, "B");
  if (!parsedRight.ok) {
    return parsedRight;
  }

  const summary: DiffSummary = { added: 0, removed: 0, modified: 0 };
  const changes: DiffChange[] = [];
  compareValue(parsedLeft.value, parsedRight.value, "$", changes, summary);
  const formattedLeft = formatJson(parsedLeft.value);
  const formattedRight = formatJson(parsedRight.value);
  const locatedChanges = changes.map((change) => ({
    ...change,
    leftLine: formattedLeft.locations.get(change.path),
    rightLine: formattedRight.locations.get(change.path),
  }));

  return {
    changes: locatedChanges,
    leftDisplay: formattedLeft.display,
    leftRender: formattedLeft.display,
    rightDisplay: formattedRight.display,
    rightRender: formattedRight.display,
    summary,
  };
}

export type { JsonFailure } from "./types";
