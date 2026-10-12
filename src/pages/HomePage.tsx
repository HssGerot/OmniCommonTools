import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import { ToolGrid } from "../components/ToolGrid";
import { filterTools } from "../features/catalog/search";
import { TOOLS } from "../features/catalog/tools";
import type { ToolCategoryFilter } from "../features/catalog/types";
import { usePreferences } from "../features/preferences/usePreferences";

const CATEGORIES: ReadonlyArray<{
  id: ToolCategoryFilter;
  label: string;
}> = [
  { id: "all", label: "全部" },
  { id: "format", label: "格式化" },
  { id: "diff", label: "文本对比" },
  { id: "time", label: "时间转换" },
];

export function HomePage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<ToolCategoryFilter>("all");
  const { favorites, markRecent, recent, toggleFavorite } = usePreferences();
  const filteredTools = useMemo(
    () => filterTools(TOOLS, query, category),
    [category, query],
  );
  const recentTools = recent
    .map((entry) => TOOLS.find((tool) => tool.id === entry.toolId))
    .filter((tool) => tool !== undefined);

  return (
    <main className="catalog-page" id="main-content">
      <header className="catalog-heading">
        <p className="page-eyebrow">Toolbox</p>
        <h1>开发工具</h1>
        <p>搜索并打开常用工具，所有内容都在本地处理。</p>
      </header>

      <section className="catalog-controls" aria-label="筛选工具">
        <label className="search-field">
          <span className="visually-hidden">搜索工具</span>
          <Search aria-hidden="true" />
          <input
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索名称、说明或关键词"
            type="search"
            value={query}
          />
        </label>
        <div className="category-chips" aria-label="工具分类">
          {CATEGORIES.map((item) => (
            <button
              aria-pressed={category === item.id}
              className="category-chip"
              key={item.id}
              onClick={() => setCategory(item.id)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {recentTools.length > 0 && (
        <section className="catalog-section" aria-labelledby="recent-heading">
          <div className="section-heading">
            <h2 id="recent-heading">最近使用</h2>
            <span>{recentTools.length} 项</span>
          </div>
          <ToolGrid
            emptyDescription=""
            emptyTitle=""
            favorites={favorites}
            onOpen={markRecent}
            onToggleFavorite={toggleFavorite}
            tools={recentTools}
          />
        </section>
      )}

      <section className="catalog-section" aria-labelledby="tools-heading">
        <div className="section-heading">
          <h2 id="tools-heading">全部工具</h2>
          <span>{filteredTools.length} 项</span>
        </div>
        <ToolGrid
          emptyDescription="请调整关键词或选择其他分类。"
          emptyTitle="没有匹配的工具"
          favorites={favorites}
          onOpen={markRecent}
          onToggleFavorite={toggleFavorite}
          tools={filteredTools}
        />
      </section>
    </main>
  );
}

export default HomePage;
