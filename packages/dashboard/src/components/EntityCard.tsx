import { EntitiesCardRow } from '@hakit/components';
import { useHass, type EntityName } from '@hakit/core';
import { getDomain, isBinarySensorDoor, isBinarySensorMotion } from '../shared/entity-domains';

/**
 * EntityCard — Abstraction layer over HAKit's entity components.
 *
 * Usage: <EntityCard entityId="light.kitchen" />
 *
 * Automatically selects HAKit's rendering based on entity domain.
 * If HAKit is ever replaced, only this file needs to change.
 */

// Local type for accessing entity state from HAKit's store
interface HaEntity {
  attributes?: Record<string, unknown>;
  state?: string;
}

interface EntityCardProps {
  entityId: string;
  /** Show admin controls (hide/drag) */
  showActions?: boolean;
  /** Called when hide button clicked */
  onHide?: (entityId: string) => void;
  /** Extra CSS class */
  className?: string;
  /** Show extended attributes in the detail popup (admin mode) */
  showAttributes?: boolean;
}

export function EntityCard({ entityId, showActions, onHide, className, showAttributes }: EntityCardProps) {
  const entities = useHass((state: { entities?: Record<string, HaEntity> }) => state.entities);

  const entity = entities?.[entityId];
  const domain = getDomain(entityId);
  const deviceClass = entity?.attributes?.device_class as string | undefined;

  // Determine custom state rendering for binary sensors
  const renderState = (domain === 'binary_sensor')
    ? () => {
        const isDoor = isBinarySensorDoor(deviceClass);
        const isMotion = isBinarySensorMotion(deviceClass);
        if (isDoor || isMotion) {
          return (
            <span>
              {entity?.state === 'on'
                ? isDoor ? 'open' : 'active'
                : isDoor ? 'closed' : 'inactive'}
            </span>
          );
        }
        return <span>{entity?.state ?? 'unknown'}</span>;
      }
    : undefined;

  // Modal restrictions — show attributes in admin, hide in guest
  const modalPropsExtra = showAttributes
    ? {
        hideLogbook: false,
        hideDeviceSettings: true,
        hideAttributes: false,
      }
    : {
        hideLogbook: true,
        hideDeviceSettings: true,
        hideAttributes: true,
      };

  const cardClasses = [
    'entity-card',
    showActions ? '' : 'simple',
    className ?? '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses}>
      {showActions && (
        <div className="entity-card-actions">
          <button
            type="button"
            className="entity-hide-button"
            onClick={(e) => { e.stopPropagation(); onHide?.(entityId); }}
            title="Hide entity"
          >
            ×
          </button>
        </div>
      )}
      <EntitiesCardRow
        entity={entityId as EntityName}
        includeLastUpdated
        renderState={renderState}
        // @ts-expect-error modalProps includes UI flags not in HAKit's public types
        modalProps={modalPropsExtra}
      />
    </div>
  );
}
