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

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }
  if (value && typeof value === "object" && !isLosslessNumber(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key, canonicalize(child)]),
    );
  }
  return value;
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

  return {
    leftDisplay: stringify(canonicalize(parsedLeft.value), undefined, 2) ?? "",
    rightDisplay: stringify(canonicalize(parsedRight.value), undefined, 2) ?? "",
    summary,
    changes,
  };
}

export type { JsonFailure } from "./types";
