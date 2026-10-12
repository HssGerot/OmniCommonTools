import { Moon, Star } from "lucide-react";
import type { PropsWithChildren } from "react";
import { Link, NavLink } from "react-router-dom";
import { IconButton } from "./IconButton";

export function AppShell({ children }: PropsWithChildren) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/">
          Toolbox
        </Link>
        <nav aria-label="主导航">
          <NavLink to="/" end>
            全部工具
          </NavLink>
          <NavLink to="/favorites">收藏</NavLink>
          <NavLink to="/about">关于</NavLink>
        </nav>
        <div className="topbar-actions">
          <IconButton label="查看收藏">
            <Star aria-hidden="true" />
          </IconButton>
          <IconButton label="切换主题">
            <Moon aria-hidden="true" />
          </IconButton>
        </div>
      </header>
      {children}
    </div>
  );
}
