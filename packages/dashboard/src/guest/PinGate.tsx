import { useState, useRef, useEffect } from 'react';

interface PinGateProps {
  onAuthenticated: (guestSessionId: string) => void;
}

export function PinGate({ onAuthenticated }: PinGateProps) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = async () => {
    if (!pin.trim()) return;
    setVerifying(true);
    setError(null);
    try {
      const res = await fetch('/api/guest/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: pin.trim() }),
      });
      const data = await res.json();
      if (data.success && data.guestSessionId) {
        onAuthenticated(data.guestSessionId);
      } else {
        setError(data.error || 'Invalid PIN');
        setPin('');
        inputRef.current?.focus();
      }
    } catch {
      setError('Connection error. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <div className="pin-gate">
      <div className="pin-card">
        <h1 className="pin-title">🏠</h1>
        <h2 className="pin-subtitle">Enter PIN to continue</h2>

        <input
          ref={inputRef}
          className="pin-input"
          type="password"
          inputMode="numeric"
          pattern="[0-9]*"
          maxLength={10}
          value={pin}
          onChange={e => setPin(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="• • • •"
          disabled={verifying}
          autoComplete="off"
        />

        {error && <p className="pin-error">{error}</p>}

        <button
          type="button"
          className="pin-submit"
          onClick={handleSubmit}
          disabled={verifying || !pin.trim()}
        >
          {verifying ? 'Verifying...' : 'Enter'}
        </button>
      </div>
    </div>
  );
}
