import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  type PropsWithChildren,
} from "react";
import type { PersistedPreferences } from "../features/preferences/storage";

export type ResolvedTheme = "dark" | "light";

const ResolvedThemeContext = createContext<ResolvedTheme>("light");

function prefersDarkTheme() {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
}

export function resolveTheme(
  preference: PersistedPreferences["theme"],
  systemPrefersDark: boolean,
): ResolvedTheme {
  return preference === "system"
    ? systemPrefersDark
      ? "dark"
      : "light"
    : preference;
}

interface ResolvedThemeProviderProps extends PropsWithChildren {
  preference: PersistedPreferences["theme"];
}

export function ResolvedThemeProvider({
  children,
  preference,
}: ResolvedThemeProviderProps) {
  const [systemPrefersDark, setSystemPrefersDark] = useState(prefersDarkTheme);
  const resolvedTheme = resolveTheme(preference, systemPrefersDark);

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!media) {
      return;
    }

    const updateSystemTheme = (event: MediaQueryListEvent) => {
      setSystemPrefersDark(event.matches);
    };
    setSystemPrefersDark(media.matches);
    media.addEventListener("change", updateSystemTheme);
    return () => media.removeEventListener("change", updateSystemTheme);
  }, []);

  useLayoutEffect(() => {
    document.documentElement.dataset.theme = resolvedTheme;
  }, [resolvedTheme]);

  return (
    <ResolvedThemeContext.Provider value={resolvedTheme}>
      {children}
    </ResolvedThemeContext.Provider>
  );
}

export function useResolvedTheme() {
  return useContext(ResolvedThemeContext);
}

export function useMonacoTheme(): "vs-dark" | "light" {
  return useResolvedTheme() === "dark" ? "vs-dark" : "light";
}
