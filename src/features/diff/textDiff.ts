import {
  diffArrays,
  diffLines,
  diffWordsWithSpace,
  type ArrayChange,
} from "diff";
import type { DiffChange, DiffResult, DiffSummary } from "./types";

interface TextDiffOptions {
  ignoreWhitespace: boolean;
  ignoreCase: boolean;
}

export interface UnifiedDiffSegment {
  changed: boolean;
  text: string;
}

export interface UnifiedDiffRow {
  kind: "unchanged" | "added" | "removed";
  segments: UnifiedDiffSegment[];
}

function normalizeLine(line: string, options: TextDiffOptions) {
  let normalized = options.ignoreWhitespace
    ? line.trim().replace(/\s+/g, " ")
    : line;
  if (options.ignoreCase) {
    normalized = normalized.toLocaleLowerCase();
  }
  return normalized;
}

function normalizedLines(source: string, options: TextDiffOptions) {
  return source
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) => normalizeLine(line, options));
}

function linesInBlock(value: string) {
  const lines = value.split("\n");
  if (value.endsWith("\n")) {
    lines.pop();
  }
  return lines;
}

function changedLine(kind: UnifiedDiffRow["kind"], text: string): UnifiedDiffRow {
  return { kind, segments: [{ changed: kind !== "unchanged", text }] };
}

function replacementRows(left: string, right: string): UnifiedDiffRow[] {
  const wordChanges = diffWordsWithSpace(left, right);
  return [
    {
      kind: "removed",
      segments: wordChanges
        .filter((change) => !change.added)
        .map((change) => ({
          changed: change.removed,
          text: change.value,
        })),
    },
    {
      kind: "added",
      segments: wordChanges
        .filter((change) => !change.removed)
        .map((change) => ({
          changed: change.added,
          text: change.value,
        })),
    },
  ];
}

export function buildUnifiedDiff(left: string, right: string): UnifiedDiffRow[] {
  const blocks = diffLines(
    left.replace(/\r\n?/g, "\n"),
    right.replace(/\r\n?/g, "\n"),
  );
  const rows: UnifiedDiffRow[] = [];

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const lines = linesInBlock(block.value);
    const next = blocks[index + 1];

    if (block.removed && next?.added) {
      const addedLines = linesInBlock(next.value);
      const pairedCount = Math.min(lines.length, addedLines.length);
      for (let line = 0; line < pairedCount; line += 1) {
        rows.push(...replacementRows(lines[line], addedLines[line]));
      }
      rows.push(
        ...lines
          .slice(pairedCount)
          .map((value) => changedLine("removed", value)),
        ...addedLines
          .slice(pairedCount)
          .map((value) => changedLine("added", value)),
      );
      index += 1;
      continue;
    }

    const kind = block.added
      ? "added"
      : block.removed
        ? "removed"
        : "unchanged";
    rows.push(...lines.map((value) => changedLine(kind, value)));
  }

  return rows;
}

function addChanges(
  changes: DiffChange[],
  summary: DiffSummary,
  kind: DiffChange["kind"],
  count: number,
  startLine: number,
) {
  summary[kind] += count;
  for (let index = 0; index < count; index += 1) {
    changes.push({ kind, path: `第 ${startLine + index} 行` });
  }
}

export function compareText(
  left: string,
  right: string,
  options: TextDiffOptions,
): DiffResult {
  const blocks = diffArrays(
    normalizedLines(left, options),
    normalizedLines(right, options),
  );
  const summary: DiffSummary = { added: 0, removed: 0, modified: 0 };
  const changes: DiffChange[] = [];
  let leftLine = 1;
  let rightLine = 1;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index] as ArrayChange<string>;
    const count = block.count ?? block.value.length;

    if (!block.added && !block.removed) {
      leftLine += count;
      rightLine += count;
      continue;
    }

    const next = blocks[index + 1] as ArrayChange<string> | undefined;
    if (block.removed && next?.added) {
      const addedCount = next.count ?? next.value.length;
      const modifiedCount = Math.min(count, addedCount);
      addChanges(changes, summary, "modified", modifiedCount, rightLine);
      addChanges(
        changes,
        summary,
        "removed",
        count - modifiedCount,
        leftLine + modifiedCount,
      );
      addChanges(
        changes,
        summary,
        "added",
        addedCount - modifiedCount,
        rightLine + modifiedCount,
      );
      leftLine += count;
      rightLine += addedCount;
      index += 1;
      continue;
    }

    if (block.removed) {
      addChanges(changes, summary, "removed", count, leftLine);
      leftLine += count;
    } else {
      addChanges(changes, summary, "added", count, rightLine);
      rightLine += count;
    }
  }

  return {
    leftDisplay: left.replace(/\r\n?/g, "\n"),
    rightDisplay: right.replace(/\r\n?/g, "\n"),
    summary,
    changes,
  };
}
