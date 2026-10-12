import { describe, expect, it } from "vitest";
import { CODEC_METHODS, runCodecMethod } from "./codecEngine";

describe("codec engine", () => {
  it("exposes the requested codec methods without AI placeholders", () => {
    expect(CODEC_METHODS).toHaveLength(24);
    expect(CODEC_METHODS.map((method) => method.label)).not.toContain(
      expect.stringMatching(/AI|智能/),
    );
  });

  it("encodes and decodes URL, Base64, Unicode, UTF16, hex, and HTML locally", async () => {
    await expect(runCodecMethod("url-encode", "a b=中文")).resolves.toEqual({
      ok: true,
      value: "a%20b%3D%E4%B8%AD%E6%96%87",
    });
    await expect(runCodecMethod("url-decode", "a%20b%3D%E4%B8%AD%E6%96%87")).resolves.toEqual({
      ok: true,
      value: "a b=中文",
    });
    await expect(runCodecMethod("base64-encode", "中文")).resolves.toEqual({
      ok: true,
      value: "5Lit5paH",
    });
    await expect(runCodecMethod("base64-decode", "5Lit5paH")).resolves.toEqual({
      ok: true,
      value: "中文",
    });
    await expect(runCodecMethod("unicode-encode", "A中")).resolves.toEqual({
      ok: true,
      value: "A\\u4e2d",
    });
    await expect(runCodecMethod("unicode-decode", "A\\u4e2d")).resolves.toEqual({
      ok: true,
      value: "A中",
    });
    await expect(runCodecMethod("utf16-encode", "A中")).resolves.toEqual({
      ok: true,
      value: "\\u0041\\u4e2d",
    });
    await expect(runCodecMethod("utf16-decode", "\\u0041\\u4e2d")).resolves.toEqual({
      ok: true,
      value: "A中",
    });
    await expect(runCodecMethod("hex-encode", "AB中")).resolves.toEqual({
      ok: true,
      value: "41 42 e4 b8 ad",
    });
    await expect(runCodecMethod("hex-ascii-decode", "41 42 e4 b8 ad")).resolves.toEqual({
      ok: true,
      value: "AB中",
    });
    await expect(runCodecMethod("html-entity-decode", "&lt;b&gt;&#20013;&lt;/b&gt;")).resolves.toEqual({
      ok: true,
      value: "<b>中</b>",
    });
  });

  it("calculates MD5 and SHA1 digests", async () => {
    await expect(runCodecMethod("md5", "abc")).resolves.toEqual({
      ok: true,
      value: "900150983cd24fb0d6963f7d28e17f72",
    });
    await expect(runCodecMethod("sha1", "abc")).resolves.toEqual({
      ok: true,
      value: "a9993e364706816aba3e25717850c26c9cd0d89d",
    });
  });

  it("parses structured developer formats without verifying signatures or schemas", async () => {
    const jwt =
      "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMiLCJuYW1lIjoi5byg5LiJIn0.signature";

    await expect(runCodecMethod("jwt-decode", jwt)).resolves.toEqual({
      ok: true,
      value:
        '{\n  "header": {\n    "alg": "HS256"\n  },\n  "payload": {\n    "sub": "123",\n    "name": "张三"\n  },\n  "signature": "signature"\n}',
    });
    await expect(runCodecMethod("url-params-parse", "?a=1&a=2&b=中文")).resolves.toEqual({
      ok: true,
      value: '{\n  "a": [\n    "1",\n    "2"\n  ],\n  "b": "中文"\n}',
    });
    await expect(runCodecMethod("cookie-format", "sid=abc; theme=dark")).resolves.toEqual({
      ok: true,
      value: '{\n  "sid": "abc",\n  "theme": "dark"\n}',
    });
    await expect(runCodecMethod("proto-hex-parse", "7b226f6b223a747275657d")).resolves.toEqual({
      ok: true,
      value:
        '{\n  "bytes": [\n    {\n      "offset": 0,\n      "hex": "7b",\n      "decimal": 123,\n      "ascii": "{"\n    },\n    {\n      "offset": 1,\n      "hex": "22",\n      "decimal": 34,\n      "ascii": "\\""\n    },\n    {\n      "offset": 2,\n      "hex": "6f",\n      "decimal": 111,\n      "ascii": "o"\n    },\n    {\n      "offset": 3,\n      "hex": "6b",\n      "decimal": 107,\n      "ascii": "k"\n    },\n    {\n      "offset": 4,\n      "hex": "22",\n      "decimal": 34,\n      "ascii": "\\""\n    },\n    {\n      "offset": 5,\n      "hex": "3a",\n      "decimal": 58,\n      "ascii": ":"\n    },\n    {\n      "offset": 6,\n      "hex": "74",\n      "decimal": 116,\n      "ascii": "t"\n    },\n    {\n      "offset": 7,\n      "hex": "72",\n      "decimal": 114,\n      "ascii": "r"\n    },\n    {\n      "offset": 8,\n      "hex": "75",\n      "decimal": 117,\n      "ascii": "u"\n    },\n    {\n      "offset": 9,\n      "hex": "65",\n      "decimal": 101,\n      "ascii": "e"\n    },\n    {\n      "offset": 10,\n      "hex": "7d",\n      "decimal": 125,\n      "ascii": "}"\n    }\n  ],\n  "utf8": "{\\"ok\\":true}",\n  "json": {\n    "ok": true\n  }\n}',
    });
  });

  it("returns actionable failures for invalid input and unsupported browser streams", async () => {
    await expect(runCodecMethod("base64-decode", "%%%")).resolves.toMatchObject({
      ok: false,
      message: expect.stringContaining("Base64"),
    });
    await expect(runCodecMethod("jwt-decode", "not.jwt")).resolves.toMatchObject({
      ok: false,
      message: expect.stringContaining("JWT"),
    });
  });
});
