import { useState, useEffect } from 'react';
import { apiFetch } from '../shared/utils';
import { AreaCard } from '../components/AreaCard';
import { ConnectionStatus } from '../components/ConnectionStatus';
import type { Module } from '../types/modules';
import '../App.css';

export function GuestDashboard() {
  const [modules, setModules] = useState<Module[]>([]);
  const [title, setTitle] = useState('LobbyHA');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const [guestData, modulesData] = await Promise.all([
          apiFetch<{ title: string; entities: string[] }>('/api/ui/guest-entities'),
          apiFetch<{ modules: Module[] }>('/api/ui/guest-modules'),
        ]);
        if (!active) return;
        setTitle(guestData.title || 'LobbyHA');
        setModules(modulesData.modules);
      } catch {
        // guest degrades gracefully
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => { active = false; };
  }, []);

  if (loading) {
    return (
      <div className="container">
        <p className="note">Loading...</p>
      </div>
    );
  }

  return (
    <div className="guest-layout">
      <header className="guest-header">
        <h1 className="dashboard-title">{title}</h1>
        <ConnectionStatus />
      </header>

      <main className="guest-main">
        {modules.length === 0 ? (
          <div className="empty-state">
            <p>No areas configured yet. Ask the admin to set up the dashboard.</p>
          </div>
        ) : (
          modules.map(module => (
            <AreaCard
              key={module.id}
              name={module.name}
              icon={module.icon}
              entityIds={module.entities}
            />
          ))
        )}
      </main>
    </div>
  );
}
