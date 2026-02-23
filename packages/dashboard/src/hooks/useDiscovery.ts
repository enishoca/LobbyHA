import { useState, useCallback } from 'react';
import { apiFetch } from '../shared/utils';
import type { EntityInfo, DomainGroup, DomainInfo } from '../types/ha';

interface DiscoveryState {
  entities: EntityInfo[];
  domains: DomainGroup[];
  domainList: DomainInfo[];
  total: number;
  loading: boolean;
  error: string | null;
}

export function useDiscovery(sessionId: string | null) {
  const [state, setState] = useState<DiscoveryState>({
    entities: [],
    domains: [],
    domainList: [],
    total: 0,
    loading: false,
    error: null,
  });

  const fetchEntities = useCallback(async () => {
    if (!sessionId) return;
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await apiFetch<{
        entities: EntityInfo[];
        domains: DomainGroup[];
        total: number;
      }>('/api/discovery/entities', { sessionId });

      const domainList: DomainInfo[] = data.domains.map(d => ({
        domain: d.domain,
        label: d.label,
        count: d.entities.length,
      }));

      setState({
        entities: data.entities,
        domains: data.domains,
        domainList,
        total: data.total,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to discover entities',
      }));
    }
  }, [sessionId]);

  const refresh = useCallback(async () => {
    if (!sessionId) return;
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await apiFetch<{
        entities: EntityInfo[];
        domains: DomainGroup[];
        total: number;
      }>('/api/discovery/refresh', { method: 'POST', sessionId });

      const domainList: DomainInfo[] = data.domains.map(d => ({
        domain: d.domain,
        label: d.label,
        count: d.entities.length,
      }));

      setState({
        entities: data.entities,
        domains: data.domains,
        domainList,
        total: data.total,
        loading: false,
        error: null,
      });
    } catch (err) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to refresh',
      }));
    }
  }, [sessionId]);

  const search = useCallback(async (query: string, domain?: string) => {
    if (!sessionId) return;
    try {
      const params = new URLSearchParams();
      if (query) params.set('q', query);
      if (domain) params.set('domain', domain);

      const data = await apiFetch<{
        entities: EntityInfo[];
        total: number;
      }>(`/api/discovery/search?${params}`, { sessionId });

      setState(prev => ({
        ...prev,
        entities: data.entities,
        total: data.total,
      }));
    } catch (err) {
      setState(prev => ({
        ...prev,
        error: err instanceof Error ? err.message : 'Search failed',
      }));
    }
  }, [sessionId]);

  return { ...state, fetchEntities, refresh, search };
}
