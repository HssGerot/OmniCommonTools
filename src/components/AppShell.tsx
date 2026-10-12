import { Menu, Moon, Star, Sun, X } from "lucide-react";
import { useEffect, useState, type PropsWithChildren } from "react";
import { Link, NavLink } from "react-router-dom";
import type { PreferenceStore } from "../features/preferences/storage";
import { usePreferences } from "../features/preferences/usePreferences";
import { IconButton } from "./IconButton";

interface AppShellProps extends PropsWithChildren {
  preferenceStore?: PreferenceStore;
}

const THEME_LABELS = {
  dark: "深色",
  light: "浅色",
  system: "跟随系统",
} as const;

export function AppShell({ children, preferenceStore }: AppShellProps) {
  const preferences = usePreferences(preferenceStore);
  const [menuOpen, setMenuOpen] = useState(false);
  const nextTheme =
    preferences.theme === "system"
      ? "dark"
      : preferences.theme === "dark"
        ? "light"
        : "system";

  useEffect(() => {
    const media = window.matchMedia?.("(prefers-color-scheme: dark)");
    const applyTheme = () => {
      document.documentElement.dataset.theme =
        preferences.theme === "system"
          ? media?.matches
            ? "dark"
            : "light"
          : preferences.theme;
    };

    applyTheme();
    media?.addEventListener("change", applyTheme);
    return () => media?.removeEventListener("change", applyTheme);
  }, [preferences.theme]);

  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          Toolbox
        </Link>
        <nav
          aria-label="主导航"
          data-open={menuOpen ? "true" : "false"}
          id="primary-navigation"
        >
          <NavLink onClick={() => setMenuOpen(false)} to="/" end>
            全部工具
          </NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/favorites">
            收藏
          </NavLink>
          <NavLink onClick={() => setMenuOpen(false)} to="/about">
            关于
          </NavLink>
        </nav>
        <div className="topbar-actions">
          <Link
            aria-label="查看收藏"
            className="icon-button"
            to="/favorites"
          >
            <Star aria-hidden="true" />
          </Link>
          <IconButton
            label={`切换主题（当前：${THEME_LABELS[preferences.theme]}）`}
            onClick={() => preferences.setTheme(nextTheme)}
          >
            {preferences.theme === "light" ? (
              <Sun aria-hidden="true" />
            ) : (
              <Moon aria-hidden="true" />
            )}
          </IconButton>
          <IconButton
            className="mobile-menu-button"
            label={menuOpen ? "关闭主导航" : "打开主导航"}
            aria-controls="primary-navigation"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}
          </IconButton>
        </div>
      </header>
      {children}
    </div>
  );
}
