export type ToolCategory = "format" | "diff" | "time";

export interface ToolDefinition {
  id: "json-formatter" | "text-json-diff" | "timestamp-converter" | "codec";
  name: string;
  description: string;
  category: ToolCategory;
  keywords: readonly string[];
  route: string;
  order: number;
}

export type ToolCategoryFilter = ToolCategory | "all";
