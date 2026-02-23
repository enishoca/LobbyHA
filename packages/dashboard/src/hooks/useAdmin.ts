import { useState, useCallback, useEffect } from 'react';
import { apiFetch } from '../shared/utils';

interface AdminSession {
  sessionId: string | null;
  hassUrl: string | null;
  hassToken: string | null;
  isDefaultPassword: boolean;
  authenticated: boolean;
}

export function useAdmin() {
  const [session, setSession] = useState<AdminSession>({
    sessionId: sessionStorage.getItem('adminSession'),
    hassUrl: null,
    hassToken: null,
    isDefaultPassword: false,
    authenticated: false,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check existing session on mount
  useEffect(() => {
    const stored = sessionStorage.getItem('adminSession');
    if (!stored) {
      setLoading(false);
      return;
    }
    apiFetch<{
      authenticated: boolean;
      hassUrl?: string;
      hassToken?: string;
      isDefaultPassword?: boolean;
    }>('/api/admin/session', { sessionId: stored })
      .then((data) => {
        if (data.authenticated) {
          setSession({
            sessionId: stored,
            hassUrl: data.hassUrl ?? null,
            hassToken: data.hassToken ?? null,
            isDefaultPassword: data.isDefaultPassword ?? false,
            authenticated: true,
          });
        } else {
          sessionStorage.removeItem('adminSession');
          setSession(prev => ({ ...prev, sessionId: null, authenticated: false }));
        }
      })
      .catch(() => {
        sessionStorage.removeItem('adminSession');
        setSession(prev => ({ ...prev, sessionId: null, authenticated: false }));
      })
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (password: string) => {
    setError(null);
    try {
      const data = await apiFetch<{
        success: boolean;
        sessionId?: string;
        isDefaultPassword?: boolean;
        error?: string;
      }>('/api/admin/login', {
        method: 'POST',
        body: JSON.stringify({ password }),
      });
      if (data.success && data.sessionId) {
        sessionStorage.setItem('adminSession', data.sessionId);
        // Fetch session data
        const sessionData = await apiFetch<{
          authenticated: boolean;
          hassUrl?: string;
          hassToken?: string;
          isDefaultPassword?: boolean;
        }>('/api/admin/session', { sessionId: data.sessionId });

        setSession({
          sessionId: data.sessionId,
          hassUrl: sessionData.hassUrl ?? null,
          hassToken: sessionData.hassToken ?? null,
          isDefaultPassword: data.isDefaultPassword ?? false,
          authenticated: true,
        });
      } else {
        setError(data.error ?? 'Login failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    }
  }, []);

  const logout = useCallback(async () => {
    if (session.sessionId) {
      await apiFetch('/api/admin/logout', {
        method: 'POST',
        sessionId: session.sessionId,
      }).catch(() => {});
    }
    sessionStorage.removeItem('adminSession');
    setSession({
      sessionId: null,
      hassUrl: null,
      hassToken: null,
      isDefaultPassword: false,
      authenticated: false,
    });
  }, [session.sessionId]);

  return { session, loading, error, login, logout, setError };
}
