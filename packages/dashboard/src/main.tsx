import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { HassConnect } from '@hakit/core';
import { ThemeProvider } from '@hakit/components';
import { GuestDashboard } from './guest/GuestDashboard';
import { PinGate } from './guest/PinGate';
import './index.css';

/** In-memory guest session — cleared on page reload */
let guestSessionId: string | null = null;

/** Wrapper to inject X-Guest-Session into all fetch requests */
function patchFetchWithSession() {
  const originalFetch = window.fetch;
  window.fetch = function (input, init) {
    if (guestSessionId) {
      const headers = new Headers(init?.headers);
      if (!headers.has('X-Guest-Session')) {
        headers.set('X-Guest-Session', guestSessionId);
      }
      return originalFetch.call(this, input, { ...init, headers });
    }
    return originalFetch.call(this, input, init);
  };
}

/**
 * Guest entry point.
 * Checks PIN status, shows PIN gate if required, then connects via HassConnect.
 */
async function boot() {
  const root = createRoot(document.getElementById('root')!);

  try {
    // Check if PIN is required
    const pinRes = await fetch('/api/guest/status');
    const pinData = await pinRes.json();

    if (pinData.pinEnabled && !pinData.authenticated) {
      // PIN is required and no valid session — show PIN gate
      root.render(
        <StrictMode>
          <PinGate onAuthenticated={(sessionId) => {
            guestSessionId = sessionId;
            patchFetchWithSession();
            renderDashboard(root);
          }} />
        </StrictMode>
      );
      return;
    }

    // No PIN required — render dashboard directly
    renderDashboard(root);
  } catch {
    root.render(
      <StrictMode>
        <div className="container">
          <h1>LobbyHA</h1>
          <p className="note error">Failed to connect to server.</p>
          <button type="button" className="action-button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </StrictMode>
    );
  }
}

async function renderDashboard(root: ReturnType<typeof createRoot>) {
  try {
    // Get HA connection info from public config endpoint
    let hassUrl = '';
    let hassToken = '';

    const configRes = await fetch('/api/config');
    if (configRes.ok) {
      const configData = await configRes.json();
      hassUrl = configData.hassUrl || configData.haUrl || '';
      hassToken = configData.hassToken || '';
    }

    if (!hassUrl) {
      root.render(
        <StrictMode>
          <div className="container">
            <h1>LobbyHA</h1>
            <p className="note">Dashboard not configured yet.</p>
            <a href="/setup" className="action-button">Run Setup</a>
          </div>
        </StrictMode>
      );
      return;
    }

    root.render(
      <StrictMode>
        <HassConnect
          hassUrl={hassUrl}
          hassToken={hassToken}
          loading={
            <div className="container">
              <p className="note">Connecting to Home Assistant...</p>
            </div>
          }
          options={{
            renderError: () => (
              <div className="container">
                <h1>LobbyHA</h1>
                <p className="note error">
                  Unable to connect to Home Assistant.<br />
                  Make sure HA is running and the server config is correct.
                </p>
                <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
                  <button type="button" className="action-button" onClick={() => window.location.reload()}>
                    Retry
                  </button>
                  <a href="/admin" className="action-button secondary">Admin Settings</a>
                </div>
              </div>
            ),
          }}
        >
          <ThemeProvider />
          <GuestDashboard />
        </HassConnect>
      </StrictMode>
    );
  } catch {
    root.render(
      <StrictMode>
        <div className="container">
          <h1>LobbyHA</h1>
          <p className="note error">Failed to connect to server.</p>
          <button type="button" className="action-button" onClick={() => window.location.reload()}>
            Retry
          </button>
        </div>
      </StrictMode>
    );
  }
}

boot();
