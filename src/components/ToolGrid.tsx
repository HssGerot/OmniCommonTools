import type { ToolDefinition } from "../features/catalog/types";
import { ToolCard } from "./ToolCard";

interface ToolGridProps {
  tools: readonly ToolDefinition[];
  favorites: readonly ToolDefinition["id"][];
  onOpen: (toolId: ToolDefinition["id"]) => void;
  onToggleFavorite: (toolId: ToolDefinition["id"]) => void;
  emptyTitle: string;
  emptyDescription: string;
  emptyAction?: {
    label: string;
    onClick: () => void;
  };
}

export function ToolGrid({
  tools,
  favorites,
  onOpen,
  onToggleFavorite,
  emptyTitle,
  emptyDescription,
  emptyAction,
}: ToolGridProps) {
  if (tools.length === 0) {
    return (
      <div className="empty-state">
        <div role="status">
          <h2>{emptyTitle}</h2>
          <p>{emptyDescription}</p>
        </div>
        {emptyAction && (
          <button
            className="secondary-button"
            onClick={emptyAction.onClick}
            type="button"
          >
            {emptyAction.label}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="tool-grid">
      {tools.map((tool) => (
        <ToolCard
          isFavorite={favorites.includes(tool.id)}
          key={tool.id}
          onOpen={onOpen}
          onToggleFavorite={onToggleFavorite}
          tool={tool}
        />
      ))}
    </div>
  );
}
