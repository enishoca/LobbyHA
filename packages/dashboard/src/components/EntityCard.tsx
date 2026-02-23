import { EntitiesCardRow } from '@hakit/components';
import { useHass, type EntityName } from '@hakit/core';
import { useEffect, useState } from 'react';
import { Icon, iconLoaded, loadIcons } from '@iconify/react';
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
  /** Show admin controls (gear icon) */
  showActions?: boolean;
  /** Called when hide button clicked */
  onHide?: (entityId: string) => void;
  /** Called when gear icon clicked — receives the button's bounding rect for popup positioning */
  onGearClick?: (entityId: string, rect: DOMRect) => void;
  /** Extra CSS class */
  className?: string;
  /** Show extended attributes in the detail popup (admin mode) */
  showAttributes?: boolean;
  /** Custom display name override */
  customName?: string | null;
  /** Custom icon override (mdi:xxx) */
  customIcon?: string | null;
}

export function EntityCard({
  entityId, showActions, onHide, onGearClick, className, showAttributes,
  customName, customIcon,
}: EntityCardProps) {
  const entities = useHass((state: { entities?: Record<string, HaEntity> }) => state.entities);
  const [, setIconTick] = useState(0);

  // Proactively load the custom icon and the gear cog icon
  useEffect(() => {
    const toLoad: string[] = [];
    if (customIcon && !iconLoaded(customIcon)) toLoad.push(customIcon);
    if (showActions && !iconLoaded('mdi:cog')) toLoad.push('mdi:cog');
    if (toLoad.length > 0) {
      loadIcons(toLoad, () => setIconTick(t => t + 1));
    }
  }, [customIcon, showActions]);

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
            className="entity-gear-button"
            onClick={(e) => {
              e.stopPropagation();
              if (onGearClick) {
                onGearClick(entityId, (e.currentTarget as HTMLElement).getBoundingClientRect());
              } else {
                onHide?.(entityId);
              }
            }}
            title="Entity settings"
          >
            {iconLoaded('mdi:cog') ? (
              <Icon icon="mdi:cog" width={14} height={14} />
            ) : (
              <span style={{ fontSize: '0.85rem' }}>⚙</span>
            )}
          </button>
        </div>
      )}
      {/* Custom icon overlay */}
      {customIcon && iconLoaded(customIcon) && (
        <div className="entity-custom-icon">
          <Icon icon={customIcon} width={20} height={20} />
        </div>
      )}
      <EntitiesCardRow
        entity={entityId as EntityName}
        includeLastUpdated
        renderState={renderState}
        // @ts-expect-error modalProps includes UI flags not in HAKit's public types
        modalProps={modalPropsExtra}
      />
      {customName && (
        <div className="entity-custom-name">{customName}</div>
      )}
    </div>
  );
}
