export interface AppConfig {
    HA_URL: string;
    HA_TOKEN: string;
    PORT: number;
    LOG_LEVEL: string;
    ALLOWED_ENTITIES: string[];
    ADMIN_PASSWORD?: string;
}
export declare function getDataDir(override?: string): string;
/**
 * Bootstrap config: returns minimal config from env vars / defaults
 * so the server can determine PORT before DB is initialized.
 */
export declare function bootstrapConfig(): AppConfig;
/**
 * Load config from the DB settings table. Must be called after initDb().
 * Merges DB values over env-var defaults.
 */
export declare function loadConfig(): AppConfig;
export declare function saveConfig(config: AppConfig): void;
export declare function getConfig(): AppConfig;
export declare function updateConfig(updates: Partial<AppConfig>): AppConfig;
export declare function needsSetup(): boolean;
/**
 * One-time migration: import settings from legacy config.yaml / options.json
 * into the DB settings table. Called once after DB init if settings table is empty.
 */
export declare function migrateFileConfigToDb(dataDir: string): boolean;
//# sourceMappingURL=config.d.ts.map