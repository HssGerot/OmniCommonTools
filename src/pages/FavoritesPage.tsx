import { ToolGrid } from "../components/ToolGrid";
import { TOOLS } from "../features/catalog/tools";
import { usePreferences } from "../features/preferences/usePreferences";

export function FavoritesPage() {
  const { favorites, markRecent, toggleFavorite } = usePreferences();
  const favoriteTools = TOOLS.filter((tool) => favorites.includes(tool.id));

  return (
    <main className="catalog-page" id="main-content">
      <header className="catalog-heading">
        <p className="page-eyebrow">Collection</p>
        <h1>收藏</h1>
        <p>集中访问你常用的开发工具。</p>
      </header>
      <section className="catalog-section" aria-labelledby="favorites-heading">
        <div className="section-heading">
          <h2 id="favorites-heading">已收藏工具</h2>
          <span>{favoriteTools.length} 项</span>
        </div>
        <ToolGrid
          emptyDescription="在工具卡片上选择星标，常用工具会出现在这里。"
          emptyTitle="还没有收藏"
          favorites={favorites}
          onOpen={markRecent}
          onToggleFavorite={toggleFavorite}
          tools={favoriteTools}
        />
      </section>
    </main>
  );
}

export default FavoritesPage;
