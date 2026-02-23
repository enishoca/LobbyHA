import { useState, useEffect } from 'react';
import { apiFetch } from '../shared/utils';
import '../App.css';

type Step = 'url' | 'token' | 'test' | 'password' | 'pin' | 'done';

interface SetupWizardProps {
  /** Pre-fill existing config for reconfiguration */
  existingConfig?: { HA_URL?: string; HA_TOKEN?: string; PORT?: string; LOG_LEVEL?: string };
  /** If true, we're reconfiguring - skip password step if already set */
  reconfigure?: boolean;
}

export function SetupWizard({ existingConfig, reconfigure }: SetupWizardProps = {}) {
  const [step, setStep] = useState<Step>('url');
  const [haUrl, setHaUrl] = useState('');
  const [haToken, setHaToken] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [port, setPort] = useState('3000');
  const [testing, setTesting] = useState(false);
  const [testPassed, setTestPassed] = useState(false);
  const [testVersion, setTestVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [configLoaded, setConfigLoaded] = useState(false);

  // PIN settings
  const [pinEnabled, setPinEnabled] = useState(false);
  const [pins, setPins] = useState<Array<{pin: string; permanent: boolean}>>([]);
  const [newPin, setNewPin] = useState('');
  const [newPinPermanent, setNewPinPermanent] = useState(false);

  // Pre-fill from existing config
  useEffect(() => {
    if (existingConfig) {
      if (existingConfig.HA_URL && existingConfig.HA_URL !== 'http://localhost:8123') {
        setHaUrl(existingConfig.HA_URL);
      } else {
        setHaUrl('http://homeassistant.local:8123');
      }
      setConfigLoaded(true);
      return;
    }
    // If no config passed, try fetching from server
    apiFetch<{ needsSetup: boolean; config?: { HA_URL: string; HA_TOKEN: string } }>(
      '/api/setup/status'
    ).then(data => {
      if (data.config?.HA_URL && data.config.HA_URL !== 'http://localhost:8123') {
        setHaUrl(data.config.HA_URL);
      } else {
        setHaUrl('http://homeassistant.local:8123');
      }
      setConfigLoaded(true);
    }).catch(() => {
      setHaUrl('http://homeassistant.local:8123');
      setConfigLoaded(true);
    });
  }, [existingConfig]);

  const handleTestConnection = async () => {
    setTesting(true);
    setTestPassed(false);
    setTestVersion(null);
    setError(null);
    try {
      const result = await apiFetch<{ success: boolean; version?: string; error?: string }>(
        '/api/setup/test-connection',
        { method: 'POST', body: JSON.stringify({ haUrl, haToken }) }
      );
      if (result.success) {
        setTestPassed(true);
        setTestVersion(result.version ?? null);
      } else {
        setError(result.error || 'Connection failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleConfigure = async () => {
    if (!reconfigure) {
      if (adminPassword !== confirmPassword) {
        setError('Passwords do not match');
        return;
      }
      if (adminPassword.length < 4) {
        setError('Password must be at least 4 characters');
        return;
      }
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch('/api/setup/configure', {
        method: 'POST',
        body: JSON.stringify({
          haUrl,
          haToken,
          adminPassword: reconfigure ? undefined : adminPassword,
          port: port || undefined,
          pinEnabled: pinEnabled || undefined,
          pins: pinEnabled && pins.length > 0 ? pins : undefined,
        }),
      });
      setStep('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setSaving(false);
    }
  };

  // For reconfigure flow: save immediately after test succeeds
  useEffect(() => {
    if (step === ('done-reconfig' as Step)) {
      setSaving(true);
      apiFetch('/api/setup/configure', {
        method: 'POST',
        body: JSON.stringify({ haUrl, haToken }),
      }).then(() => {
        setStep('done');
      }).catch(err => {
        setError(err instanceof Error ? err.message : 'Setup failed');
        setStep('token');
      }).finally(() => setSaving(false));
    }
  }, [step, haUrl, haToken]);

  if (!configLoaded) {
    return <div className="container"><p className="note">Loading configuration...</p></div>;
  }

    return (
    <div className="setup-wizard">
      <div className="setup-card">
        <h1 className="setup-title">{reconfigure ? 'Reconfigure LobbyHA' : 'LobbyHA Setup'}</h1>

        {/* Progress bar */}
        <div className="setup-progress">
          {(reconfigure
            ? ['url', 'token', 'test', 'done']
            : ['url', 'token', 'test', 'password', 'pin', 'done']
          ).map((s, i) => (
            <div
              key={s}
              className={`setup-step ${s === step ? 'active' : ''} ${
                (reconfigure
                  ? ['url', 'token', 'test', 'done']
                  : ['url', 'token', 'test', 'password', 'pin', 'done']
                ).indexOf(step) > i ? 'completed' : ''
              }`}
            >
              <div className="step-dot">{i + 1}</div>
              <span className="step-label">
                {s === 'url' ? 'URL' : s === 'token' ? 'Token' : s === 'test' ? 'Test' : s === 'password' ? 'Password' : s === 'pin' ? 'PIN' : 'Done'}
              </span>
            </div>
          ))}
        </div>

        {/* Step 1: URL */}
        {step === 'url' && (
          <div className="setup-step-content">
            <h2>Home Assistant URL</h2>
            <p>{reconfigure ? 'Update your Home Assistant URL.' : 'Enter the URL of your Home Assistant instance.'}</p>
            <input
              className="setup-input"
              value={haUrl}
              onChange={e => setHaUrl(e.target.value)}
              placeholder="http://homeassistant.local:8123"
              autoFocus
            />
            <p className="note">Usually http://homeassistant.local:8123 or your HA IP address.</p>
            <div className="setup-actions">
              <button
                type="button"
                className="action-button"
                onClick={() => setStep('token')}
                disabled={!haUrl.trim()}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Token */}
        {step === 'token' && (
          <div className="setup-step-content">
            <h2>Access Token</h2>
            {reconfigure ? (
              <p>Enter a new token or paste the existing one to re-verify.</p>
            ) : (
              <>
                <p>Create a Long-Lived Access Token in Home Assistant:</p>
                <ol className="setup-instructions">
                  <li>Go to your HA Profile (click your name in the sidebar)</li>
                  <li>Scroll to "Long-Lived Access Tokens"</li>
                  <li>Click "Create Token"</li>
                  <li>Name it "LobbyHA" and copy the token</li>
                </ol>
              </>
            )}
            <input
              className="setup-input"
              type="password"
              value={haToken}
              onChange={e => setHaToken(e.target.value)}
              placeholder="Paste your token here"
              autoFocus
            />
            <div className="setup-actions">
              <button type="button" className="action-button secondary" onClick={() => setStep('url')}>
                ← Back
              </button>
              <button
                type="button"
                className="action-button"
                onClick={() => { setStep('test'); handleTestConnection(); }}
                disabled={!haToken.trim()}
              >
                Test Connection →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Testing */}
        {step === 'test' && (
          <div className="setup-step-content">
            <h2>Testing Connection</h2>
            {testing ? (
              <p className="note">Connecting to Home Assistant...</p>
            ) : testPassed ? (
              <>
                <p className="note" style={{ color: '#4ade80' }}>✓ Connected successfully!{testVersion ? ` (HA ${testVersion})` : ''}</p>
                <div className="setup-actions">
                  <button type="button" className="action-button secondary" onClick={() => setStep('token')}>
                    ← Back
                  </button>
                  <button
                    type="button"
                    className="action-button"
                    onClick={() => setStep(reconfigure ? 'done-reconfig' as Step : 'password')}
                  >
                    Next →
                  </button>
                </div>
              </>
            ) : error ? (
              <>
                <p className="note error">{error}</p>
                <div className="setup-actions">
                  <button type="button" className="action-button secondary" onClick={() => setStep('token')}>
                    ← Back
                  </button>
                  <button type="button" className="action-button" onClick={handleTestConnection}>
                    Retry
                  </button>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Step 4: Password */}
        {step === 'password' && (
          <div className="setup-step-content">
            <h2>Set Admin Password</h2>
            <p>Connection successful! Now set your admin password.</p>
            <input
              className="setup-input"
              type="password"
              value={adminPassword}
              onChange={e => setAdminPassword(e.target.value)}
              placeholder="Admin password"
              autoFocus
            />
            <input
              className="setup-input"
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Confirm password"
            />
            <div className="setup-advanced">
              <details>
                <summary>Advanced Settings</summary>
                <div className="form-field" style={{ marginTop: '0.75rem' }}>
                  <label>Server Port</label>
                  <input
                    className="setup-input"
                    type="number"
                    value={port}
                    onChange={e => setPort(e.target.value)}
                    placeholder="3000"
                    min="1"
                    max="65535"
                  />
                  <p className="note" style={{ marginTop: '0.25rem', fontSize: '0.82rem' }}>
                    Default: 3000. Change only if needed.
                  </p>
                </div>
              </details>
            </div>
            {error && <p className="note error">{error}</p>}
            <div className="setup-actions">
              <button type="button" className="action-button secondary" onClick={() => setStep('token')}>
                ← Back
              </button>
              <button
                type="button"
                className="action-button"
                onClick={() => { setError(null); setStep('pin'); }}
                disabled={!adminPassword || !confirmPassword || adminPassword !== confirmPassword || adminPassword.length < 4}
              >
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Guest PIN (optional) */}
        {step === 'pin' && (
          <div className="setup-step-content">
            <h2>🔒 Guest PIN Access</h2>
            <p>Control who can see your guest dashboard. When enabled, guests must enter a PIN before they can view any controls.</p>

            <div className="pin-setup-card">
              <label className="pin-toggle-switch">
                <input
                  type="checkbox"
                  checked={pinEnabled}
                  onChange={e => setPinEnabled(e.target.checked)}
                />
                <span className="pin-toggle-label">Require PIN for guest access</span>
                <span className="pin-toggle-hint">{pinEnabled ? '✓ Enabled' : 'Disabled'}</span>
              </label>

              {pinEnabled && (
                <>
                  {pins.length > 0 && (
                    <ul className="pin-list" style={{ marginBottom: '0.75rem' }}>
                      {pins.map(p => (
                        <li key={p.pin}>
                          <span>{p.pin}</span>
                          {p.permanent && <span className="pin-badge permanent">permanent</span>}
                          {!p.permanent && <span className="pin-badge expiring">7-day</span>}
                          <button type="button" onClick={() => setPins(pins.filter(x => x.pin !== p.pin))}>✕</button>
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="pin-add-row" style={{ marginBottom: '0.75rem' }}>
                    <input
                      value={newPin}
                      onChange={e => setNewPin(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' && newPin.trim()) {
                          setPins([...pins, { pin: newPin.trim(), permanent: newPinPermanent }]);
                          setNewPin('');
                          setNewPinPermanent(false);
                        }
                      }}
                      placeholder="Enter a PIN (e.g. 1234)"
                      autoFocus
                    />
                    <label className="pin-permanent-toggle" title="Permanent PINs never expire">
                      <input type="checkbox" checked={newPinPermanent} onChange={e => setNewPinPermanent(e.target.checked)} />
                      <span>Permanent</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => { if (newPin.trim()) { setPins([...pins, { pin: newPin.trim(), permanent: newPinPermanent }]); setNewPin(''); setNewPinPermanent(false); } }}
                      disabled={!newPin.trim()}
                    >
                      Add
                    </button>
                  </div>
                  {pins.length === 0 && (
                    <p className="note error" style={{ fontSize: '0.85rem' }}>
                      Add at least one PIN or disable PIN access.
                    </p>
                  )}
                  {pins.length > 0 && (
                    <p className="note" style={{ fontSize: '0.82rem', color: '#8a9bc0' }}>
                      💡 You can add multiple PINs — e.g. one per guest or group. Non-permanent PINs expire after 7 days.
                    </p>
                  )}
                </>
              )}

              {!pinEnabled && (
                <p className="note" style={{ fontSize: '0.82rem', color: '#8a9bc0', marginTop: '-0.5rem' }}>
                  Anyone with the URL can access the guest dashboard. You can enable this later in Settings.
                </p>
              )}
            </div>

            {error && <p className="note error">{error}</p>}
            <div className="setup-actions">
              <button type="button" className="action-button secondary" onClick={() => setStep('password')}>
                ← Back
              </button>
              <button
                type="button"
                className="action-button"
                onClick={handleConfigure}
                disabled={saving || (pinEnabled && pins.length === 0)}
              >
                {saving ? 'Setting up...' : 'Complete Setup'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Done */}
        {step === 'done' && (
          <div className="setup-step-content">
            <h2>Setup Complete! 🎉</h2>
            <p>Your LobbyHA dashboard is ready.</p>
            <div className="setup-actions">
              <a href="/admin" className="action-button">
                Open Admin Dashboard →
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
