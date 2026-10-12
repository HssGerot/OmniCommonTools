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

const HomePage = lazy(() => import("../pages/HomePage"));
const FavoritesPage = lazy(() => import("../pages/FavoritesPage"));
const JsonFormatterPage = lazy(
  () => import("../features/json/JsonFormatterPage"),
);
const TextJsonDiffPage = lazy(
  () => import("../features/diff/DiffPage"),
);
const TimestampConverterPage = createPlaceholder(
  "时间戳转换",
  "在时间戳、日期时间和时区之间转换。",
);
const AboutPage = lazy(() => import("../pages/AboutPage"));

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
