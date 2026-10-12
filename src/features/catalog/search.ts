import type {
  ToolCategoryFilter,
  ToolDefinition,
} from "./types";

function normalize(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function filterTools(
  tools: readonly ToolDefinition[],
  query: string,
  category: ToolCategoryFilter,
) {
  const normalizedQuery = normalize(query);

  return tools
    .filter((tool) => category === "all" || tool.category === category)
    .filter((tool) => {
      if (!normalizedQuery) {
        return true;
      }

      return normalize(
        [tool.name, tool.description, ...tool.keywords].join(" "),
      ).includes(normalizedQuery);
    })
    .sort((left, right) => left.order - right.order);
}
