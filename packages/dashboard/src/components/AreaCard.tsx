import { useState } from 'react';
import { EntityCard } from './EntityCard';

interface AreaCardProps {
  name: string;
  icon: string;
  entityIds: string[];
  defaultExpanded?: boolean;
  showEntityActions?: boolean;
  onHideEntity?: (entityId: string) => void;
  /** Called when gear icon clicked — receives entity id and button rect */
  onGearClick?: (entityId: string, rect: DOMRect) => void;
  /** Map of entity display props (custom name/icon/display flags) */
  entityProps?: Record<string, {
    custom_name?: string | null; custom_icon?: string | null;
    show_last_updated?: boolean; hide_state?: boolean; hide_updated?: boolean;
    hide_attributes?: boolean; hide_logbook?: boolean;
  }>;
}

export function AreaCard({
  name,
  icon,
  entityIds,
  defaultExpanded = true,
  showEntityActions = false,
  onHideEntity,
  onGearClick,
  entityProps,
}: AreaCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  if (entityIds.length === 0) return null;

  return (
    <div className="module-section">
      <div className="module-header" onClick={() => setExpanded(!expanded)}>
        <h2>
          <span>{icon}</span>
          {name}
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 400 }}>
            ({entityIds.length})
          </span>
        </h2>
        <button
          type="button"
          className={`module-toggle ${expanded ? '' : 'collapsed'}`}
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          ▼
        </button>
      </div>
      {expanded && (
        <div className="module-entities">
          {entityIds.map(entityId => (
            <EntityCard
              key={entityId}
              entityId={entityId}
              showActions={showEntityActions}
              onHide={onHideEntity}
              onGearClick={onGearClick}
              customName={entityProps?.[entityId]?.custom_name}
              customIcon={entityProps?.[entityId]?.custom_icon}
              showLastUpdated={entityProps?.[entityId]?.show_last_updated}
              hideState={entityProps?.[entityId]?.hide_state}
              hideUpdated={entityProps?.[entityId]?.hide_updated}
              hideAttributes={entityProps?.[entityId]?.hide_attributes}
              hideLogbook={entityProps?.[entityId]?.hide_logbook}
            />
          ))}
        </div>
      )}
    </div>
  );
}
