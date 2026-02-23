import { useState } from 'react';
import '../App.css';

interface AdminLoginProps {
  onLogin: (password: string) => Promise<void>;
  error: string | null;
}

export function AdminLogin({ onLogin, error }: AdminLoginProps) {
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    await onLogin(password);
    setLoggingIn(false);
  };

  return (
    <div className="container">
      <h1 style={{
        fontSize: '1.85rem',
        fontWeight: 800,
        background: 'var(--accent-gradient)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>
        Admin Login
      </h1>
      <form className="login-form" onSubmit={handleSubmit}>
        <input
          className="login-input"
          type="password"
          placeholder="Admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        <button type="submit" className="action-button" disabled={loggingIn}>
          {loggingIn ? 'Logging in...' : 'Login'}
        </button>
      </form>
      {error && <p className="note error">{error}</p>}
    </div>
  );
}
