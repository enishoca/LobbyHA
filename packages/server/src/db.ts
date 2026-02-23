import fs from 'fs';
import path from 'path';
import initSqlJs, { type Database } from 'sql.js';
import logger from './logger.js';

let db: Database | null = null;
let dbPath: string;

export async function initDb(dataDir: string): Promise<Database> {
  dbPath = path.join(dataDir, 'lobbyha.db');
  fs.mkdirSync(dataDir, { recursive: true });

  const SQL = await initSqlJs();
  const fileBuffer = fs.existsSync(dbPath) ? fs.readFileSync(dbPath) : null;
  db = fileBuffer ? new SQL.Database(fileBuffer) : new SQL.Database();

  // Run migrations
  db.run(`CREATE TABLE IF NOT EXISTS hidden_entities (
    entity_id TEXT PRIMARY KEY,
    hidden INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS entity_layout (
    entity_id TEXT PRIMARY KEY,
    position INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS guest_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admin_auth (
    id INTEGER PRIMARY KEY,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    is_default INTEGER NOT NULL DEFAULT 1
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL
  )`);

  // New: modules table
  db.run(`CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    icon TEXT DEFAULT 'mdi:folder',
    position INTEGER NOT NULL DEFAULT 0,
    visible INTEGER NOT NULL DEFAULT 1
  )`);

  // New: module_entities join table
  db.run(`CREATE TABLE IF NOT EXISTS module_entities (
    module_id INTEGER NOT NULL,
    entity_id TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (module_id, entity_id),
    FOREIGN KEY (module_id) REFERENCES modules(id) ON DELETE CASCADE
  )`);

  // Per-entity display property overrides (icon, name, etc.)
  db.run(`CREATE TABLE IF NOT EXISTS entity_display_props (
    entity_id TEXT PRIMARY KEY,
    custom_name TEXT,
    custom_icon TEXT
  )`);

  persistDb();
  logger.info('Database initialized');
  return db;
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized. Call initDb() first.');
  return db;
}

export function persistDb(): void {
  if (!db) return;
  const data = db.export();
  fs.writeFileSync(dbPath, Buffer.from(data));
}

// ─── Hidden Entities ────────────────────────────────────────

export function readHiddenEntities(): string[] {
  const result = getDb().exec("SELECT entity_id FROM hidden_entities WHERE hidden = 1");
  if (!result.length) return [];
  return result[0].values.map(row => row[0] as string);
}

export function setHiddenEntities(hidden: string[]): void {
  const d = getDb();
  d.run("DELETE FROM hidden_entities");
  for (const entityId of hidden) {
    d.run("INSERT INTO hidden_entities (entity_id, hidden) VALUES (?, 1)", [entityId]);
  }
  persistDb();
}

export function setEntityHidden(entityId: string, hidden: boolean): void {
  const d = getDb();
  if (hidden) {
    d.run("INSERT INTO hidden_entities (entity_id, hidden) VALUES (?, 1) ON CONFLICT(entity_id) DO UPDATE SET hidden = 1", [entityId]);
  } else {
    d.run("DELETE FROM hidden_entities WHERE entity_id = ?", [entityId]);
  }
  persistDb();
}

// ─── Layout ─────────────────────────────────────────────────

export function readLayout(): string[] {
  const result = getDb().exec("SELECT entity_id FROM entity_layout ORDER BY position ASC");
  if (!result.length) return [];
  return result[0].values.map(row => row[0] as string);
}

export function saveLayout(order: string[]): void {
  const d = getDb();
  d.run("DELETE FROM entity_layout");
  order.forEach((entityId, index) => {
    d.run("INSERT INTO entity_layout (entity_id, position) VALUES (?, ?)", [entityId, index]);
  });
  persistDb();
}

// ─── Guest Config ───────────────────────────────────────────

export function readGuestEntities(): string[] {
  const result = getDb().exec("SELECT value FROM guest_config WHERE key = 'entities'");
  if (!result.length) return [];
  try {
    const raw = result[0].values[0]?.[0];
    const parsed = JSON.parse(String(raw));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function readGuestTitle(): string {
  const result = getDb().exec("SELECT value FROM guest_config WHERE key = 'title'");
  if (!result.length) return 'LobbyHA';
  try {
    return String(result[0].values[0]?.[0]) || 'LobbyHA';
  } catch {
    return 'LobbyHA';
  }
}

export function saveGuestEntities(entities: string[]): void {
  const d = getDb();
  d.run("DELETE FROM guest_config WHERE key = 'entities'");
  d.run("INSERT INTO guest_config (key, value) VALUES ('entities', ?)", [JSON.stringify(entities)]);
  persistDb();
}

export function saveGuestTitle(title: string): void {
  const d = getDb();
  d.run("DELETE FROM guest_config WHERE key = 'title'");
  d.run("INSERT INTO guest_config (key, value) VALUES ('title', ?)", [title]);
  persistDb();
}

// ─── Modules ────────────────────────────────────────────────

export interface Module {
  id: number;
  name: string;
  icon: string;
  position: number;
  visible: boolean;
  entities: string[];
}

export function readModules(): Module[] {
  const d = getDb();
  const result = d.exec("SELECT id, name, icon, position, visible FROM modules ORDER BY position ASC");
  if (!result.length) return [];

  return result[0].values.map(row => {
    const id = row[0] as number;
    const entResult = d.exec("SELECT entity_id FROM module_entities WHERE module_id = ? ORDER BY position ASC", [id]);
    const entities = entResult.length ? entResult[0].values.map(r => r[0] as string) : [];
    return {
      id,
      name: row[1] as string,
      icon: row[2] as string,
      position: row[3] as number,
      visible: (row[4] as number) === 1,
      entities,
    };
  });
}

export function createModule(name: string, icon: string = 'mdi:folder'): Module {
  const d = getDb();
  // Get next position
  const posResult = d.exec("SELECT COALESCE(MAX(position), -1) + 1 FROM modules");
  const nextPos = posResult.length ? (posResult[0].values[0][0] as number) : 0;

  d.run("INSERT INTO modules (name, icon, position, visible) VALUES (?, ?, ?, 1)", [name, icon, nextPos]);
  persistDb();

  const idResult = d.exec("SELECT last_insert_rowid()");
  const id = idResult[0].values[0][0] as number;
  return { id, name, icon, position: nextPos, visible: true, entities: [] };
}

export function updateModule(id: number, updates: { name?: string; icon?: string; position?: number; visible?: boolean }): void {
  const d = getDb();
  if (updates.name !== undefined) d.run("UPDATE modules SET name = ? WHERE id = ?", [updates.name, id]);
  if (updates.icon !== undefined) d.run("UPDATE modules SET icon = ? WHERE id = ?", [updates.icon, id]);
  if (updates.position !== undefined) d.run("UPDATE modules SET position = ? WHERE id = ?", [updates.position, id]);
  if (updates.visible !== undefined) d.run("UPDATE modules SET visible = ? WHERE id = ?", [updates.visible ? 1 : 0, id]);
  persistDb();
}

export function deleteModule(id: number): void {
  const d = getDb();
  d.run("DELETE FROM module_entities WHERE module_id = ?", [id]);
  d.run("DELETE FROM modules WHERE id = ?", [id]);
  persistDb();
}

export function setModuleEntities(moduleId: number, entityIds: string[]): void {
  const d = getDb();
  d.run("DELETE FROM module_entities WHERE module_id = ?", [moduleId]);
  entityIds.forEach((entityId, index) => {
    d.run("INSERT INTO module_entities (module_id, entity_id, position) VALUES (?, ?, ?)", [moduleId, entityId, index]);
  });
  persistDb();
}

export function reorderModules(moduleIds: number[]): void {
  const d = getDb();
  moduleIds.forEach((id, index) => {
    d.run("UPDATE modules SET position = ? WHERE id = ?", [index, id]);
  });
  persistDb();
}

// ─── Entity Display Props ────────────────────────────────────

export interface EntityDisplayProps {
  entity_id: string;
  custom_name?: string | null;
  custom_icon?: string | null;
}

export function readEntityDisplayProps(entityId: string): EntityDisplayProps | null {
  const result = getDb().exec(
    "SELECT entity_id, custom_name, custom_icon FROM entity_display_props WHERE entity_id = ?",
    [entityId],
  );
  if (!result.length || !result[0].values.length) return null;
  const [eid, name, icon] = result[0].values[0] as [string, string | null, string | null];
  return { entity_id: eid, custom_name: name, custom_icon: icon };
}

export function readAllEntityDisplayProps(): EntityDisplayProps[] {
  const result = getDb().exec("SELECT entity_id, custom_name, custom_icon FROM entity_display_props");
  if (!result.length) return [];
  return result[0].values.map(row => ({
    entity_id: row[0] as string,
    custom_name: row[1] as string | null,
    custom_icon: row[2] as string | null,
  }));
}

export function saveEntityDisplayProps(entityId: string, props: { custom_name?: string | null; custom_icon?: string | null }): void {
  const d = getDb();
  d.run(
    `INSERT INTO entity_display_props (entity_id, custom_name, custom_icon)
     VALUES (?, ?, ?)
     ON CONFLICT(entity_id) DO UPDATE SET custom_name = ?, custom_icon = ?`,
    [entityId, props.custom_name ?? null, props.custom_icon ?? null, props.custom_name ?? null, props.custom_icon ?? null],
  );
  persistDb();
}

export function deleteEntityDisplayProps(entityId: string): void {
  getDb().run("DELETE FROM entity_display_props WHERE entity_id = ?", [entityId]);
  persistDb();
}

// ─── Settings ───────────────────────────────────────────────

export function readSetting(key: string): string | null {
  const result = getDb().exec("SELECT value FROM settings WHERE key = ?", [key]);
  if (!result.length || !result[0].values.length) return null;
  return String(result[0].values[0][0]);
}

export function readAllSettings(): Record<string, string> {
  const result = getDb().exec("SELECT key, value FROM settings");
  if (!result.length) return {};
  const settings: Record<string, string> = {};
  for (const row of result[0].values) {
    settings[String(row[0])] = String(row[1]);
  }
  return settings;
}

export function writeSetting(key: string, value: string): void {
  const d = getDb();
  d.run(
    "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
    [key, value, value],
  );
  persistDb();
}

export function writeSettings(entries: Record<string, string>): void {
  const d = getDb();
  for (const [key, value] of Object.entries(entries)) {
    d.run(
      "INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
      [key, value, value],
    );
  }
  persistDb();
}

export function hasSettings(): boolean {
  const result = getDb().exec("SELECT COUNT(*) FROM settings");
  if (!result.length) return false;
  return (result[0].values[0][0] as number) > 0;
}

// ─── Admin Auth ─────────────────────────────────────────────

import crypto from 'crypto';

const DEFAULT_PASSWORD = 'admin';

function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const actualSalt = salt || crypto.randomBytes(32).toString('hex');
  const hash = crypto.pbkdf2Sync(password, actualSalt, 100000, 64, 'sha512').toString('hex');
  return { hash, salt: actualSalt };
}

export function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean {
  const { hash } = hashPassword(password, storedSalt);
  try {
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(String(storedHash)));
  } catch {
    return false;
  }
}

export function getAdminPassword(): { hash: string; salt: string; isDefault: boolean } {
  const d = getDb();
  const result = d.exec("SELECT password_hash, salt, is_default FROM admin_auth WHERE id = 1");
  if (!result.length || !result[0].values.length) {
    const { hash, salt } = hashPassword(DEFAULT_PASSWORD);
    d.run("INSERT INTO admin_auth (id, password_hash, salt, is_default) VALUES (1, ?, ?, 1)", [hash, salt]);
    persistDb();
    return { hash, salt, isDefault: true };
  }
  const [hash, salt, isDefault] = result[0].values[0] as [string, string, number];
  return { hash, salt, isDefault: isDefault === 1 };
}

export function setAdminPassword(newPassword: string): void {
  const d = getDb();
  const { hash, salt } = hashPassword(newPassword);
  d.run("DELETE FROM admin_auth WHERE id = 1");
  d.run("INSERT INTO admin_auth (id, password_hash, salt, is_default) VALUES (1, ?, ?, 0)", [hash, salt]);
  persistDb();
}

// ─── Guest PIN Access ───────────────────────────────────────

export function isGuestPinEnabled(): boolean {
  return readSetting('GUEST_PIN_ENABLED') === 'true';
}

export function setGuestPinEnabled(enabled: boolean): void {
  writeSetting('GUEST_PIN_ENABLED', enabled ? 'true' : 'false');
}

export function readGuestPins(): string[] {
  const raw = readSetting('GUEST_PINS');
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveGuestPins(pins: string[]): void {
  writeSetting('GUEST_PINS', JSON.stringify(pins));
}

export function verifyGuestPin(pin: string): boolean {
  if (!isGuestPinEnabled()) return true; // PIN not required
  const pins = readGuestPins();
  return pins.includes(pin);
}
