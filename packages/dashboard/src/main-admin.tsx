import { StrictMode, useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { HassConnect } from '@hakit/core';
import { ThemeProvider } from '@hakit/components';
import { AdminDashboard } from './admin/AdminDashboard';
import { AdminLogin } from './admin/AdminLogin';
import { SettingsPanel } from './admin/SettingsPanel';
import { apiFetch } from './shared/utils';
import './index.css';

function AdminApp() {
  const [sessionId, setSessionId] = useState<string | null>(() => sessionStorage.getItem('admin_session'));
  const [hassUrl, setHassUrl] = useState('');
  const [hassToken, setHassToken] = useState('');
  const [loginError, setLoginError] = useState<string | null>(null);
  const [checking, setChecking] = useState(true);

  // Check for existing session on mount
  useEffect(() => {
    const check = async () => {
      const stored = sessionStorage.getItem('admin_session');
      if (!stored) { setChecking(false); return; }
      try {
        const data = await apiFetch<{ valid: boolean; hassUrl: string; hassToken: string }>(
          '/api/admin/session',
          { sessionId: stored }
        );
        if (data.valid) {
          setSessionId(stored);
          setHassUrl(data.hassUrl);
          setHassToken(data.hassToken);
        } else {
          sessionStorage.removeItem('admin_session');
          setSessionId(null);
        }
      } catch {
        sessionStorage.removeItem('admin_session');
        setSessionId(null);
      } finally {
        setChecking(false);
      }
    };
    check();
  }, []);

  const handleLogin = async (password: string) => {
    setLoginError(null);
    try {
      const data = await apiFetch<{ success: boolean; sessionId: string; hassUrl: string; hassToken: string }>(
        '/api/admin/login',
        { method: 'POST', body: JSON.stringify({ password }) }
      );
      if (data.success) {
        sessionStorage.setItem('admin_session', data.sessionId);
        setSessionId(data.sessionId);
        setHassUrl(data.hassUrl);
        setHassToken(data.hassToken);
      } else {
        setLoginError('Invalid password');
      }
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : 'Login failed');
    }
  };

  const handleLogout = async () => {
    if (sessionId) {
      try {
        await apiFetch('/api/admin/logout', { method: 'POST', sessionId });
      } catch {
        // ignore
      }
    }
    sessionStorage.removeItem('admin_session');
    setSessionId(null);
    setHassUrl('');
    setHassToken('');
  };

  if (checking) {
    return <div className="container"><p className="note">Loading...</p></div>;
  }

  if (!sessionId) {
    return <AdminLogin onLogin={handleLogin} error={loginError} />;
  }

  if (!hassUrl) {
    return (
      <div className="container">
        <p className="note">Server not configured. <a href="/setup">Run setup</a></p>
      </div>
    );
  }

  return (
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
            <h1 style={{
              fontSize: '1.85rem',
              fontWeight: 800,
              background: 'var(--accent-gradient)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              LobbyHA Admin
            </h1>
            <p className="note error" style={{ marginBottom: '1.5rem' }}>
              Unable to connect to Home Assistant.<br />
              Update the settings below and save to reconnect.
            </p>
            <SettingsPanel
              sessionId={sessionId}
              inline
              onSaved={() => {
                // Reload after a short delay to allow server to pick up new config
                setTimeout(() => window.location.reload(), 1500);
              }}
            />
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '1rem' }}>
              <button type="button" className="action-button" onClick={() => window.location.reload()}>
                Retry Connection
              </button>
              <button type="button" className="action-button secondary" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>
        ),
      }}
    >
      <ThemeProvider />
      <AdminDashboard
        sessionId={sessionId}
        hassUrl={hassUrl}
        hassToken={hassToken}
        onLogout={handleLogout}
      />
    </HassConnect>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AdminApp />
  </StrictMode>
);
