import { filterTools } from "./search";
import { TOOLS } from "./tools";

it("filters by category and normalized search text", () => {
  expect(filterTools(TOOLS, "JSON", "diff")).toHaveLength(1);
  expect(filterTools(TOOLS, "毫秒", "all").map((tool) => tool.id)).toEqual([
    "timestamp-converter",
  ]);
  expect(filterTools(TOOLS, "Base64", "format").map((tool) => tool.id)).toEqual([
    "codec",
  ]);
});
