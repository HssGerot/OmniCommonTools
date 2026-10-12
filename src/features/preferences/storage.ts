import type { ToolDefinition } from "../catalog/types";

export const STORAGE_KEY = "omni-common-tools.preferences";

type ToolId = ToolDefinition["id"];

export interface PersistedPreferences {
  theme: "light" | "dark" | "system";
  favorites: ToolId[];
  recent: Array<{ toolId: ToolId; usedAt: number }>;
  settings: {
    jsonIndent?: 2 | 4 | "tab";
    jsonSortKeys?: boolean;
    diffView?: "side-by-side" | "unified";
    diffIgnoreWhitespace?: boolean;
    diffIgnoreCase?: boolean;
    timeZone?: string;
    timestampUnit?: "auto" | "seconds" | "milliseconds";
  };
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface PreferenceStore {
  getSnapshot(): PersistedPreferences;
  subscribe(listener: () => void): () => void;
  toggleFavorite(toolId: ToolId): void;
  markRecent(toolId: ToolId, usedAt?: number): void;
  clear(): void;
}

const TOOL_IDS: readonly ToolId[] = [
  "json-formatter",
  "text-json-diff",
  "timestamp-converter",
];

const DEFAULT_PREFERENCES: PersistedPreferences = {
  favorites: [],
  recent: [],
  settings: {},
  theme: "system",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isToolId(value: unknown): value is ToolId {
  return typeof value === "string" && TOOL_IDS.includes(value as ToolId);
}

function readSettings(value: unknown): PersistedPreferences["settings"] {
  if (!isRecord(value)) {
    return {};
  }

  const settings: PersistedPreferences["settings"] = {};

  if (value.jsonIndent === 2 || value.jsonIndent === 4 || value.jsonIndent === "tab") {
    settings.jsonIndent = value.jsonIndent;
  }
  if (typeof value.jsonSortKeys === "boolean") {
    settings.jsonSortKeys = value.jsonSortKeys;
  }
  if (value.diffView === "side-by-side" || value.diffView === "unified") {
    settings.diffView = value.diffView;
  }
  if (typeof value.diffIgnoreWhitespace === "boolean") {
    settings.diffIgnoreWhitespace = value.diffIgnoreWhitespace;
  }
  if (typeof value.diffIgnoreCase === "boolean") {
    settings.diffIgnoreCase = value.diffIgnoreCase;
  }
  if (typeof value.timeZone === "string") {
    settings.timeZone = value.timeZone;
  }
  if (
    value.timestampUnit === "auto" ||
    value.timestampUnit === "seconds" ||
    value.timestampUnit === "milliseconds"
  ) {
    settings.timestampUnit = value.timestampUnit;
  }

  return settings;
}

function parsePreferences(rawValue: string | null): PersistedPreferences {
  if (!rawValue) {
    return { ...DEFAULT_PREFERENCES, settings: {} };
  }

  try {
    const parsed: unknown = JSON.parse(rawValue);
    if (!isRecord(parsed)) {
      return { ...DEFAULT_PREFERENCES, settings: {} };
    }

    const theme =
      parsed.theme === "light" ||
      parsed.theme === "dark" ||
      parsed.theme === "system"
        ? parsed.theme
        : "system";
    const favorites = Array.isArray(parsed.favorites)
      ? [...new Set(parsed.favorites.filter(isToolId))]
      : [];
    const recent = Array.isArray(parsed.recent)
      ? parsed.recent
          .filter(
            (entry): entry is { toolId: ToolId; usedAt: number } =>
              isRecord(entry) &&
              isToolId(entry.toolId) &&
              typeof entry.usedAt === "number" &&
              Number.isFinite(entry.usedAt),
          )
          .sort((left, right) => right.usedAt - left.usedAt)
          .filter(
            (entry, index, entries) =>
              entries.findIndex((candidate) => candidate.toolId === entry.toolId) ===
              index,
          )
          .slice(0, 5)
      : [];

    return {
      favorites,
      recent,
      settings: readSettings(parsed.settings),
      theme,
    };
  } catch {
    return { ...DEFAULT_PREFERENCES, settings: {} };
  }
}

export function createPreferenceStore(storage: StorageLike): PreferenceStore {
  let preferences = parsePreferences(storage.getItem(STORAGE_KEY));
  const listeners = new Set<() => void>();

  function persist(nextPreferences: PersistedPreferences) {
    preferences = nextPreferences;
    storage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    listeners.forEach((listener) => listener());
  }

  return {
    getSnapshot: () => preferences,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    toggleFavorite(toolId) {
      const favorites = preferences.favorites.includes(toolId)
        ? preferences.favorites.filter((favoriteId) => favoriteId !== toolId)
        : [...preferences.favorites, toolId];
      persist({ ...preferences, favorites });
    },
    markRecent(toolId, usedAt = Date.now()) {
      const recent = [
        { toolId, usedAt },
        ...preferences.recent.filter((entry) => entry.toolId !== toolId),
      ].slice(0, 5);
      persist({ ...preferences, recent });
    },
    clear() {
      preferences = { ...DEFAULT_PREFERENCES, settings: {} };
      storage.removeItem(STORAGE_KEY);
      listeners.forEach((listener) => listener());
    },
  };
}
