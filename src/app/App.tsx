import { RouterProvider } from "react-router-dom";
import { ErrorBoundary } from "../components/ErrorBoundary";
import { ToastProvider } from "../components/ToastRegion";
import { router } from "./router";

export function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <RouterProvider router={router} />
      </ToastProvider>
    </ErrorBoundary>
  );
}
