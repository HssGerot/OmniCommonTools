export type CodecMethodId =
  | "unicode-encode"
  | "url-encode"
  | "utf16-encode"
  | "base64-encode"
  | "md5"
  | "hex-encode"
  | "sha1"
  | "html-encode"
  | "html-deep-encode"
  | "html-to-js"
  | "gzip-compress"
  | "string-escape"
  | "unicode-decode"
  | "url-decode"
  | "utf16-decode"
  | "base64-decode"
  | "hex-ascii-decode"
  | "proto-hex-parse"
  | "html-entity-decode"
  | "url-params-parse"
  | "jwt-decode"
  | "cookie-format"
  | "gzip-decompress"
  | "string-unescape";

export interface CodecMethod {
  id: CodecMethodId;
  label: string;
  group: "encode" | "decode";
  description: string;
}

export type CodecResult =
  | { ok: true; value: string }
  | { ok: false; message: string };

export const CODEC_METHODS: readonly CodecMethod[] = [
  {
    id: "unicode-encode",
    label: "Unicode 编码",
    group: "encode",
    description: "仅将非 ASCII 字符转换为 \\uXXXX。",
  },
  {
    id: "url-encode",
    label: "URL 编码",
    group: "encode",
    description: "按 encodeURIComponent 规则转义 URL 片段。",
  },
  {
    id: "utf16-encode",
    label: "UTF16 编码",
    group: "encode",
    description: "将每个 UTF-16 码元输出为 \\uXXXX。",
  },
  {
    id: "base64-encode",
    label: "Base64 编码",
    group: "encode",
    description: "使用 UTF-8 字节进行 Base64 编码。",
  },
  {
    id: "md5",
    label: "MD5 计算",
    group: "encode",
    description: "输出 MD5 摘要，不用于安全签名。",
  },
  {
    id: "hex-encode",
    label: "十六进制编码",
    group: "encode",
    description: "将 UTF-8 字节输出为十六进制。",
  },
  {
    id: "sha1",
    label: "SHA1 加密",
    group: "encode",
    description: "输出 SHA-1 摘要，不用于安全签名。",
  },
  {
    id: "html-encode",
    label: "HTML 普通编码",
    group: "encode",
    description: "转义 HTML 关键字符。",
  },
  {
    id: "html-deep-encode",
    label: "HTML 深度编码",
    group: "encode",
    description: "将全部字符转换为 HTML 十六进制实体。",
  },
  {
    id: "html-to-js",
    label: "HTML 转 JS",
    group: "encode",
    description: "转换为可粘贴到 JavaScript 的字符串字面量。",
  },
  {
    id: "gzip-compress",
    label: "Gzip 压缩",
    group: "encode",
    description: "使用浏览器 CompressionStream 压缩并输出 Base64。",
  },
  {
    id: "string-escape",
    label: "字符串转义",
    group: "encode",
    description: "按 JSON 字符串规则转义。",
  },
  {
    id: "unicode-decode",
    label: "Unicode 解码",
    group: "decode",
    description: "还原 \\uXXXX Unicode 转义。",
  },
  {
    id: "url-decode",
    label: "URL 解码",
    group: "decode",
    description: "按 decodeURIComponent 规则还原 URL 片段。",
  },
  {
    id: "utf16-decode",
    label: "UTF16 解码",
    group: "decode",
    description: "还原连续的 \\uXXXX UTF-16 码元。",
  },
  {
    id: "base64-decode",
    label: "Base64 解码",
    group: "decode",
    description: "将 Base64 按 UTF-8 文本解码。",
  },
  {
    id: "hex-ascii-decode",
    label: "Hex/ASCII 解码",
    group: "decode",
    description: "将十六进制字节还原为 UTF-8 文本。",
  },
  {
    id: "proto-hex-parse",
    label: "Proto Hex 解析",
    group: "decode",
    description: "按通用字节表查看 Proto Hex，不依赖 schema。",
  },
  {
    id: "html-entity-decode",
    label: "HTML 实体解码",
    group: "decode",
    description: "还原常见命名实体和数字实体。",
  },
  {
    id: "url-params-parse",
    label: "URL 参数解析",
    group: "decode",
    description: "将查询参数转换为 JSON，重复键输出数组。",
  },
  {
    id: "jwt-decode",
    label: "JWT 解码",
    group: "decode",
    description: "仅解析 Header 和 Payload，不验证签名。",
  },
  {
    id: "cookie-format",
    label: "Cookie 格式化",
    group: "decode",
    description: "将 Cookie 字符串转换为 JSON。",
  },
  {
    id: "gzip-decompress",
    label: "Gzip 解压",
    group: "decode",
    description: "读取 Base64 Gzip 数据并输出文本。",
  },
  {
    id: "string-unescape",
    label: "字符串去转义",
    group: "decode",
    description: "还原 JSON 字符串转义。",
  },
];

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

function success(value: string): CodecResult {
  return { ok: true, value };
}

function failure(message: string): CodecResult {
  return { ok: false, message };
}

function toHexByte(value: number) {
  return value.toString(16).padStart(2, "0");
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
}

function base64ToBytes(value: string) {
  const normalized = value.trim();
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized) || normalized.length % 4 === 1) {
    throw new Error("Base64 格式无效");
  }
  const binary = atob(normalized);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function base64UrlToBytes(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  return base64ToBytes(padded);
}

function parseHexBytes(value: string) {
  const compact = value.replace(/(?:0x|\\x)/gi, "").replace(/[\s,;:-]/g, "");
  if (!compact || compact.length % 2 !== 0 || /[^0-9a-f]/i.test(compact)) {
    throw new Error("十六进制内容必须由成对的 0-9/a-f 字节组成");
  }
  const bytes = new Uint8Array(compact.length / 2);
  for (let index = 0; index < compact.length; index += 2) {
    bytes[index / 2] = Number.parseInt(compact.slice(index, index + 2), 16);
  }
  return bytes;
}

function unicodeEncode(value: string) {
  return Array.from(value)
    .map((char) => {
      if (/^[\x20-\x7e]$/.test(char)) {
        return char;
      }
      return Array.from(char)
        .map((unit) => `\\u${unit.charCodeAt(0).toString(16).padStart(4, "0")}`)
        .join("");
    })
    .join("");
}

function utf16Encode(value: string) {
  let output = "";
  for (let index = 0; index < value.length; index += 1) {
    output += `\\u${value.charCodeAt(index).toString(16).padStart(4, "0")}`;
  }
  return output;
}

function decodeUnicodeEscapes(value: string) {
  return value.replace(/\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g, (_, point, unit) =>
    String.fromCodePoint(Number.parseInt(point ?? unit, 16)),
  );
}

function htmlEncode(value: string) {
  const entities: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  };
  return value.replace(/[&<>"']/g, (char) => entities[char]);
}

function htmlDeepEncode(value: string) {
  return Array.from(value)
    .map((char) => `&#x${char.codePointAt(0)?.toString(16) ?? "0"};`)
    .join("");
}

function htmlEntityDecode(value: string) {
  const named: Record<string, string> = {
    amp: "&",
    gt: ">",
    lt: "<",
    nbsp: "\u00a0",
    quot: '"',
    apos: "'",
    "#39": "'",
  };

  return value.replace(/&(#x[0-9a-fA-F]+|#\d+|[a-zA-Z][a-zA-Z0-9]+);/g, (entity, key) => {
    if (key.startsWith("#x")) {
      return String.fromCodePoint(Number.parseInt(key.slice(2), 16));
    }
    if (key.startsWith("#")) {
      return String.fromCodePoint(Number.parseInt(key.slice(1), 10));
    }
    return named[key] ?? entity;
  });
}

function stringEscape(value: string) {
  return JSON.stringify(value).slice(1, -1);
}

function stringUnescape(value: string) {
  return JSON.parse(`"${value.replace(/"/g, '\\"')}"`) as string;
}

function parseUrlParams(value: string) {
  const query = value.includes("?") ? value.slice(value.indexOf("?") + 1) : value;
  const params = new URLSearchParams(query.replace(/^#/, ""));
  const result: Record<string, string | string[]> = {};
  for (const [key, item] of params.entries()) {
    const current = result[key];
    if (current === undefined) {
      result[key] = item;
    } else if (Array.isArray(current)) {
      current.push(item);
    } else {
      result[key] = [current, item];
    }
  }
  return JSON.stringify(result, null, 2);
}

function formatCookie(value: string) {
  const result: Record<string, string> = {};
  for (const part of value.split(";")) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      result[trimmed] = "";
    } else {
      result[trimmed.slice(0, separator).trim()] = trimmed
        .slice(separator + 1)
        .trim();
    }
  }
  return JSON.stringify(result, null, 2);
}

function parseJwt(value: string) {
  const parts = value.trim().split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error("JWT 必须包含 header、payload 和 signature 三段");
  }
  const header = JSON.parse(textDecoder.decode(base64UrlToBytes(parts[0])));
  const payload = JSON.parse(textDecoder.decode(base64UrlToBytes(parts[1])));
  return JSON.stringify(
    {
      header,
      payload,
      signature: parts[2],
    },
    null,
    2,
  );
}

function parseProtoHex(value: string) {
  const bytes = parseHexBytes(value);
  const utf8 = textDecoder.decode(bytes);
  let json: unknown;
  try {
    json = JSON.parse(utf8);
  } catch {
    json = undefined;
  }
  return JSON.stringify(
    {
      bytes: [...bytes].map((byte, offset) => ({
        offset,
        hex: toHexByte(byte),
        decimal: byte,
        ascii: byte >= 32 && byte <= 126 ? String.fromCharCode(byte) : ".",
      })),
      utf8,
      ...(json === undefined ? {} : { json }),
    },
    null,
    2,
  );
}

async function gzipCompress(value: string) {
  if (typeof CompressionStream === "undefined") {
    throw new Error("当前浏览器不支持 CompressionStream，无法执行 Gzip 压缩");
  }
  const stream = new Blob([textEncoder.encode(value)])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  return bytesToBase64(new Uint8Array(await new Response(stream).arrayBuffer()));
}

async function gzipDecompress(value: string) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("当前浏览器不支持 DecompressionStream，无法执行 Gzip 解压");
  }
  const stream = new Blob([base64ToBytes(value)])
    .stream()
    .pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

async function sha1(value: string) {
  const digest = await crypto.subtle.digest("SHA-1", textEncoder.encode(value));
  return [...new Uint8Array(digest)].map(toHexByte).join("");
}

function add32(left: number, right: number) {
  return (left + right) & 0xffffffff;
}

function rotateLeft(value: number, shift: number) {
  return (value << shift) | (value >>> (32 - shift));
}

function md5(value: string) {
  const bytes = [...textEncoder.encode(value)];
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) {
    bytes.push(0);
  }
  for (let index = 0; index < 8; index += 1) {
    bytes.push(Math.floor(bitLength / 2 ** (8 * index)) & 0xff);
  }

  let a0 = 0x67452301;
  let b0 = 0xefcdab89;
  let c0 = 0x98badcfe;
  let d0 = 0x10325476;
  const shifts = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21,
  ];
  const constants = Array.from({ length: 64 }, (_, index) =>
    Math.floor(Math.abs(Math.sin(index + 1)) * 2 ** 32),
  );

  for (let chunkOffset = 0; chunkOffset < bytes.length; chunkOffset += 64) {
    const words = Array.from({ length: 16 }, (_, index) => {
      const offset = chunkOffset + index * 4;
      return (
        bytes[offset] |
        (bytes[offset + 1] << 8) |
        (bytes[offset + 2] << 16) |
        (bytes[offset + 3] << 24)
      );
    });

    let a = a0;
    let b = b0;
    let c = c0;
    let d = d0;

    for (let index = 0; index < 64; index += 1) {
      let f: number;
      let g: number;
      if (index < 16) {
        f = (b & c) | (~b & d);
        g = index;
      } else if (index < 32) {
        f = (d & b) | (~d & c);
        g = (5 * index + 1) % 16;
      } else if (index < 48) {
        f = b ^ c ^ d;
        g = (3 * index + 5) % 16;
      } else {
        f = c ^ (b | ~d);
        g = (7 * index) % 16;
      }
      const next = d;
      d = c;
      c = b;
      b = add32(
        b,
        rotateLeft(add32(add32(a, f), add32(constants[index], words[g])), shifts[index]),
      );
      a = next;
    }

    a0 = add32(a0, a);
    b0 = add32(b0, b);
    c0 = add32(c0, c);
    d0 = add32(d0, d);
  }

  return [a0, b0, c0, d0]
    .flatMap((word) => [
      word & 0xff,
      (word >>> 8) & 0xff,
      (word >>> 16) & 0xff,
      (word >>> 24) & 0xff,
    ])
    .map(toHexByte)
    .join("");
}

async function transform(methodId: CodecMethodId, input: string) {
  switch (methodId) {
    case "unicode-encode":
      return unicodeEncode(input);
    case "url-encode":
      return encodeURIComponent(input);
    case "utf16-encode":
      return utf16Encode(input);
    case "base64-encode":
      return bytesToBase64(textEncoder.encode(input));
    case "md5":
      return md5(input);
    case "hex-encode":
      return [...textEncoder.encode(input)].map(toHexByte).join(" ");
    case "sha1":
      return await sha1(input);
    case "html-encode":
      return htmlEncode(input);
    case "html-deep-encode":
      return htmlDeepEncode(input);
    case "html-to-js":
      return JSON.stringify(input);
    case "gzip-compress":
      return await gzipCompress(input);
    case "string-escape":
      return stringEscape(input);
    case "unicode-decode":
    case "utf16-decode":
      return decodeUnicodeEscapes(input);
    case "url-decode":
      return decodeURIComponent(input);
    case "base64-decode":
      return textDecoder.decode(base64ToBytes(input), { stream: false });
    case "hex-ascii-decode":
      return textDecoder.decode(parseHexBytes(input));
    case "proto-hex-parse":
      return parseProtoHex(input);
    case "html-entity-decode":
      return htmlEntityDecode(input);
    case "url-params-parse":
      return parseUrlParams(input);
    case "jwt-decode":
      return parseJwt(input);
    case "cookie-format":
      return formatCookie(input);
    case "gzip-decompress":
      return await gzipDecompress(input);
    case "string-unescape":
      return stringUnescape(input);
  }
}

export async function runCodecMethod(
  methodId: CodecMethodId,
  input: string,
): Promise<CodecResult> {
  try {
    return success(await transform(methodId, input));
  } catch (error) {
    const message = error instanceof Error ? error.message : "转换失败";
    return failure(message || "转换失败");
  }
}
