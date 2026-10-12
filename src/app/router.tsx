import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { AppShell } from "../components/AppShell";

function createPlaceholder(title: string, description: string) {
  return lazy(async () => ({
    default: function Placeholder() {
      return (
        <main className="page" id="main-content">
          <p className="page-eyebrow">Toolbox</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </main>
      );
    },
  }));
}

const HomePage = createPlaceholder(
  "全部工具",
  "从一个入口使用常用的开发者工具。",
);
const FavoritesPage = createPlaceholder(
  "收藏",
  "你收藏的工具会集中显示在这里。",
);
const JsonFormatterPage = createPlaceholder(
  "JSON 美化",
  "格式化、校验并查看 JSON 数据。",
);
const TextJsonDiffPage = createPlaceholder(
  "文本 / JSON Diff",
  "并排比较文本或 JSON 内容之间的差异。",
);
const TimestampConverterPage = createPlaceholder(
  "时间戳转换",
  "在时间戳、日期时间和时区之间转换。",
);
const AboutPage = createPlaceholder(
  "关于",
  "了解 Toolbox 及其提供的开发者工具。",
);

function RootLayout() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <main className="page" aria-live="polite">
            正在加载…
          </main>
        }
      >
        <Outlet />
      </Suspense>
    </AppShell>
  );
}

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "favorites", element: <FavoritesPage /> },
      { path: "tools/json-formatter", element: <JsonFormatterPage /> },
      { path: "tools/text-json-diff", element: <TextJsonDiffPage /> },
      {
        path: "tools/timestamp-converter",
        element: <TimestampConverterPage />,
      },
      { path: "about", element: <AboutPage /> },
    ],
  },
]);
