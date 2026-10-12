import {
  isLosslessNumber,
  parse as parseLossless,
  stringify,
} from "lossless-json";

export type JsonIndent = 2 | 4 | "tab";
export type JsonSuccess = { ok: true; value: string };
export type JsonFailure = {
  ok: false;
  message: string;
  line: number;
  column: number;
};
export type JsonResult = JsonSuccess | JsonFailure;

function sortJsonValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortJsonValue);
  }

  if (value && typeof value === "object" && !isLosslessNumber(value)) {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
        .map(([key, child]) => [key, sortJsonValue(child)]),
    );
  }

  return value;
}

function failureFrom(error: unknown, source: string): JsonFailure {
  const rawMessage = error instanceof Error ? error.message : "JSON 语法无效";
  const positionMatch = rawMessage.match(/at position (\d+)\s*$/);
  const position = Math.min(
    positionMatch ? Number(positionMatch[1]) : 0,
    source.length,
  );
  const prefix = source.slice(0, position);
  const lines = prefix.split("\n");

  return {
    ok: false,
    message:
      rawMessage.replace(/\s*at position \d+\s*$/, "") || "JSON 语法无效",
    line: lines.length,
    column: (lines.at(-1)?.length ?? 0) + 1,
  };
}

function transformJson(
  source: string,
  sortKeys: boolean,
  space?: number | string,
): JsonResult {
  try {
    const parsed = parseLossless(source);
    const value = stringify(
      sortKeys ? sortJsonValue(parsed) : parsed,
      undefined,
      space,
    );

    return value === undefined
      ? { ok: false, message: "JSON 语法无效", line: 1, column: 1 }
      : { ok: true, value };
  } catch (error) {
    return failureFrom(error, source);
  }
}

export function formatJson(
  source: string,
  indent: JsonIndent,
  sortKeys: boolean,
): JsonResult {
  return transformJson(source, sortKeys, indent === "tab" ? "\t" : indent);
}

export function minifyJson(source: string, sortKeys: boolean): JsonResult {
  return transformJson(source, sortKeys);
}
