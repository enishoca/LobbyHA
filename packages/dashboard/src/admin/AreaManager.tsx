import { useState, useCallback } from 'react';
import { apiFetch } from '../shared/utils';
import type { Module } from '../types/modules';

interface AreaManagerProps {
  sessionId: string;
  modules: Module[];
  onModulesChange: (modules: Module[]) => void;
  onClose: () => void;
}

export function AreaManager({ sessionId, modules, onModulesChange, onClose }: AreaManagerProps) {
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('🏠');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editIcon, setEditIcon] = useState('');

  const reload = useCallback(async () => {
    const data = await apiFetch<{ modules: Module[] }>('/api/ui/modules', { sessionId });
    onModulesChange(data.modules);
  }, [sessionId, onModulesChange]);

  const createArea = async () => {
    if (!newName.trim()) return;
    await apiFetch('/api/ui/modules', {
      method: 'POST',
      sessionId,
      body: JSON.stringify({ name: newName.trim(), icon: newIcon }),
    });
    setNewName('');
    setNewIcon('🏠');
    reload();
  };

  const updateArea = async (id: number) => {
    await apiFetch(`/api/ui/modules/${id}`, {
      method: 'PUT',
      sessionId,
      body: JSON.stringify({ name: editName, icon: editIcon }),
    });
    setEditingId(null);
    reload();
  };

  const deleteArea = async (id: number) => {
    if (!confirm('Delete this area and remove all entity assignments?')) return;
    await apiFetch(`/api/ui/modules/${id}`, { method: 'DELETE', sessionId });
    reload();
  };

  const toggleVisibility = async (module: Module) => {
    await apiFetch(`/api/ui/modules/${module.id}`, {
      method: 'PUT',
      sessionId,
      body: JSON.stringify({ visible: !module.visible }),
    });
    reload();
  };

  const moveArea = async (id: number, direction: 'up' | 'down') => {
    const idx = modules.findIndex(m => m.id === id);
    if (idx < 0) return;
    const newOrder = [...modules.map(m => m.id)];
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= newOrder.length) return;
    [newOrder[idx], newOrder[swapIdx]] = [newOrder[swapIdx], newOrder[idx]];
    await apiFetch('/api/ui/modules/reorder', {
      method: 'POST',
      sessionId,
      body: JSON.stringify({ moduleIds: newOrder }),
    });
    reload();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '550px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Manage Areas</h3>
          <button type="button" className="action-button" onClick={onClose}>Close</button>
        </div>

        {/* Create new area */}
        <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            style={{ width: '3rem', textAlign: 'center' }}
            value={newIcon}
            onChange={e => setNewIcon(e.target.value)}
            placeholder="🏠"
          />
          <input
            style={{ flex: 1 }}
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="Area name..."
            onKeyDown={e => e.key === 'Enter' && createArea()}
          />
          <button type="button" className="action-button" onClick={createArea}>Add</button>
        </div>

        {/* Area list */}
        <ul className="hidden-list">
          {modules.map((mod, idx) => (
            <li key={mod.id}>
              {editingId === mod.id ? (
                <div style={{ display: 'flex', gap: '0.5rem', flex: 1, alignItems: 'center' }}>
                  <input
                    style={{ width: '3rem', textAlign: 'center' }}
                    value={editIcon}
                    onChange={e => setEditIcon(e.target.value)}
                  />
                  <input
                    style={{ flex: 1 }}
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && updateArea(mod.id)}
                    autoFocus
                  />
                  <button type="button" className="action-button" onClick={() => updateArea(mod.id)}>✓</button>
                  <button type="button" className="action-button" onClick={() => setEditingId(null)}>✕</button>
                </div>
              ) : (
                <>
                  <div>
                    <div className="hidden-name">{mod.icon} {mod.name}</div>
                    <div className="hidden-id">
                      {mod.entities.length} entities · {mod.visible ? 'visible' : 'hidden'}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    <button type="button" className="action-button" onClick={() => moveArea(mod.id, 'up')} disabled={idx === 0}>↑</button>
                    <button type="button" className="action-button" onClick={() => moveArea(mod.id, 'down')} disabled={idx === modules.length - 1}>↓</button>
                    <button type="button" className="action-button" onClick={() => toggleVisibility(mod)}>
                      {mod.visible ? '👁' : '👁‍🗨'}
                    </button>
                    <button type="button" className="action-button" onClick={() => { setEditingId(mod.id); setEditName(mod.name); setEditIcon(mod.icon); }}>✏️</button>
                    <button type="button" className="action-button" onClick={() => deleteArea(mod.id)}>🗑</button>
                  </div>
                </>
              )}
            </li>
          ))}
          {modules.length === 0 && (
            <p className="note">No areas yet. Create one above to organize your entities.</p>
          )}
        </ul>
      </div>
    </div>
  );
}
