import {
  Braces,
  Clock3,
  GitCompareArrows,
  Star,
} from "lucide-react";
import { Link } from "react-router-dom";
import type { ToolDefinition } from "../features/catalog/types";
import { IconButton } from "./IconButton";

interface ToolCardProps {
  tool: ToolDefinition;
  isFavorite: boolean;
  onOpen: (toolId: ToolDefinition["id"]) => void;
  onToggleFavorite: (toolId: ToolDefinition["id"]) => void;
}

const CATEGORY_LABELS: Record<ToolDefinition["category"], string> = {
  diff: "文本对比",
  format: "格式化",
  time: "时间转换",
};

const TOOL_ICONS = {
  "json-formatter": Braces,
  "text-json-diff": GitCompareArrows,
  "timestamp-converter": Clock3,
} satisfies Record<ToolDefinition["id"], typeof Braces>;

export function ToolCard({
  tool,
  isFavorite,
  onOpen,
  onToggleFavorite,
}: ToolCardProps) {
  const ToolIcon = TOOL_ICONS[tool.id];
  const favoriteLabel = `${isFavorite ? "取消收藏" : "收藏"} ${tool.name}`;

  return (
    <article className="tool-card">
      <Link
        className="tool-card-link"
        onClick={() => onOpen(tool.id)}
        to={tool.route}
      >
        <span className="tool-card-icon" aria-hidden="true">
          <ToolIcon />
        </span>
        <span className="tool-card-copy">
          <span className="tool-card-category">{CATEGORY_LABELS[tool.category]}</span>
          <span className="tool-card-name">{tool.name}</span>
          <span className="tool-card-description">{tool.description}</span>
        </span>
      </Link>
      <IconButton
        className={isFavorite ? "favorite-button is-active" : "favorite-button"}
        label={favoriteLabel}
        onClick={() => onToggleFavorite(tool.id)}
        aria-pressed={isFavorite}
      >
        <Star aria-hidden="true" fill={isFavorite ? "currentColor" : "none"} />
      </IconButton>
    </article>
  );
}
