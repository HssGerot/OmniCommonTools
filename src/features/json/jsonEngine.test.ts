import { describe, expect, it } from "vitest";
import { formatJson, minifyJson } from "./jsonEngine";

describe("JSON engine", () => {
  it("preserves unsafe integer text while formatting and minifying", () => {
    const source = '{"id":9007199254740993,"nested":{"z":1,"a":2}}';

    expect(formatJson(source, 2, true)).toEqual({
      ok: true,
      value:
        '{\n  "id": 9007199254740993,\n  "nested": {\n    "a": 2,\n    "z": 1\n  }\n}',
    });
    expect(minifyJson(source, false)).toEqual({
      ok: true,
      value: '{"id":9007199254740993,"nested":{"z":1,"a":2}}',
    });
  });

  it("sorts nested object keys without reordering arrays", () => {
    const source = '{"z":[{"b":2,"a":1},3],"a":true}';

    expect(formatJson(source, "tab", true)).toEqual({
      ok: true,
      value:
        '{\n\t"a": true,\n\t"z": [\n\t\t{\n\t\t\t"a": 1,\n\t\t\t"b": 2\n\t\t},\n\t\t3\n\t]\n}',
    });
  });

  it("returns one-based line and column for malformed strict JSON", () => {
    const result = formatJson('{\n  "a": 1\n  "b": 2\n}', 2, false);

    expect(result).toMatchObject({
      ok: false,
      line: 3,
    });
    if (!result.ok) {
      expect(result.column).toBeGreaterThanOrEqual(1);
      expect(result.message).not.toContain('"a"');
      expect(result.message).not.toContain('"b"');
    }
  });

  it("rejects JSON extensions and reports the first line", () => {
    expect(minifyJson('{"value": NaN}', false)).toMatchObject({
      ok: false,
      line: 1,
    });
  });
});
