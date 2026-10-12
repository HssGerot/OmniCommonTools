import {
  ArrowLeft,
  Braces,
  Clock3,
  GitCompareArrows,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { TOOLS } from "../features/catalog/tools";
import type { ToolDefinition } from "../features/catalog/types";
import type { PreferenceStore } from "../features/preferences/storage";
import { usePreferences } from "../features/preferences/usePreferences";
import { IconButton } from "./IconButton";

interface ToolPageHeaderProps {
  toolId: ToolDefinition["id"];
  description: string;
  actions?: ReactNode;
  preferenceStore?: PreferenceStore;
}

const TOOL_ICONS = {
  "json-formatter": Braces,
  "text-json-diff": GitCompareArrows,
  "timestamp-converter": Clock3,
} satisfies Record<ToolDefinition["id"], typeof Braces>;

export function ToolPageHeader({
  actions,
  description,
  preferenceStore,
  toolId,
}: ToolPageHeaderProps) {
  const { favorites, toggleFavorite } = usePreferences(preferenceStore);
  const tool = TOOLS.find((candidate) => candidate.id === toolId);

  if (!tool) {
    throw new Error(`Unknown tool: ${toolId}`);
  }

  const ToolIcon = TOOL_ICONS[toolId];
  const isFavorite = favorites.includes(toolId);
  const favoriteLabel = `${isFavorite ? "取消收藏" : "收藏"} ${tool.name}`;

  return (
    <header className="tool-page-header">
      <div className="tool-page-header-context">
        <Link className="tool-page-back" to="/">
          <ArrowLeft aria-hidden="true" />
          返回全部工具
        </Link>
        <div className="tool-page-heading">
          <span className="tool-page-icon" aria-hidden="true">
            <ToolIcon />
          </span>
          <div>
            <span className="local-processing-badge">
              <ShieldCheck aria-hidden="true" />
              本地处理
            </span>
            <h1>{tool.name}</h1>
            <p>{description}</p>
          </div>
        </div>
      </div>
      <div className="tool-page-header-actions">
        {actions}
        <IconButton
          aria-pressed={isFavorite}
          className={
            isFavorite ? "tool-page-favorite is-active" : "tool-page-favorite"
          }
          label={favoriteLabel}
          onClick={() => toggleFavorite(toolId)}
        >
          <Star aria-hidden="true" fill={isFavorite ? "currentColor" : "none"} />
        </IconButton>
      </div>
    </header>
  );
}
