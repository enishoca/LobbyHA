import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { SetupWizard } from './admin/SetupWizard';
import { apiFetch } from './shared/utils';
import './index.css';

function SetupApp() {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [existingConfig, setExistingConfig] = useState<{ HA_URL?: string; HA_TOKEN?: string; PORT?: string; LOG_LEVEL?: string } | undefined>();
  const [forceReconfig, setForceReconfig] = useState(false);

  useEffect(() => {
    apiFetch<{
      needsSetup: boolean;
      config?: { HA_URL: string; HA_TOKEN: string; PORT: string; LOG_LEVEL: string };
    }>('/api/setup/status')
      .then(data => {
        setNeedsSetup(data.needsSetup);
        if (data.config) setExistingConfig(data.config);
      })
      .catch(() => setNeedsSetup(true));
  }, []);

  if (needsSetup === null) {
    return <div className="container"><p className="note">Checking setup status...</p></div>;
  }

  // Already configured: offer reconfiguration
  if (!needsSetup && !forceReconfig) {
    return (
      <div className="container">
        <h1>Already Configured</h1>
        <p className="note">Your LobbyHA dashboard is already set up.</p>
        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/admin" className="action-button">Admin Dashboard</a>
          <a href="/" className="action-button secondary">Guest Dashboard</a>
          <button
            type="button"
            className="action-button secondary"
            onClick={() => setForceReconfig(true)}
          >
            Reconfigure
          </button>
        </div>
      </div>
    );
  }

  return (
    <SetupWizard
      existingConfig={existingConfig}
      reconfigure={forceReconfig}
    />
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SetupApp />
  </StrictMode>
);
