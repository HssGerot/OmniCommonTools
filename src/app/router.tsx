import { lazy, Suspense } from "react";
import { createBrowserRouter, Outlet } from "react-router-dom";
import { AppShell } from "../components/AppShell";
import { RouteErrorBoundary } from "../components/ErrorBoundary";

const HomePage = lazy(() => import("../pages/HomePage"));
const FavoritesPage = lazy(() => import("../pages/FavoritesPage"));
const JsonFormatterPage = lazy(
  () => import("../features/json/JsonFormatterPage"),
);
const TextJsonDiffPage = lazy(
  () => import("../features/diff/DiffPage"),
);
const TimestampConverterPage = lazy(
  () => import("../features/time/TimeConverterPage"),
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
    errorElement: <RouteErrorBoundary />,
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
