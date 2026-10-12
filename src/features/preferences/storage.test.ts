import type { ToolDefinition } from "../catalog/types";
import {
  createPreferenceStore,
  STORAGE_KEY,
  type StorageLike,
} from "./storage";

function createMemoryStorage(initialValue?: string): StorageLike {
  const values = new Map<string, string>();

  if (initialValue !== undefined) {
    values.set(STORAGE_KEY, initialValue);
  }

  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

it("stores only approved preference fields", () => {
  const memoryStorage = createMemoryStorage();
  const store = createPreferenceStore(memoryStorage);

  store.toggleFavorite("json-formatter");
  store.markRecent("json-formatter", 123);

  expect(JSON.parse(memoryStorage.getItem(STORAGE_KEY)!)).toEqual({
    favorites: ["json-formatter"],
    recent: [{ toolId: "json-formatter", usedAt: 123 }],
    settings: {},
    theme: "system",
  });
});

it("discards unknown tool IDs and caps recent entries at five", () => {
  const memoryStorage = createMemoryStorage(
    JSON.stringify({
      favorites: ["unknown-tool", "text-json-diff"],
      recent: [
        { toolId: "unknown-tool", usedAt: 99 },
        { toolId: "json-formatter", usedAt: 1 },
      ],
      secretInput: "must not persist",
      settings: { diffView: "side-by-side", unknownSetting: true },
      theme: "dark",
    }),
  );
  const store = createPreferenceStore(memoryStorage);
  const toolIds: ToolDefinition["id"][] = [
    "json-formatter",
    "text-json-diff",
    "timestamp-converter",
    "json-formatter",
    "text-json-diff",
    "timestamp-converter",
  ];

  toolIds.forEach((toolId, index) => store.markRecent(toolId, index + 10));

  expect(store.getSnapshot()).toEqual({
    favorites: ["text-json-diff"],
    recent: [
      { toolId: "timestamp-converter", usedAt: 15 },
      { toolId: "text-json-diff", usedAt: 14 },
      { toolId: "json-formatter", usedAt: 13 },
    ],
    settings: { diffView: "side-by-side" },
    theme: "dark",
  });
  expect(JSON.parse(memoryStorage.getItem(STORAGE_KEY)!)).not.toHaveProperty(
    "secretInput",
  );
});
