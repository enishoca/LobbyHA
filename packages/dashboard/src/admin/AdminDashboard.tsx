import { useState, useEffect, useCallback, useRef } from 'react';
import { apiFetch } from '../shared/utils';
import { EntityCard } from '../components/EntityCard';
import { EntityDiscovery } from './EntityDiscovery';
import { AreaManager } from './AreaManager';
import { SettingsPanel } from './SettingsPanel';
import { EntityPropEditor } from './EntityPropEditor';
import type { Module } from '../types/modules';
import QRCode from 'qrcode';
import '../App.css';

interface AdminDashboardProps {
  sessionId: string;
  hassUrl: string;
  hassToken: string;
  onLogout: () => void;
}

export function AdminDashboard({ sessionId, hassUrl, hassToken, onLogout }: AdminDashboardProps) {
  // State
  const [modules, setModules] = useState<Module[]>([]);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());
  const [dashboardTitle, setDashboardTitle] = useState('LobbyHA');
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [loading, setLoading] = useState(true);

  // Panels
  const [showDiscovery, setShowDiscovery] = useState(false);
  const [showAreaManager, setShowAreaManager] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showHidden, setShowHidden] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showPasswordChange, setShowPasswordChange] = useState(false);

  // Entity display props (custom icon/name/display overrides)
  const [entityProps, setEntityProps] = useState<Record<string, {
    custom_name?: string | null; custom_icon?: string | null;
    show_last_updated?: boolean; hide_state?: boolean; hide_updated?: boolean;
    hide_attributes?: boolean; hide_logbook?: boolean;
  }>>({});
  const [editingEntityId, setEditingEntityId] = useState<string | null>(null);
  const [editingAnchorRect, setEditingAnchorRect] = useState<DOMRect | null>(null);

  // Password change
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passMsg, setPassMsg] = useState<string | null>(null);

  // QR
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  // Refs
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  // Load data. silent=true skips the loading spinner (for background refreshes)
  const loadAll = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [modulesData, hiddenData, guestData, propsData] = await Promise.all([
        apiFetch<{ modules: Module[] }>('/api/ui/modules', { sessionId }),
        apiFetch<{ hidden: string[] }>('/api/ui/hidden', { sessionId }),
        apiFetch<{ title: string }>('/api/ui/guest-entities', { sessionId }),
        apiFetch<{ props: Array<{ entity_id: string; custom_name?: string | null; custom_icon?: string | null; show_last_updated?: boolean; hide_state?: boolean; hide_updated?: boolean; hide_attributes?: boolean; hide_logbook?: boolean }> }>('/api/ui/entity-props', { sessionId }),
      ]);
      setModules(modulesData.modules);
      setHiddenIds(new Set(hiddenData.hidden));
      setDashboardTitle(guestData.title || 'LobbyHA');
      // Build props lookup map
      const propsMap: Record<string, { custom_name?: string | null; custom_icon?: string | null; show_last_updated?: boolean; hide_state?: boolean; hide_updated?: boolean; hide_attributes?: boolean; hide_logbook?: boolean }> = {};
      for (const p of propsData.props) {
        propsMap[p.entity_id] = p;
      }
      setEntityProps(propsMap);
    } catch {
      // errors handled gracefully
    } finally {
      if (!silent) setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => { loadAll(); }, [loadAll]);

  // Close settings menu on outside click
  useEffect(() => {
    if (!showSettingsMenu) return;
    const handler = (e: MouseEvent) => {
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(e.target as Node)) {
        setShowSettingsMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showSettingsMenu]);

  // Title editing
  const handleTitleEdit = () => { setTitleDraft(dashboardTitle); setEditingTitle(true); };
  const handleTitleSave = async () => {
    const trimmed = titleDraft.trim() || 'LobbyHA';
    setDashboardTitle(trimmed);
    setEditingTitle(false);
    await apiFetch('/api/ui/guest-entities', {
      method: 'POST', sessionId,
      body: JSON.stringify({ title: trimmed }),
    });
  };

  // Hide/unhide
  const handleHide = async (entityId: string) => {
    const next = new Set(hiddenIds);
    next.add(entityId);
    setHiddenIds(next);
    await apiFetch('/api/ui/hidden', {
      method: 'POST', sessionId,
      body: JSON.stringify({ hidden: Array.from(next) }),
    });
  };

  const handleUnhide = async (entityId: string) => {
    const next = new Set(hiddenIds);
    next.delete(entityId);
    setHiddenIds(next);
    await apiFetch('/api/ui/hidden', {
      method: 'POST', sessionId,
      body: JSON.stringify({ hidden: Array.from(next) }),
    });
  };

  // Assign entity to an area or remove from all areas
  const handleAssignEntity = async (entityId: string, moduleId: number | null) => {
    // First, remove entity from any current area
    const currentModule = modules.find(m => m.entities.includes(entityId));
    if (currentModule) {
      const cleaned = currentModule.entities.filter(e => e !== entityId);
      setModules(prev => prev.map(m =>
        m.id === currentModule.id ? { ...m, entities: cleaned } : m
      ));
      await apiFetch(`/api/ui/modules/${currentModule.id}/entities`, {
        method: 'POST', sessionId,
        body: JSON.stringify({ entities: cleaned }),
      });
    }

    // Then add to the target area (if not "None")
    if (moduleId !== null) {
      const targetModule = modules.find(m => m.id === moduleId);
      if (targetModule) {
        const newEntities = [...targetModule.entities.filter(e => e !== entityId), entityId];
        setModules(prev => prev.map(m =>
          m.id === targetModule.id ? { ...m, entities: newEntities } : m
        ));
        await apiFetch(`/api/ui/modules/${targetModule.id}/entities`, {
          method: 'POST', sessionId,
          body: JSON.stringify({ entities: newEntities }),
        });
      }
    }
    // Silent background refresh to sync server state
    loadAll(true);
  };

  // Move entity within an area
  const handleMoveEntity = async (moduleId: number, entityId: string, direction: 'up' | 'down') => {
    const mod = modules.find(m => m.id === moduleId);
    if (!mod) return;
    const arr = [...mod.entities];
    const idx = arr.indexOf(entityId);
    if (idx < 0) return;
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= arr.length) return;
    [arr[idx], arr[swapIdx]] = [arr[swapIdx], arr[idx]];
    setModules(prev => prev.map(m => m.id === moduleId ? { ...m, entities: arr } : m));
    await apiFetch(`/api/ui/modules/${moduleId}/entities`, {
      method: 'POST', sessionId,
      body: JSON.stringify({ entities: arr }),
    });
  };

  // Drag & drop entity reorder
  const [dragInfo, setDragInfo] = useState<{ moduleId: number; entityId: string } | null>(null);

  const handleEntityDrop = async (targetModuleId: number, targetIndex: number) => {
    if (!dragInfo || dragInfo.moduleId !== targetModuleId) {
      setDragInfo(null);
      return;
    }
    const mod = modules.find(m => m.id === targetModuleId);
    if (!mod) return;
    const arr = [...mod.entities];
    const fromIdx = arr.indexOf(dragInfo.entityId);
    if (fromIdx < 0) return;
    arr.splice(fromIdx, 1);
    arr.splice(targetIndex, 0, dragInfo.entityId);
    setModules(prev => prev.map(m => m.id === targetModuleId ? { ...m, entities: arr } : m));
    setDragInfo(null);
    await apiFetch(`/api/ui/modules/${targetModuleId}/entities`, {
      method: 'POST', sessionId,
      body: JSON.stringify({ entities: arr }),
    });
  };

  // QR code
  const handleShowQr = async () => {
    const guestUrl = new URL('./', window.location.href).toString();
    try {
      const dataUrl = await QRCode.toDataURL(guestUrl, { width: 256, margin: 2 });
      setQrDataUrl(dataUrl);
      setShowQrModal(true);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    }
  };

  // Password change
  const handlePasswordChange = async () => {
    setPassMsg(null);
    try {
      await apiFetch('/api/admin/change-password', {
        method: 'POST', sessionId,
        body: JSON.stringify({ currentPassword: currentPass, newPassword: newPass }),
      });
      setPassMsg('Password changed!');
      setCurrentPass('');
      setNewPass('');
    } catch (err) {
      setPassMsg(err instanceof Error ? err.message : 'Failed');
    }
  };

  // Remove entity from module
  const handleRemoveFromModule = async (moduleId: number, entityId: string) => {
    const module = modules.find(m => m.id === moduleId);
    if (!module) return;
    const newEntities = module.entities.filter(e => e !== entityId);
    await apiFetch(`/api/ui/modules/${moduleId}/entities`, {
      method: 'POST', sessionId,
      body: JSON.stringify({ entities: newEntities }),
    });
    loadAll();
  };

  if (loading) {
    return <div className="container"><p className="note">Loading dashboard...</p></div>;
  }

  return (
    <div className="admin-layout">
      {/* Header */}
      <header className="admin-header">
        <div className="header-left">
          {editingTitle ? (
            <span className="title-edit">
              <input
                className="title-input"
                value={titleDraft}
                onChange={e => setTitleDraft(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false); }}
                autoFocus
              />
              <button type="button" className="action-button" onClick={handleTitleSave}>✓</button>
              <button type="button" className="action-button" onClick={() => setEditingTitle(false)}>✕</button>
            </span>
          ) : (
            <h1 className="dashboard-title" onClick={handleTitleEdit} title="Click to edit">
              {dashboardTitle}
            </h1>
          )}
          <span className="admin-badge">Admin</span>
        </div>
        <div className="header-right">
          <button type="button" className="action-button" onClick={() => setShowDiscovery(true)}>
            🔍 Discover
          </button>
          <button type="button" className="action-button" onClick={() => setShowAreaManager(true)}>
            📦 Areas
          </button>
          <button type="button" className="action-button" onClick={handleShowQr}>
            📱 QR Code
          </button>
          <div className="settings-menu-wrap" ref={settingsMenuRef}>
            <button type="button" className="action-button" onClick={() => setShowSettingsMenu(!showSettingsMenu)}>
              ⚙️
            </button>
            {showSettingsMenu && (
              <div className="settings-dropdown">
                <button onClick={() => { setShowSettingsMenu(false); setShowHidden(true); }}>
                  Hidden Entities ({hiddenIds.size})
                </button>
                <button onClick={() => { setShowSettingsMenu(false); setShowPasswordChange(true); }}>
                  Change Password
                </button>
                <button onClick={() => { setShowSettingsMenu(false); setShowSettings(true); }}>
                  Server Settings
                </button>
                <button onClick={() => { setShowSettingsMenu(false); onLogout(); }}>
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Module sections */}
      <main className="admin-main">
        {modules.length === 0 ? (
          <div className="empty-state">
            <p>No areas yet. Create areas to organize your entities.</p>
            <button type="button" className="action-button" onClick={() => setShowAreaManager(true)}>
              Create First Area
            </button>
          </div>
        ) : (
          modules.map(module => {
            const visibleEntities = module.entities.filter(eid => !hiddenIds.has(eid));
            return (
              <section key={module.id} className="module-section">
                <div className="module-header">
                  <h2>{module.icon} {module.name}</h2>
                  <span className="entity-count">{module.entities.length} entities</span>
                </div>
                <div className="entity-grid">
                  {visibleEntities.map((entityId, idx) => (
                    <div
                      key={entityId}
                      className={`entity-card-wrap admin-card${dragInfo?.entityId === entityId ? ' dragging' : ''}`}
                      draggable
                      onDragStart={() => setDragInfo({ moduleId: module.id, entityId })}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => handleEntityDrop(module.id, idx)}
                      onDragEnd={() => setDragInfo(null)}
                    >
                      <EntityCard
                        entityId={entityId}
                        showActions
                        showAttributes
                        onHide={() => handleHide(entityId)}
                        onGearClick={(eid, rect) => { setEditingEntityId(eid); setEditingAnchorRect(rect); }}
                        customName={entityProps[entityId]?.custom_name}
                        customIcon={entityProps[entityId]?.custom_icon}
                        showLastUpdated={entityProps[entityId]?.show_last_updated}
                        hideState={entityProps[entityId]?.hide_state}
                        hideUpdated={entityProps[entityId]?.hide_updated}
                        hideAttributes={entityProps[entityId]?.hide_attributes}
                        hideLogbook={entityProps[entityId]?.hide_logbook}
                      />
                      <div className="entity-admin-actions">
                        <button
                          type="button"
                          className="reorder-btn"
                          onClick={() => handleMoveEntity(module.id, entityId, 'up')}
                          disabled={idx === 0}
                          title="Move up"
                        >↑</button>
                        <button
                          type="button"
                          className="reorder-btn"
                          onClick={() => handleMoveEntity(module.id, entityId, 'down')}
                          disabled={idx === visibleEntities.length - 1}
                          title="Move down"
                        >↓</button>
                        <button
                          type="button"
                          className="remove-from-module-btn"
                          onClick={() => handleRemoveFromModule(module.id, entityId)}
                          title="Remove from area"
                        >✕</button>
                      </div>
                    </div>
                  ))}
                  {module.entities.length === 0 && (
                    <p className="note" style={{ gridColumn: '1 / -1' }}>
                      No entities in this area. Use Discover to add some.
                    </p>
                  )}
                </div>
              </section>
            );
          })
        )}
      </main>

      {/* Modals */}
      {editingEntityId && editingAnchorRect && (
        <EntityPropEditor
          entityId={editingEntityId}
          friendlyName={editingEntityId.split('.').slice(1).join('.').replace(/_/g, ' ')}
          sessionId={sessionId}
          anchorRect={editingAnchorRect}
          onClose={() => { setEditingEntityId(null); setEditingAnchorRect(null); }}
          onSave={() => loadAll(true)}
          onHide={() => { handleHide(editingEntityId); setEditingEntityId(null); setEditingAnchorRect(null); }}
        />
      )}

      {showDiscovery && (
        <EntityDiscovery
          sessionId={sessionId}
          modules={modules}
          onAssignEntity={handleAssignEntity}
          onClose={() => setShowDiscovery(false)}
        />
      )}

      {showAreaManager && (
        <AreaManager
          sessionId={sessionId}
          modules={modules}
          onModulesChange={setModules}
          onClose={() => { setShowAreaManager(false); loadAll(); }}
        />
      )}

      {showSettings && (
        <SettingsPanel
          sessionId={sessionId}
          onClose={() => setShowSettings(false)}
        />
      )}

      {/* Hidden entities drawer */}
      {showHidden && (
        <div className="modal-overlay" onClick={() => setShowHidden(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Hidden Entities ({hiddenIds.size})</h3>
              <button type="button" className="action-button" onClick={() => setShowHidden(false)}>Close</button>
            </div>
            <ul className="hidden-list">
              {Array.from(hiddenIds).map(eid => (
                <li key={eid}>
                  <span className="hidden-id">{eid}</span>
                  <button type="button" className="action-button" onClick={() => handleUnhide(eid)}>Unhide</button>
                </li>
              ))}
              {hiddenIds.size === 0 && <p className="note">No hidden entities.</p>}
            </ul>
          </div>
        </div>
      )}

      {/* QR Modal */}
      {showQrModal && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="modal qr-modal" onClick={e => e.stopPropagation()}>
            <h3>Guest Access QR Code</h3>
            {qrDataUrl && <img src={qrDataUrl} alt="QR Code for guest access" />}
            <p className="note">Scan this code to open the guest dashboard.</p>
            <button type="button" className="action-button" onClick={() => setShowQrModal(false)}>Close</button>
          </div>
        </div>
      )}

      {/* Password change modal */}
      {showPasswordChange && (
        <div className="modal-overlay" onClick={() => setShowPasswordChange(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Change Password</h3>
              <button type="button" className="action-button" onClick={() => setShowPasswordChange(false)}>Close</button>
            </div>
            <div className="settings-form">
              <div className="form-field">
                <label>Current Password</label>
                <input type="password" value={currentPass} onChange={e => setCurrentPass(e.target.value)} />
              </div>
              <div className="form-field">
                <label>New Password</label>
                <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} />
              </div>
              {passMsg && <p className="note">{passMsg}</p>}
              <button type="button" className="action-button" onClick={handlePasswordChange}>Change Password</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
