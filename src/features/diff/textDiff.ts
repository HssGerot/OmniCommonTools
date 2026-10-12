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
  changeIndex?: number;
  leftLine?: number;
  rightLine?: number;
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

function documentLines(source: string) {
  const normalized = source.replace(/\r\n?/g, "\n");
  if (normalized === "") {
    return [];
  }
  const lines = normalized.split("\n");
  if (normalized.endsWith("\n")) {
    lines.pop();
  }
  return lines;
}

function normalizedLines(source: string, options: TextDiffOptions) {
  return documentLines(source).map((line) => normalizeLine(line, options));
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

export function buildUnifiedDiff(
  left: string,
  right: string,
  changes?: DiffChange[],
): UnifiedDiffRow[] {
  const blocks = diffLines(
    left.replace(/\r\n?/g, "\n"),
    right.replace(/\r\n?/g, "\n"),
  );
  const rows: UnifiedDiffRow[] = [];
  let leftLine = 1;
  let rightLine = 1;

  for (let index = 0; index < blocks.length; index += 1) {
    const block = blocks[index];
    const lines = linesInBlock(block.value);
    const next = blocks[index + 1];

    if (block.removed && next?.added) {
      const addedLines = linesInBlock(next.value);
      const pairedCount = Math.min(lines.length, addedLines.length);
      for (let line = 0; line < pairedCount; line += 1) {
        const replacement = replacementRows(lines[line], addedLines[line]);
        if (changes) {
          replacement[0].leftLine = leftLine + line;
          replacement[1].rightLine = rightLine + line;
        }
        rows.push(...replacement);
      }
      rows.push(
        ...lines
          .slice(pairedCount)
          .map((value, line) => {
            const row = changedLine("removed", value);
            if (changes) {
              row.leftLine = leftLine + pairedCount + line;
            }
            return row;
          }),
        ...addedLines
          .slice(pairedCount)
          .map((value, line) => {
            const row = changedLine("added", value);
            if (changes) {
              row.rightLine = rightLine + pairedCount + line;
            }
            return row;
          }),
      );
      leftLine += lines.length;
      rightLine += addedLines.length;
      index += 1;
      continue;
    }

    const kind = block.added
      ? "added"
      : block.removed
        ? "removed"
        : "unchanged";
    rows.push(
      ...lines.map((value, line) => {
        const row = changedLine(kind, value);
        if (changes) {
          if (kind !== "added") {
            row.leftLine = leftLine + line;
          }
          if (kind !== "removed") {
            row.rightLine = rightLine + line;
          }
        }
        return row;
      }),
    );
    if (kind !== "added") {
      leftLine += lines.length;
    }
    if (kind !== "removed") {
      rightLine += lines.length;
    }
  }

  if (changes) {
    for (const [changeIndex, change] of changes.entries()) {
      const row = rows.find((candidate) => {
        if (change.kind === "added") {
          return candidate.kind === "added" &&
            candidate.rightLine === change.rightLine;
        }
        return candidate.kind === "removed" &&
          candidate.leftLine === change.leftLine;
      });
      if (row) {
        row.changeIndex = changeIndex;
      }
    }
  }

  return rows;
}

function addChanges(
  changes: DiffChange[],
  summary: DiffSummary,
  kind: DiffChange["kind"],
  count: number,
  leftStart?: number,
  rightStart?: number,
) {
  summary[kind] += count;
  for (let index = 0; index < count; index += 1) {
    const leftLine = leftStart === undefined ? undefined : leftStart + index;
    const rightLine = rightStart === undefined ? undefined : rightStart + index;
    const displayLine = rightLine ?? leftLine ?? 1;
    changes.push({
      kind,
      leftLine,
      path: `第 ${displayLine} 行`,
      rightLine,
    });
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
      addChanges(
        changes,
        summary,
        "modified",
        modifiedCount,
        leftLine,
        rightLine,
      );
      addChanges(
        changes,
        summary,
        "removed",
        count - modifiedCount,
        leftLine + modifiedCount,
        undefined,
      );
      addChanges(
        changes,
        summary,
        "added",
        addedCount - modifiedCount,
        undefined,
        rightLine + modifiedCount,
      );
      leftLine += count;
      rightLine += addedCount;
      index += 1;
      continue;
    }

    if (block.removed) {
      addChanges(changes, summary, "removed", count, leftLine, undefined);
      leftLine += count;
    } else {
      addChanges(changes, summary, "added", count, undefined, rightLine);
      rightLine += count;
    }
  }

  const leftDisplay = left.replace(/\r\n?/g, "\n");
  const rightDisplay = right.replace(/\r\n?/g, "\n");
  return {
    changes,
    leftDisplay,
    leftRender: normalizedLines(leftDisplay, options).join("\n"),
    rightDisplay,
    rightRender: normalizedLines(rightDisplay, options).join("\n"),
    summary,
  };
}
