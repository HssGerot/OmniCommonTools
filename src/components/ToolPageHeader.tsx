import type { ReactNode } from "react";

interface ToolPageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function ToolPageHeader({
  actions,
  description,
  title,
}: ToolPageHeaderProps) {
  return (
    <header className="tool-page-header">
      <div>
        <p className="page-eyebrow">Developer tool</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions ? <div className="tool-page-header-actions">{actions}</div> : null}
    </header>
  );
}
