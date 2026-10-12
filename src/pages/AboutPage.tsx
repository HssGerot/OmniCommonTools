import { Database, RotateCcw, ShieldCheck } from "lucide-react";
import { usePreferences } from "../features/preferences/usePreferences";

export function AboutPage() {
  const { clearPreferences } = usePreferences();

  return (
    <main className="catalog-page about-page" id="main-content">
      <header className="catalog-heading">
        <p className="page-eyebrow">About</p>
        <h1>关于 Toolbox</h1>
        <p>一组安静、直接、随用随走的本地开发工具。</p>
      </header>

      <div className="about-grid">
        <section className="about-card">
          <ShieldCheck aria-hidden="true" />
          <h2>内容留在本地</h2>
          <p>
            工具输入和输出仅在当前浏览器中处理，不会发送到后端，也不会持久化。
          </p>
        </section>
        <section className="about-card">
          <Database aria-hidden="true" />
          <h2>只保存必要偏好</h2>
          <p>
            本地存储仅包含主题、收藏、最近工具及规格允许的工具设置。
          </p>
        </section>
      </div>

      <section className="clear-preferences" aria-labelledby="clear-heading">
        <div>
          <h2 id="clear-heading">清除本地偏好</h2>
          <p>删除收藏、最近使用记录、主题和工具设置，工具内容不受影响。</p>
        </div>
        <button
          className="secondary-button"
          onClick={clearPreferences}
          type="button"
        >
          <RotateCcw aria-hidden="true" />
          清除偏好
        </button>
      </section>
    </main>
  );
}

export default AboutPage;
