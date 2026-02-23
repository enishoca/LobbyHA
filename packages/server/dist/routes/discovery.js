import { Router } from 'express';
import { requireAdmin } from '../middleware/admin-auth.js';
import { fetchHa } from './ha-proxy.js';
import logger from '../logger.js';
const router = Router();
// In-memory entity cache
let entityCache = [];
let cacheTimestamp = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const DOMAIN_LABELS = {
    light: 'Lights',
    switch: 'Switches',
    climate: 'Climate',
    sensor: 'Sensors',
    binary_sensor: 'Binary Sensors',
    lock: 'Locks',
    cover: 'Covers',
    media_player: 'Media Players',
    camera: 'Cameras',
    fan: 'Fans',
    vacuum: 'Vacuums',
    automation: 'Automations',
    scene: 'Scenes',
    script: 'Scripts',
    input_boolean: 'Input Booleans',
    input_number: 'Input Numbers',
    input_select: 'Input Selects',
    input_text: 'Input Text',
    weather: 'Weather',
    person: 'People',
    zone: 'Zones',
    device_tracker: 'Device Trackers',
    group: 'Groups',
    alarm_control_panel: 'Alarm Panels',
    water_heater: 'Water Heaters',
    humidifier: 'Humidifiers',
};
function getDomain(entityId) {
    return entityId.split('.')[0];
}
function getFriendlyName(entity) {
    return entity.attributes.friendly_name || entity.entity_id;
}
function toEntityInfo(entity) {
    return {
        entity_id: entity.entity_id,
        domain: getDomain(entity.entity_id),
        name: getFriendlyName(entity),
        state: entity.state,
        area: entity.attributes.area,
        device_class: entity.attributes.device_class,
    };
}
async function fetchAllEntities() {
    const { status, text } = await fetchHa('/api/states');
    if (status !== 200)
        throw new Error(`HA returned status ${status}`);
    const entities = JSON.parse(text);
    return entities.map(toEntityInfo);
}
async function getCachedEntities(forceRefresh = false) {
    const now = Date.now();
    if (!forceRefresh && entityCache.length > 0 && (now - cacheTimestamp) < CACHE_TTL_MS) {
        return entityCache;
    }
    entityCache = await fetchAllEntities();
    cacheTimestamp = now;
    logger.info(`Discovery: cached ${entityCache.length} entities`);
    return entityCache;
}
// Get all entities grouped by domain
router.get('/entities', requireAdmin, async (_req, res) => {
    try {
        const entities = await getCachedEntities();
        const grouped = groupByDomain(entities);
        res.json({ entities, domains: grouped, total: entities.length });
    }
    catch (err) {
        logger.error(`Discovery failed: ${err}`);
        res.status(500).json({ error: 'Failed to discover entities' });
    }
});
// Get just domain list
router.get('/domains', requireAdmin, async (_req, res) => {
    try {
        const entities = await getCachedEntities();
        const domains = [...new Set(entities.map(e => e.domain))].sort();
        const domainInfo = domains.map(d => ({
            domain: d,
            label: DOMAIN_LABELS[d] || d.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            count: entities.filter(e => e.domain === d).length,
        }));
        res.json({ domains: domainInfo });
    }
    catch (err) {
        logger.error(`Domain discovery failed: ${err}`);
        res.status(500).json({ error: 'Failed to discover domains' });
    }
});
// Force refresh entity cache
router.post('/refresh', requireAdmin, async (_req, res) => {
    try {
        const entities = await getCachedEntities(true);
        const grouped = groupByDomain(entities);
        res.json({ entities, domains: grouped, total: entities.length, refreshed: true });
    }
    catch (err) {
        logger.error(`Discovery refresh failed: ${err}`);
        res.status(500).json({ error: 'Failed to refresh entities' });
    }
});
// Search entities
router.get('/search', requireAdmin, async (req, res) => {
    try {
        const query = (req.query.q || '').toLowerCase();
        const domain = req.query.domain;
        const entities = await getCachedEntities();
        let filtered = entities;
        if (domain) {
            filtered = filtered.filter(e => e.domain === domain);
        }
        if (query) {
            filtered = filtered.filter(e => e.entity_id.toLowerCase().includes(query) ||
                e.name.toLowerCase().includes(query) ||
                (e.area?.toLowerCase().includes(query) ?? false));
        }
        res.json({ entities: filtered, total: filtered.length });
    }
    catch (err) {
        logger.error(`Search failed: ${err}`);
        res.status(500).json({ error: 'Search failed' });
    }
});
function groupByDomain(entities) {
    const map = new Map();
    for (const e of entities) {
        const list = map.get(e.domain) || [];
        list.push(e);
        map.set(e.domain, list);
    }
    return Array.from(map.entries())
        .map(([domain, ents]) => ({
        domain,
        label: DOMAIN_LABELS[domain] || domain.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
        entities: ents.sort((a, b) => a.name.localeCompare(b.name)),
    }))
        .sort((a, b) => a.label.localeCompare(b.label));
}
export default router;
//# sourceMappingURL=discovery.js.map