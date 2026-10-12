export type DiffChangeKind = "added" | "removed" | "modified";

export interface DiffSummary {
  added: number;
  removed: number;
  modified: number;
}

export interface DiffChange {
  kind: DiffChangeKind;
  path: string;
}

export interface DiffResult {
  leftDisplay: string;
  rightDisplay: string;
  summary: DiffSummary;
  changes: DiffChange[];
}

export interface JsonFailure {
  ok: false;
  side: "A" | "B";
  message: string;
  line: number;
  column: number;
}
