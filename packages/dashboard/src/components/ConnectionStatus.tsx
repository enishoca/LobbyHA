import { useHass } from '@hakit/core';

type ConnectionStatus = 'connected' | 'disconnected' | 'connecting' | string;

export function ConnectionStatus() {
  const connectionStatus = useHass((state: { connectionStatus?: ConnectionStatus }) => state.connectionStatus);
  const statusClass = connectionStatus === 'connected' ? 'connected' : 'error';

  return (
    <div className={`status ${statusClass}`}>
      {connectionStatus === 'connected' ? 'connected' : 'not connected'}
    </div>
  );
}
