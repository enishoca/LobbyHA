import { useState } from 'react';
import { EntityCard } from './EntityCard';

interface AreaCardProps {
  name: string;
  icon: string;
  entityIds: string[];
  defaultExpanded?: boolean;
  showEntityActions?: boolean;
  onHideEntity?: (entityId: string) => void;
}

export function AreaCard({
  name,
  icon,
  entityIds,
  defaultExpanded = true,
  showEntityActions = false,
  onHideEntity,
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
            />
          ))}
        </div>
      )}
    </div>
  );
}
