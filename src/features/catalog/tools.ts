import type { ToolDefinition } from "./types";

export const TOOLS: readonly ToolDefinition[] = [
  {
    id: "json-formatter",
    name: "JSON 美化",
    description: "格式化、校验并清晰查看 JSON 数据。",
    category: "format",
    keywords: ["JSON", "格式化", "美化", "校验"],
    route: "/tools/json-formatter",
    order: 1,
  },
  {
    id: "text-json-diff",
    name: "文本 / JSON Diff",
    description: "并排或统一比较文本与 JSON 的差异。",
    category: "diff",
    keywords: ["JSON", "文本", "对比", "差异", "Diff"],
    route: "/tools/text-json-diff",
    order: 2,
  },
  {
    id: "timestamp-converter",
    name: "时间戳转换",
    description: "在秒、毫秒、日期时间和时区之间转换。",
    category: "time",
    keywords: ["时间戳", "秒", "毫秒", "日期", "时区"],
    route: "/tools/timestamp-converter",
    order: 3,
  },
];
