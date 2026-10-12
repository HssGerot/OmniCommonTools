import { expect, it, vi } from "vitest";
import { fromDateTime, fromTimestamp } from "./timeEngine";

it("auto-detects only 10-digit seconds and 13-digit milliseconds", () => {
  expect(fromTimestamp("1791775608", "auto", "Asia/Shanghai")).toMatchObject({
    ok: true,
  });
  expect(
    fromTimestamp("1791775608123", "auto", "Asia/Shanghai"),
  ).toMatchObject({ ok: true });
  expect(fromTimestamp("12345", "auto", "Asia/Shanghai")).toMatchObject({
    ok: false,
    code: "invalid",
  });
});

it("supports zero, negative values, DST gaps, and DST overlaps", () => {
  expect(fromTimestamp("0", "seconds", "UTC")).toMatchObject({
    epochSeconds: "0",
  });
  expect(fromTimestamp("-1", "seconds", "UTC")).toMatchObject({
    epochMilliseconds: "-1000",
  });
  expect(
    fromDateTime("2026-03-08 02:30:00.000", "America/Los_Angeles"),
  ).toMatchObject({ ok: false, code: "nonexistent" });
  expect(
    fromDateTime("2026-11-01 01:30:00.000", "America/Los_Angeles"),
  ).toMatchObject({ ok: false, code: "ambiguous" });
});

it("parses the local format strictly and accepts ISO 8601 only with an offset", () => {
  expect(
    fromDateTime("2026-10-12 09:30:45.123", "Asia/Shanghai"),
  ).toMatchObject({
    ok: true,
    epochMilliseconds: "1791768645123",
    iso: "2026-10-12T01:30:45.123Z",
  });
  expect(
    fromDateTime("2026-10-12T09:30:45.123+08:00", "UTC"),
  ).toMatchObject({
    ok: true,
    epochMilliseconds: "1791768645123",
    zoned: "2026-10-12 01:30:45.123 UTC",
  });
  expect(fromDateTime("2026-10-12T09:30:45.123", "UTC")).toMatchObject({
    ok: false,
    code: "invalid",
  });
  expect(fromDateTime("2026-2-3 04:05:06.007", "UTC")).toMatchObject({
    ok: false,
    code: "invalid",
  });
  expect(fromDateTime(" 2026-02-03 04:05:06.007 ", "UTC")).toMatchObject({
    ok: false,
    code: "invalid",
  });
});

it("returns both overlap offsets and resolves the selected candidate", () => {
  const ambiguous = fromDateTime(
    "2026-11-01 01:30:00.000",
    "America/Los_Angeles",
  );

  expect(ambiguous).toMatchObject({ ok: false, code: "ambiguous" });
  if (ambiguous.ok) {
    throw new Error("Expected an ambiguous local time");
  }
  expect(ambiguous.message).toContain("-07:00");
  expect(ambiguous.message).toContain("-08:00");

  const earlier = fromDateTime(
    "2026-11-01 01:30:00.000",
    "America/Los_Angeles",
    "-07:00",
  );
  const later = fromDateTime(
    "2026-11-01 01:30:00.000",
    "America/Los_Angeles",
    "-08:00",
  );

  expect(earlier).toMatchObject({
    ok: true,
    iso: "2026-11-01T08:30:00.000Z",
  });
  expect(later).toMatchObject({
    ok: true,
    iso: "2026-11-01T09:30:00.000Z",
  });
  expect(
    fromDateTime(
      "2026-11-01 01:30:00.000",
      "America/Los_Angeles",
      "+00:00",
    ),
  ).toMatchObject({ ok: false, code: "ambiguous" });
});

it("rejects malformed timestamps, unsafe ranges, and invalid IANA zones", () => {
  for (const value of ["", "1.5", "+1", " 0", "0 ", "1e3"]) {
    expect(fromTimestamp(value, "seconds", "UTC")).toMatchObject({
      ok: false,
      code: "invalid",
    });
  }

  expect(
    fromTimestamp("9007199254740992", "milliseconds", "UTC"),
  ).toMatchObject({ ok: false, code: "invalid" });
  expect(fromTimestamp("0", "seconds", "Mars/Olympus_Mons")).toMatchObject({
    ok: false,
    code: "invalid",
  });
  expect(
    fromDateTime("2026-10-12 09:30:45.123", "Mars/Olympus_Mons"),
  ).toMatchObject({ ok: false, code: "invalid" });
});

it("formats fractional and relative results without losing milliseconds", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-12T01:30:44.000Z"));

  const result = fromTimestamp("1791768645123", "milliseconds", "UTC");

  expect(result).toMatchObject({
    ok: true,
    epochSeconds: "1791768645.123",
    epochMilliseconds: "1791768645123",
    utc: "2026-10-12 01:30:45.123 UTC",
    iso: "2026-10-12T01:30:45.123Z",
  });
  expect(result.ok && result.relative).toBe("1 秒后");
  vi.useRealTimers();
});
