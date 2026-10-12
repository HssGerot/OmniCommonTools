import type { ToolDefinition } from "../features/catalog/types";
import { ToolCard } from "./ToolCard";

interface ToolGridProps {
  tools: readonly ToolDefinition[];
  favorites: readonly ToolDefinition["id"][];
  onOpen: (toolId: ToolDefinition["id"]) => void;
  onToggleFavorite: (toolId: ToolDefinition["id"]) => void;
  emptyTitle: string;
  emptyDescription: string;
}

export function ToolGrid({
  tools,
  favorites,
  onOpen,
  onToggleFavorite,
  emptyTitle,
  emptyDescription,
}: ToolGridProps) {
  if (tools.length === 0) {
    return (
      <div className="empty-state" role="status">
        <h2>{emptyTitle}</h2>
        <p>{emptyDescription}</p>
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
