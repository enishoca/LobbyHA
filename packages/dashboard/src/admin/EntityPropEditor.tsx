import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon, iconLoaded, loadIcons } from '@iconify/react';
import { IconPicker } from '../components/IconPicker';
import { apiFetch } from '../shared/utils';

/**
 * EntityPropEditor — Inline panel for editing per-entity display properties.
 * Opens as a small floating card near the gear icon on an entity card.
 * Lets admin override: display name, icon.
 */

interface EntityDisplayProps {
  entity_id: string;
  custom_name?: string | null;
  custom_icon?: string | null;
  show_last_updated?: boolean;
  hide_state?: boolean;
  hide_updated?: boolean;
  hide_attributes?: boolean;
  hide_logbook?: boolean;
}

interface EntityPropEditorProps {
  entityId: string;
  friendlyName: string;
  sessionId: string;
  anchorRect: DOMRect;
  onClose: () => void;
  onSave: () => void;
  onHide: () => void;
}

export function EntityPropEditor({
  entityId,
  friendlyName,
  sessionId,
  anchorRect,
  onClose,
  onSave,
  onHide,
}: EntityPropEditorProps) {
  const [customName, setCustomName] = useState('');
  const [customIcon, setCustomIcon] = useState('');
  const [showLastUpdated, setShowLastUpdated] = useState(true);
  const [hideState, setHideState] = useState(false);
  const [hideUpdated, setHideUpdated] = useState(false);
  const [hideAttributes, setHideAttributes] = useState(true);
  const [hideLogbook, setHideLogbook] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [, setIconTick] = useState(0);

  // Ensure saved icon is loaded for display
  useEffect(() => {
    const toLoad: string[] = ['mdi:cog', 'mdi:eye-off'];
    if (customIcon && !iconLoaded(customIcon)) toLoad.push(customIcon);
    loadIcons(toLoad, () => setIconTick(t => t + 1));
  }, [customIcon]);

  // Load current props
  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch<{ props: EntityDisplayProps }>(
          `/api/ui/entity-props/${encodeURIComponent(entityId)}`,
          { sessionId },
        );
        setCustomName(data.props.custom_name || '');
        setCustomIcon(data.props.custom_icon || '');
        setShowLastUpdated(data.props.show_last_updated !== false);
        setHideState(data.props.hide_state === true);
        setHideUpdated(data.props.hide_updated === true);
        setHideAttributes(data.props.hide_attributes === true);
        setHideLogbook(data.props.hide_logbook === true);
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    })();
  }, [entityId, sessionId]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      await apiFetch(`/api/ui/entity-props/${encodeURIComponent(entityId)}`, {
        method: 'POST',
        sessionId,
        body: JSON.stringify({
          custom_name: customName.trim() || null,
          custom_icon: customIcon || null,
          show_last_updated: showLastUpdated,
          hide_state: hideState,
          hide_updated: hideUpdated,
          hide_attributes: hideAttributes,
          hide_logbook: hideLogbook,
        }),
      });
      onSave();
      onClose();
    } catch (err) {
      console.error('Save entity props failed:', err);
    } finally {
      setSaving(false);
    }
  }, [entityId, sessionId, customName, customIcon, showLastUpdated, hideState, hideUpdated, hideAttributes, hideLogbook, onSave, onClose]);

  const handleReset = useCallback(async () => {
    try {
      await apiFetch(`/api/ui/entity-props/${encodeURIComponent(entityId)}`, {
        method: 'DELETE',
        sessionId,
      });
      setCustomName('');
      setCustomIcon('');
      setShowLastUpdated(true);
      setHideState(false);
      setHideUpdated(false);
      setHideAttributes(true);
      setHideLogbook(true);
      onSave();
      onClose();
    } catch (err) {
      console.error('Reset entity props failed:', err);
    }
  }, [entityId, sessionId, onSave, onClose]);

  // Calculate position — appear below the anchor, but stay in viewport
  const panelWidth = 340;
  const panelHeight = 440;
  let top = anchorRect.bottom + 8;
  let left = anchorRect.left - panelWidth / 2 + anchorRect.width / 2;
  if (left + panelWidth > window.innerWidth - 8) left = window.innerWidth - panelWidth - 8;
  if (left < 8) left = 8;
  if (top + panelHeight > window.innerHeight - 8) top = anchorRect.top - panelHeight - 8;

  return createPortal(
    <div className="entity-prop-overlay" onClick={onClose}>
      <div
        className="entity-prop-editor"
        style={{ top, left, width: panelWidth }}
        onClick={e => e.stopPropagation()}
      >
        {loading ? (
          <p className="note" style={{ textAlign: 'center', padding: '1rem' }}>Loading...</p>
        ) : (
          <>
            <div className="entity-prop-header">
              {iconLoaded('mdi:cog') ? <Icon icon="mdi:cog" width={16} height={16} /> : <span>⚙</span>}
              <span className="entity-prop-title">{friendlyName}</span>
              <button type="button" className="entity-prop-close" onClick={onClose}>×</button>
            </div>

            <div className="entity-prop-body">
              {/* Custom icon */}
              <div className="entity-prop-field">
                <label>Icon</label>
                <div className="entity-prop-icon-row">
                  <IconPicker value={customIcon} onChange={setCustomIcon} />
                  {customIcon && (
                    <span className="entity-prop-icon-name">{customIcon.replace('mdi:', '')}</span>
                  )}
                  {customIcon && (
                    <button
                      type="button"
                      className="entity-prop-clear-btn"
                      onClick={() => setCustomIcon('')}
                      title="Clear icon override"
                    >×</button>
                  )}
                </div>
              </div>

              {/* Custom name */}
              <div className="entity-prop-field">
                <label>Display Name</label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder={friendlyName}
                  className="entity-prop-input"
                />
              </div>

              {/* Card display toggles */}
              <div className="entity-prop-section-label">Card Display</div>

              <div className="entity-prop-toggle-row">
                <label htmlFor={`slu-${entityId}`}>Show last updated</label>
                <input id={`slu-${entityId}`} type="checkbox" checked={showLastUpdated} onChange={e => setShowLastUpdated(e.target.checked)} />
              </div>

              {/* Detail dialog toggles */}
              <div className="entity-prop-section-label">Detail Dialog</div>

              <div className="entity-prop-toggle-row">
                <label htmlFor={`hs-${entityId}`}>Hide state</label>
                <input id={`hs-${entityId}`} type="checkbox" checked={hideState} onChange={e => setHideState(e.target.checked)} />
              </div>
              <div className="entity-prop-toggle-row">
                <label htmlFor={`hu-${entityId}`}>Hide last updated</label>
                <input id={`hu-${entityId}`} type="checkbox" checked={hideUpdated} onChange={e => setHideUpdated(e.target.checked)} />
              </div>
              <div className="entity-prop-toggle-row">
                <label htmlFor={`ha-${entityId}`}>Hide attributes</label>
                <input id={`ha-${entityId}`} type="checkbox" checked={hideAttributes} onChange={e => setHideAttributes(e.target.checked)} />
              </div>
              <div className="entity-prop-toggle-row">
                <label htmlFor={`hl-${entityId}`}>Hide logbook</label>
                <input id={`hl-${entityId}`} type="checkbox" checked={hideLogbook} onChange={e => setHideLogbook(e.target.checked)} />
              </div>
            </div>

            <div className="entity-prop-actions">
              <button
                type="button"
                className="entity-prop-hide-btn"
                onClick={() => { onHide(); onClose(); }}
                title="Hide this entity"
              >
                {iconLoaded('mdi:eye-off') ? <Icon icon="mdi:eye-off" width={14} height={14} /> : <span>👁</span>} Hide
              </button>
              <div style={{ flex: 1 }} />
              <button type="button" className="entity-prop-reset-btn" onClick={handleReset}>
                Reset
              </button>
              <button
                type="button"
                className="entity-prop-save-btn"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '...' : 'Save'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
