import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@iconify/react';
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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
        }),
      });
      onSave();
      onClose();
    } catch (err) {
      console.error('Save entity props failed:', err);
    } finally {
      setSaving(false);
    }
  }, [entityId, sessionId, customName, customIcon, onSave, onClose]);

  const handleReset = useCallback(async () => {
    try {
      await apiFetch(`/api/ui/entity-props/${encodeURIComponent(entityId)}`, {
        method: 'DELETE',
        sessionId,
      });
      setCustomName('');
      setCustomIcon('');
      onSave();
      onClose();
    } catch (err) {
      console.error('Reset entity props failed:', err);
    }
  }, [entityId, sessionId, onSave, onClose]);

  // Calculate position — appear below the anchor, but stay in viewport
  const panelWidth = 320;
  const panelHeight = 260;
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
              <Icon icon="mdi:cog" width={16} height={16} />
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
            </div>

            <div className="entity-prop-actions">
              <button
                type="button"
                className="entity-prop-hide-btn"
                onClick={() => { onHide(); onClose(); }}
                title="Hide this entity"
              >
                <Icon icon="mdi:eye-off" width={14} height={14} /> Hide
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
