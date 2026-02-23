/** HA entity state as returned by the REST/WS API */
export interface HaEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
  last_changed: string;
  last_updated: string;
}

/** Simplified entity info from discovery API */
export interface EntityInfo {
  entity_id: string;
  domain: string;
  name: string;
  state: string;
  area?: string;
  device_class?: string;
}

/** Domain group from discovery API */
export interface DomainGroup {
  domain: string;
  label: string;
  entities: EntityInfo[];
}

/** Domain info from discovery API */
export interface DomainInfo {
  domain: string;
  label: string;
  count: number;
}
