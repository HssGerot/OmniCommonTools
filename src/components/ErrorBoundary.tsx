import { Component, type ErrorInfo, type PropsWithChildren } from "react";
import { isRouteErrorResponse, useRouteError } from "react-router-dom";

interface ErrorBoundaryState {
  error: Error | null;
}

function errorMessage(error: unknown) {
  if (isRouteErrorResponse(error)) {
    if (error.status === 404) {
      return "未找到请求的页面。";
    }
    return error.statusText || `请求失败（${error.status}）`;
  }
  return error instanceof Error ? error.message : "发生未知错误。";
}

function ErrorFallback({ error }: { error: unknown }) {
  return (
    <main className="error-fallback" id="main-content">
      <p className="page-eyebrow">页面错误</p>
      <h1>此工具暂时无法显示</h1>
      <p>{errorMessage(error)}</p>
      <div className="error-fallback-actions">
        <a className="secondary-button" href="/">
          返回全部工具
        </a>
        <button
          className="primary-button"
          onClick={() => window.location.reload()}
          type="button"
        >
          重新加载
        </button>
      </div>
    </main>
  );
}

export function RouteErrorBoundary() {
  return <ErrorFallback error={useRouteError()} />;
}

export class ErrorBoundary extends Component<
  PropsWithChildren,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Unhandled application error", error, errorInfo);
  }

  render() {
    if (!this.state.error) {
      return this.props.children;
    }

    return <ErrorFallback error={this.state.error} />;
  }
}
