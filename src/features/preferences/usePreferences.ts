import { useSyncExternalStore } from "react";
import {
  createPreferenceStore,
  type PreferenceStore,
  type StorageLike,
} from "./storage";

const fallbackStorage: StorageLike = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined,
};

const preferenceStore = createPreferenceStore(
  typeof window === "undefined" ? fallbackStorage : window.localStorage,
);

export function usePreferences(store: PreferenceStore = preferenceStore) {
  const preferences = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot,
  );

  return {
    ...preferences,
    clearPreferences: store.clear,
    markRecent: store.markRecent,
    toggleFavorite: store.toggleFavorite,
  };
}
