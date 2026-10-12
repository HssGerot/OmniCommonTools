import { describe, expect, it } from "vitest";
import { compareJson } from "./jsonDiff";
import { buildUnifiedDiff, compareText } from "./textDiff";

describe("text diff engine", () => {
  it("normalizes line endings and optional whitespace without deleting separators", () => {
    expect(
      compareText("first\r\nsecond", "first\nsecond", {
        ignoreWhitespace: false,
        ignoreCase: false,
      }).summary,
    ).toEqual({ added: 0, removed: 0, modified: 0 });

    expect(
      compareText("a   b", " a b ", {
        ignoreWhitespace: true,
        ignoreCase: false,
      }).summary,
    ).toEqual({ added: 0, removed: 0, modified: 0 });
    expect(
      compareText("a b", "ab", {
        ignoreWhitespace: true,
        ignoreCase: false,
      }).summary.modified,
    ).toBe(1);
  });

  it("supports case-insensitive comparison without changing display text", () => {
    const result = compareText("Hello\nKeep", "hello\nKeep", {
      ignoreWhitespace: false,
      ignoreCase: true,
    });

    expect(result.summary).toEqual({ added: 0, removed: 0, modified: 0 });
    expect(result.leftDisplay).toBe("Hello\nKeep");
    expect(result.rightDisplay).toBe("hello\nKeep");
  });

  it("counts paired line replacements as modifications and preserves direction", () => {
    const forward = compareText("same\nold\nremoved", "same\nnew\nadded", {
      ignoreWhitespace: false,
      ignoreCase: false,
    });
    const reversed = compareText("same\nnew\nextra", "same\nnew", {
      ignoreWhitespace: false,
      ignoreCase: false,
    });

    expect(forward.summary).toEqual({ added: 0, removed: 0, modified: 2 });
    expect(forward.changes).toEqual([
      {
        kind: "modified",
        leftLine: 2,
        path: "第 2 行",
        rightLine: 2,
      },
      {
        kind: "modified",
        leftLine: 3,
        path: "第 3 行",
        rightLine: 3,
      },
    ]);
    expect(reversed.summary).toEqual({ added: 0, removed: 1, modified: 0 });
  });

  it("treats empty documents as having no virtual line", () => {
    const added = compareText("", "x", {
      ignoreWhitespace: false,
      ignoreCase: false,
    });
    const removed = compareText("x", "", {
      ignoreWhitespace: false,
      ignoreCase: false,
    });

    expect(added.summary).toEqual({ added: 1, removed: 0, modified: 0 });
    expect(added.changes).toEqual([
      expect.objectContaining({
        kind: "added",
        leftLine: undefined,
        rightLine: 1,
      }),
    ]);
    expect(removed.summary).toEqual({ added: 0, removed: 1, modified: 0 });
    expect(removed.changes).toEqual([
      expect.objectContaining({
        kind: "removed",
        leftLine: 1,
        rightLine: undefined,
      }),
    ]);
    expect(
      compareText("", "", {
        ignoreWhitespace: false,
        ignoreCase: false,
      }).summary,
    ).toEqual({ added: 0, removed: 0, modified: 0 });
  });

  it("does not count a trailing newline as a virtual empty-line change", () => {
    expect(
      compareText("", "x\n", {
        ignoreWhitespace: false,
        ignoreCase: false,
      }).summary,
    ).toEqual({ added: 1, removed: 0, modified: 0 });
    expect(
      compareText("x\n", "", {
        ignoreWhitespace: false,
        ignoreCase: false,
      }).summary,
    ).toEqual({ added: 0, removed: 1, modified: 0 });
    expect(
      compareText("x", "x\n", {
        ignoreWhitespace: false,
        ignoreCase: false,
      }).summary,
    ).toEqual({ added: 0, removed: 0, modified: 0 });
  });

  it("builds a unified line view with word-level replacement markers", () => {
    expect(buildUnifiedDiff("same\nold value", "same\nnew value")).toEqual([
      {
        kind: "unchanged",
        segments: [{ changed: false, text: "same" }],
      },
      {
        kind: "removed",
        segments: [
          { changed: true, text: "old" },
          { changed: false, text: " value" },
        ],
      },
      {
        kind: "added",
        segments: [
          { changed: true, text: "new" },
          { changed: false, text: " value" },
        ],
      },
    ]);
  });
});

describe("JSON diff engine", () => {
  it("ignores object key order, preserves array order, and compares types", () => {
    expect(compareJson('{"a":1,"b":2}', '{"b":2,"a":1}')).toMatchObject({
      summary: { added: 0, removed: 0, modified: 0 },
    });
    expect(compareJson('{"a":[1,2]}', '{"a":[2,1]}')).toMatchObject({
      summary: { added: 0, removed: 0, modified: 2 },
    });
    expect(compareJson('{"a":"1"}', '{"a":1}')).toMatchObject({
      summary: { added: 0, removed: 0, modified: 1 },
    });
  });

  it("preserves decimal text and distinguishes lossless large numbers", () => {
    const equal = compareJson(
      '{"id":9007199254740993}',
      '{"id":9007199254740993}',
    );
    const changed = compareJson(
      '{"id":9007199254740993}',
      '{"id":9007199254740994}',
    );

    expect(equal).toMatchObject({
      summary: { added: 0, removed: 0, modified: 0 },
    });
    expect(equal).toHaveProperty(
      "leftDisplay",
      expect.stringContaining("9007199254740993"),
    );
    expect(changed).toMatchObject({
      summary: { added: 0, removed: 0, modified: 1 },
      changes: [{ kind: "modified", path: "$.id" }],
    });
  });

  it("counts missing object keys and array entries by direction", () => {
    expect(compareJson('{"keep":1,"gone":2}', '{"keep":1,"new":3}')).toMatchObject(
      {
        summary: { added: 1, removed: 1, modified: 0 },
      },
    );
    expect(compareJson("[1,2]", "[1,2,3]")).toMatchObject({
      summary: { added: 1, removed: 0, modified: 0 },
      changes: [{ kind: "added", path: "$[2]" }],
    });
  });

  it("provides exact formatted lines for arrays, repeated keys, and deletions", () => {
    expect(compareJson("[1,2]", "[1,2,3]")).toMatchObject({
      changes: [
        {
          kind: "added",
          path: "$[2]",
          leftLine: undefined,
          rightLine: 4,
        },
      ],
    });

    expect(
      compareJson(
        '{"left":{"id":1},"right":{"id":2}}',
        '{"left":{"id":1},"right":{"id":3}}',
      ),
    ).toMatchObject({
      changes: [
        {
          kind: "modified",
          path: "$.right.id",
          leftLine: 6,
          rightLine: 6,
        },
      ],
    });

    expect(
      compareJson(
        '{"nested":{"gone":1,"keep":2}}',
        '{"nested":{"keep":2}}',
      ),
    ).toMatchObject({
      changes: [
        {
          kind: "removed",
          path: "$.nested.gone",
          leftLine: 3,
          rightLine: undefined,
        },
      ],
    });
  });

  it("returns side-specific one-based locations for strict JSON errors", () => {
    expect(compareJson('{\n  "a": 1,\n}', '{"a":1}')).toMatchObject({
      ok: false,
      side: "A",
      line: 3,
    });
    expect(compareJson('{"a":1}', '{\n  "a": NaN\n}')).toMatchObject({
      ok: false,
      side: "B",
      line: 2,
    });
  });
});
