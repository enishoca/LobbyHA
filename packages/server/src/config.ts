import fs from 'fs';
import path from 'path';
import { readAllSettings, writeSettings, hasSettings, readSetting } from './db.js';

export interface AppConfig {
  HA_URL: string;
  HA_TOKEN: string;
  PORT: number;
  LOG_LEVEL: string;
  ALLOWED_ENTITIES: string[];
  ADMIN_PASSWORD?: string;
}

const DEFAULT_CONFIG: AppConfig = {
  HA_URL: 'http://localhost:8123',
  HA_TOKEN: '',
  PORT: 3000,
  LOG_LEVEL: 'INFO',
  ALLOWED_ENTITIES: [],
};

let cachedConfig: AppConfig | null = null;
let cliPortOverride: number | null = null;

/**
 * Set a CLI-provided port override. Takes highest priority over
 * DB settings, env vars, and defaults.
 */
export function setCliPort(port: number): void {
  cliPortOverride = port;
}

export function getDataDir(override?: string): string {
  if (override) return path.resolve(override);
  const containerData = '/data';
  try {
    fs.accessSync(containerData, fs.constants.W_OK);
    return containerData;
  } catch {
    // Resolve to repo root's data/ directory
    return path.resolve(import.meta.dirname, '..', '..', '..', 'data');
  }
}

/**
 * Bootstrap config: returns minimal config from env vars / defaults
 * so the server can determine PORT before DB is initialized.
 */
export function bootstrapConfig(): AppConfig {
  const config: AppConfig = {
    HA_URL: process.env.HA_URL || DEFAULT_CONFIG.HA_URL,
    HA_TOKEN: process.env.HA_TOKEN || '',
    PORT: cliPortOverride || Number(process.env.PORT || DEFAULT_CONFIG.PORT),
    LOG_LEVEL: (process.env.LOG_LEVEL || DEFAULT_CONFIG.LOG_LEVEL).toUpperCase(),
    ALLOWED_ENTITIES: process.env.ALLOWED_ENTITIES
      ? process.env.ALLOWED_ENTITIES.split(',').map(e => e.trim()).filter(Boolean)
      : [],
  };
  cachedConfig = config;
  return config;
}

/**
 * Load config from the DB settings table. Must be called after initDb().
 * Merges DB values over env-var defaults.
 */
export function loadConfig(): AppConfig {
  const settings = readAllSettings();

  const allowedRaw = settings.ALLOWED_ENTITIES || process.env.ALLOWED_ENTITIES || '';

  cachedConfig = {
    HA_URL: settings.HA_URL || process.env.HA_URL || DEFAULT_CONFIG.HA_URL,
    HA_TOKEN: settings.HA_TOKEN || process.env.HA_TOKEN || '',
    PORT: cliPortOverride || Number(settings.PORT || process.env.PORT || DEFAULT_CONFIG.PORT),
    LOG_LEVEL: (settings.LOG_LEVEL || process.env.LOG_LEVEL || DEFAULT_CONFIG.LOG_LEVEL).toUpperCase(),
    ALLOWED_ENTITIES: allowedRaw ? allowedRaw.split(',').map(e => e.trim()).filter(Boolean) : [],
    ADMIN_PASSWORD: settings.ADMIN_PASSWORD || undefined,
  };
  return cachedConfig;
}

export function saveConfig(config: AppConfig): void {
  const entries: Record<string, string> = {
    HA_URL: config.HA_URL,
    HA_TOKEN: config.HA_TOKEN,
    PORT: String(config.PORT),
    LOG_LEVEL: config.LOG_LEVEL,
  };
  if (config.ALLOWED_ENTITIES.length > 0) {
    entries.ALLOWED_ENTITIES = config.ALLOWED_ENTITIES.join(',');
  }
  writeSettings(entries);
  cachedConfig = config;
}

export function getConfig(): AppConfig {
  if (!cachedConfig) throw new Error('Config not loaded. Call loadConfig() first.');
  return cachedConfig;
}

export function updateConfig(updates: Partial<AppConfig>): AppConfig {
  const current = getConfig();
  const merged = { ...current, ...updates };
  saveConfig(merged);
  return merged;
}

export function needsSetup(): boolean {
  // Check DB setting directly
  const token = readSetting('HA_TOKEN');
  return !token;
}

/**
 * One-time migration: import settings from legacy config.yaml / options.json
 * into the DB settings table. Called once after DB init if settings table is empty.
 */
export function migrateFileConfigToDb(dataDir: string): boolean {
  if (hasSettings()) return false; // already migrated

  let source: Record<string, unknown> | null = null;

  // Try config.yaml first
  const yamlPath = path.join(dataDir, 'config.yaml');
  if (fs.existsSync(yamlPath)) {
    try {
      // Dynamic import would be async, so do a simple manual parse for key: value
      const raw = fs.readFileSync(yamlPath, 'utf8');
      source = {};
      for (const line of raw.split('\n')) {
        const match = line.match(/^\s*(\w+)\s*:\s*(.+?)\s*$/);
        if (match) source[match[1]] = match[2];
      }
    } catch { /* ignore */ }
  }

  // Fall back to options.json
  if (!source || Object.keys(source).length === 0) {
    const jsonPath = path.join(dataDir, 'options.json');
    if (fs.existsSync(jsonPath)) {
      try {
        source = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as Record<string, unknown>;
      } catch { /* ignore */ }
    }
  }

  if (!source || Object.keys(source).length === 0) return false;

  const entries: Record<string, string> = {};
  const str = (v: unknown) => v != null ? String(v) : '';

  if (source.HA_URL || source.ha_url) entries.HA_URL = str(source.HA_URL || source.ha_url);
  if (source.HA_TOKEN || source.ha_token) entries.HA_TOKEN = str(source.HA_TOKEN || source.ha_token);
  if (source.PORT || source.port) entries.PORT = str(source.PORT || source.port);
  if (source.LOG_LEVEL || source.log_level) entries.LOG_LEVEL = str(source.LOG_LEVEL || source.log_level);
  if (source.ALLOWED_ENTITIES || source.allowed_entities) {
    entries.ALLOWED_ENTITIES = str(source.ALLOWED_ENTITIES || source.allowed_entities);
  }

  if (Object.keys(entries).length > 0) {
    writeSettings(entries);
    return true;
  }
  return false;
}
