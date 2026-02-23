import { useState, useEffect, useCallback, useMemo } from 'react';
import { apiFetch } from '../shared/utils';
import { domainIcon } from '../shared/entity-domains';
import type { EntityInfo } from '../types/ha';
import type { Module } from '../types/modules';

interface EntityDiscoveryProps {
  sessionId: string;
  modules: Module[];
  onAssignEntity: (entityId: string, moduleId: number | null) => void;
  onClose: () => void;
}

export function EntityDiscovery({ sessionId, modules, onAssignEntity, onClose }: EntityDiscoveryProps) {
  const [entities, setEntities] = useState<EntityInfo[]>([]);
  const [allEntities, setAllEntities] = useState<EntityInfo[]>([]);
  const [domains, setDomains] = useState<{ domain: string; label: string; count: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Compute entity → area mapping from modules
  const entityModuleMap = useMemo(() => {
    const map = new Map<string, number>();
    modules.forEach(m => m.entities.forEach(e => map.set(e, m.id)));
    return map;
  }, [modules]);

  const fetchEntities = useCallback(async (refresh = false) => {
    if (refresh) setRefreshing(true);
    else setLoading(true);

    try {
      const endpoint = refresh ? '/api/discovery/refresh' : '/api/discovery/entities';
      const options = refresh ? { method: 'POST', sessionId } : { sessionId };
      const data = await apiFetch<{
        entities: EntityInfo[];
        domains: { domain: string; label: string; entities: EntityInfo[] }[];
        total: number;
      }>(endpoint, options);

      setAllEntities(data.entities);
      setEntities(data.entities);
      setDomains(data.domains.map(d => ({ domain: d.domain, label: d.label, count: d.entities.length })));
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionId]);

  useEffect(() => { fetchEntities(); }, [fetchEntities]);

  // Filter entities based on search and domain
  useEffect(() => {
    let filtered = allEntities;
    if (selectedDomain) {
      filtered = filtered.filter(e => e.domain === selectedDomain);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(e =>
        e.entity_id.toLowerCase().includes(q) ||
        e.name.toLowerCase().includes(q) ||
        (e.area?.toLowerCase().includes(q) ?? false)
      );
    }
    setEntities(filtered);
  }, [allEntities, searchQuery, selectedDomain]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: '700px' }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Discover Entities ({allEntities.length} total)</h3>
          <button type="button" className="action-button" onClick={onClose}>Close</button>
        </div>

        <div className="discovery-search">
          <input
            type="text"
            placeholder="Search entities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            autoFocus
          />
          <button
            type="button"
            className="action-button"
            onClick={() => fetchEntities(true)}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing...' : '🔄 Refresh'}
          </button>
        </div>

        <div className="domain-filter">
          <button
            type="button"
            className={`domain-chip ${selectedDomain === null ? 'active' : ''}`}
            onClick={() => setSelectedDomain(null)}
          >
            All ({allEntities.length})
          </button>
          {domains.length === 0 && !loading && (
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', alignSelf: 'center' }}>
              No entity types found
            </span>
          )}
          {domains.map(d => (
            <button
              key={d.domain}
              type="button"
              className={`domain-chip ${selectedDomain === d.domain ? 'active' : ''}`}
              onClick={() => setSelectedDomain(selectedDomain === d.domain ? null : d.domain)}
            >
              {domainIcon(d.domain)} {d.label} ({d.count})
            </button>
          ))}
        </div>

        {loading ? (
          <p className="note">Loading entities...</p>
        ) : (
          <ul className="discovery-entity-list">
            {entities.map(entity => {
              const currentModuleId = entityModuleMap.get(entity.entity_id);
              const isAssigned = currentModuleId !== undefined;
              return (
                <li
                  key={entity.entity_id}
                  className={`discovery-entity-item ${isAssigned ? 'on-dashboard' : ''}`}
                >
                  <div>
                    <div className="discovery-entity-name">
                      {domainIcon(entity.domain)} {entity.name}
                    </div>
                    <div className="discovery-entity-id">{entity.entity_id}</div>
                  </div>
                  <span className="discovery-entity-state">{entity.state}</span>
                  <select
                    className="discovery-area-select"
                    value={currentModuleId ?? ''}
                    onChange={(e) => {
                      const val = e.target.value;
                      onAssignEntity(entity.entity_id, val === '' ? null : Number(val));
                    }}
                  >
                    <option value="">— None —</option>
                    {modules.map(m => (
                      <option key={m.id} value={m.id}>{m.icon} {m.name}</option>
                    ))}
                  </select>
                </li>
              );
            })}
            {entities.length === 0 && (
              <p className="note">No entities found matching your criteria.</p>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
