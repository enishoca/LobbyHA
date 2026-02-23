import { useState } from 'react';
import { apiFetch } from '../shared/utils';

interface SettingsPanelProps {
  sessionId: string;
  onClose?: () => void;
  /** When true, render inline (not as modal overlay) */
  inline?: boolean;
  /** Called after settings are saved successfully */
  onSaved?: () => void;
}

export function SettingsPanel({ sessionId, onClose, inline, onSaved }: SettingsPanelProps) {
  const [haUrl, setHaUrl] = useState('');
  const [haToken, setHaToken] = useState('••••••••');
  const [port, setPort] = useState('');
  const [portLocked, setPortLocked] = useState(false);
  const [portLockedBy, setPortLockedBy] = useState<string | null>(null);
  const [logLevel, setLogLevel] = useState('INFO');
  const [allowedEntities, setAllowedEntities] = useState('');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [result, setResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [advResult, setAdvResult] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // PIN settings
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pins, setPins] = useState<Array<{pin: string; permanent: boolean}>>([]);
  const [newPin, setNewPin] = useState('');
  const [newPinPermanent, setNewPinPermanent] = useState(false);
  const [pinLoaded, setPinLoaded] = useState(false);
  const [pinSaving, setPinSaving] = useState(false);

  // Restart state
  const [restarting, setRestarting] = useState(false);

  // Load current config on first render
  if (!loaded) {
    apiFetch<{
      success: boolean;
      config: { HA_URL: string; HA_TOKEN: string; PORT: string; LOG_LEVEL: string; ALLOWED_ENTITIES?: string };
      portLocked?: boolean;
      portLockedBy?: string | null;
      missing?: string[];
    }>(
      '/api/admin/config',
      { sessionId }
    ).then(data => {
      if (data.success) {
        setHaUrl(data.config.HA_URL || '');
        setHaToken(data.config.HA_TOKEN || '');
        setPort(data.config.PORT || '3000');
        setLogLevel(data.config.LOG_LEVEL || 'INFO');
        setAllowedEntities(data.config.ALLOWED_ENTITIES || '');
        setMissing(data.missing || []);
        setPortLocked(data.portLocked ?? false);
        setPortLockedBy(data.portLockedBy ?? null);
      }
      setLoaded(true);
    }).catch(() => setLoaded(true));
  }

  // Load PIN settings
  if (!pinLoaded) {
    apiFetch<{ pinEnabled: boolean; pins: Array<{pin: string; permanent: boolean}> }>(
      '/api/guest/settings',
      { sessionId }
    ).then(data => {
      setPinEnabled(data.pinEnabled);
      setPins(data.pins);
      setPinLoaded(true);
    }).catch(() => setPinLoaded(true));
  }

  const isMissing = (field: string) => missing.includes(field);

  const handleTest = async () => {
    setTesting(true);
    setResult(null);
    try {
      const testUrl = haUrl;
      const testToken = haToken === '••••••••' ? '' : haToken;
      const data = await apiFetch<{ success: boolean; error?: string }>(
        '/api/setup/test-connection',
        { method: 'POST', body: JSON.stringify({ haUrl: testUrl, haToken: testToken || undefined }) }
      );
      if (data.success) {
        setResult({ type: 'success', message: 'Connection successful!' });
      } else {
        setResult({ type: 'error', message: data.error || 'Connection failed' });
      }
    } catch (err) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : 'Test failed' });
    } finally {
      setTesting(false);
    }
  };

  const performSave = async (): Promise<boolean> => {
    setSaving(true);
    setResult(null);
    setAdvResult(null);
    try {
      await apiFetch('/api/admin/config', {
        method: 'POST',
        sessionId,
        body: JSON.stringify({
          haUrl,
          haToken: haToken === '••••••••' ? undefined : haToken,
          port,
          logLevel,
          allowedEntities,
        }),
      });
      setMissing(m => m.filter(f =>
        (f === 'HA_URL' && !haUrl.trim()) || (f === 'HA_TOKEN' && !haToken.trim())
      ));
      onSaved?.();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save';
      setResult({ type: 'error', message: msg });
      setAdvResult({ type: 'error', message: msg });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    // Validate required fields
    if (!haUrl.trim()) {
      setResult({ type: 'error', message: 'Home Assistant URL is required' });
      return;
    }
    if (!haToken.trim() || (haToken === '••••••••' && isMissing('HA_TOKEN'))) {
      setResult({ type: 'error', message: 'Access token is required. Please enter your HA long-lived token.' });
      return;
    }
    const ok = await performSave();
    if (ok) setResult({ type: 'success', message: 'Settings saved!' });
  };

  const handleSaveAdvanced = async () => {
    const ok = await performSave();
    setAdvResult(ok
      ? { type: 'success', message: 'Advanced settings saved.' }
      : advResult
    );
  };

  // PIN management
  const savePinSettings = async (enabled: boolean, pinList: Array<{pin: string; permanent: boolean}>) => {
    setPinSaving(true);
    try {
      const data = await apiFetch<{ pinEnabled: boolean; pins: Array<{pin: string; permanent: boolean}> }>(
        '/api/guest/settings',
        { method: 'POST', sessionId, body: JSON.stringify({ pinEnabled: enabled, pins: pinList }) }
      );
      setPinEnabled(data.pinEnabled);
      setPins(data.pins);
    } catch {
      // Revert on failure
    } finally {
      setPinSaving(false);
    }
  };

  const handlePinToggle = () => {
    const next = !pinEnabled;
    setPinEnabled(next);
    savePinSettings(next, pins);
  };

  const handleAddPin = () => {
    const trimmed = newPin.trim();
    if (!trimmed || pins.some(p => p.pin === trimmed)) return;
    const next = [...pins, { pin: trimmed, permanent: newPinPermanent }];
    setPins(next);
    setNewPin('');
    setNewPinPermanent(false);
    savePinSettings(pinEnabled, next);
  };

  const handleRemovePin = (pin: string) => {
    const next = pins.filter(p => p.pin !== pin);
    setPins(next);
    savePinSettings(pinEnabled, next);
  };

  const handleTogglePermanent = (pin: string) => {
    const next = pins.map(p => p.pin === pin ? { ...p, permanent: !p.permanent } : p);
    setPins(next);
    savePinSettings(pinEnabled, next);
  };

  const hasMissing = missing.length > 0;

  const handleRestart = async () => {
    if (!confirm('Save settings and restart the server? This will briefly disconnect all clients.')) return;
    setRestarting(true);
    setAdvResult(null);
    // Save first so port/settings are persisted before restart
    const saved = await performSave();
    if (!saved) {
      setAdvResult({ type: 'error', message: 'Could not save settings — restart cancelled.' });
      setRestarting(false);
      return;
    }
    try {
      await apiFetch('/api/admin/restart', { method: 'POST', sessionId });
      setAdvResult({ type: 'success', message: 'Settings saved. Server restarting… page will reload in 5 seconds.' });
      setTimeout(() => window.location.reload(), 5000);
    } catch {
      setAdvResult({ type: 'error', message: 'Failed to restart server' });
      setRestarting(false);
    }
  };

  const content = (
    <div className={inline ? '' : 'modal settings-modal'} onClick={e => e.stopPropagation()}>
      {!inline && (
        <div className="modal-header">
          <h3>Settings</h3>
          <button type="button" className="action-button" onClick={onClose}>Close</button>
        </div>
      )}

      <div className="settings-form">
        {/* Guest PIN Access — prominent at top */}
        <div className="settings-section">
          <h3>🔒 Guest PIN Access</h3>
          <label className="pin-toggle-switch">
            <input
              type="checkbox"
              checked={pinEnabled}
              onChange={handlePinToggle}
              disabled={pinSaving}
            />
            <span className="pin-toggle-label">Require PIN for guest dashboard</span>
            <span className="pin-toggle-hint">{pinEnabled ? 'Enabled' : 'Disabled'}</span>
          </label>

          {pinEnabled && (
            <>
              <label style={{ fontSize: '0.85rem', color: '#8a9bc0', display: 'block', marginBottom: '0.5rem' }}>
                Allowed PINs ({pins.length})
              </label>

              {pins.length > 0 && (
                <ul className="pin-list">
                  {pins.map(p => (
                    <li key={p.pin}>
                      <span>{p.pin}</span>
                      <button
                        type="button"
                        className={`pin-badge ${p.permanent ? 'permanent' : 'expiring'}`}
                        onClick={() => handleTogglePermanent(p.pin)}
                        title={p.permanent ? 'Click to make expiring (7 days)' : 'Click to make permanent'}
                        disabled={pinSaving}
                      >
                        {p.permanent ? 'permanent' : '7-day'}
                      </button>
                      <button type="button" onClick={() => handleRemovePin(p.pin)} title="Remove PIN" disabled={pinSaving}>✕</button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="pin-add-row">
                <input
                  value={newPin}
                  onChange={e => setNewPin(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddPin(); }}
                  placeholder="Enter new PIN"
                  disabled={pinSaving}
                />
                <label className="pin-permanent-toggle" title="Permanent PINs never expire">
                  <input type="checkbox" checked={newPinPermanent} onChange={e => setNewPinPermanent(e.target.checked)} disabled={pinSaving} />
                  <span>Permanent</span>
                </label>
                <button type="button" onClick={handleAddPin} disabled={pinSaving || !newPin.trim()}>
                  Add
                </button>
              </div>

              {pinEnabled && pins.length === 0 && (
                <p className="note error" style={{ marginTop: '0.5rem', fontSize: '0.85rem' }}>
                  ⚠ PIN is enabled but no PINs are set. Guests won't be able to access the dashboard.
                </p>
              )}
            </>
          )}
        </div>

        {/* Server Connection */}
        <div className="settings-section">
          <h3>🌐 Server Connection</h3>

          {hasMissing && (
            <p className="note error" style={{ marginBottom: '0.75rem' }}>
              Required settings are missing. Please fill in the highlighted fields.
            </p>
          )}

          <div className={`form-field${isMissing('HA_URL') ? ' field-missing' : ''}`}>
            <label>
              Home Assistant URL
              {isMissing('HA_URL') && <span className="required-badge">required</span>}
            </label>
            <input
              value={haUrl}
              onChange={e => setHaUrl(e.target.value)}
              placeholder="http://homeassistant.local:8123"
            />
            {isMissing('HA_URL') && (
              <span className="field-hint">Enter your Home Assistant URL (e.g. http://192.168.1.x:8123)</span>
            )}
          </div>
          <div className={`form-field${isMissing('HA_TOKEN') ? ' field-missing' : ''}`}>
            <label>
              Long-Lived Access Token
              {isMissing('HA_TOKEN') && <span className="required-badge">required</span>}
            </label>
            <input
              value={haToken}
              onChange={e => setHaToken(e.target.value)}
              type="password"
              placeholder={isMissing('HA_TOKEN') ? 'Paste your HA token here' : ''}
            />
            {isMissing('HA_TOKEN') && (
              <span className="field-hint">
                Create a token in HA → Profile → Long-Lived Access Tokens → Create Token
              </span>
            )}
          </div>

          {result && <p className={`note ${result.type}`}>{result.message}</p>}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button type="button" className="action-button secondary" onClick={handleTest} disabled={testing || !haUrl}>
              {testing ? 'Testing...' : 'Test Connection'}
            </button>
            <button type="button" className="action-button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : hasMissing ? 'Save & Configure' : 'Save Settings'}
            </button>
          </div>
        </div>

        {/* Advanced */}
        <div className="settings-section">
          <h3>⚡ Advanced</h3>
          <div className="form-field">
            <label>Server Port</label>
            <input
              value={port}
              onChange={e => setPort(e.target.value)}
              placeholder="3000"
              type="number"
              min="1"
              max="65535"
              disabled={portLocked}
              style={portLocked ? { opacity: 0.5, cursor: 'not-allowed' } : undefined}
            />
            {portLocked
              ? <span className="field-hint" style={{ color: '#f0a040' }}>
                  ⚠️ Port is controlled by the <strong>{portLockedBy}</strong> and cannot be changed here.
                  Update it in your environment config and restart.
                </span>
              : <span className="field-hint">Restart required for port changes to take effect.</span>
            }
          </div>
          <div className="form-field">
            <label>Log Level</label>
            <select value={logLevel} onChange={e => setLogLevel(e.target.value)}>
              <option value="DEBUG">DEBUG</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
          <div className="form-field">
            <label>Allowed Entities <span style={{ fontWeight: 400, opacity: 0.7 }}>(optional, comma-separated)</span></label>
            <input
              value={allowedEntities}
              onChange={e => setAllowedEntities(e.target.value)}
              placeholder="light.living_room, switch.bedroom (leave empty for all)"
            />
            <span className="field-hint">
              Limit which entities are exposed. Leave empty to allow all.
            </span>
          </div>

          {advResult && <p className={`note ${advResult.type}`}>{advResult.message}</p>}

          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
            <button type="button" className="action-button" onClick={handleSaveAdvanced} disabled={saving || restarting}>
              {saving ? 'Saving...' : 'Save Advanced'}
            </button>
            <button
              type="button"
              className="action-button secondary"
              onClick={handleRestart}
              disabled={restarting || saving}
            >
              {restarting ? 'Restarting...' : '🔄 Save & Restart'}
            </button>
          </div>
          <span className="field-hint" style={{ marginTop: '0.4rem', display: 'block' }}>
            "Save &amp; Restart" saves all settings then restarts the server. Required for port changes.
          </span>
        </div>
      </div>
    </div>
  );

  if (inline) return content;

  return (
    <div className="modal-overlay" onClick={onClose}>
      {content}
    </div>
  );
}
