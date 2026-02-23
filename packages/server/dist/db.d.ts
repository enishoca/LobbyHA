import { type Database } from 'sql.js';
export declare function initDb(dataDir: string): Promise<Database>;
export declare function getDb(): Database;
export declare function persistDb(): void;
export declare function readHiddenEntities(): string[];
export declare function setHiddenEntities(hidden: string[]): void;
export declare function setEntityHidden(entityId: string, hidden: boolean): void;
export declare function readLayout(): string[];
export declare function saveLayout(order: string[]): void;
export declare function readGuestEntities(): string[];
export declare function readGuestTitle(): string;
export declare function saveGuestEntities(entities: string[]): void;
export declare function saveGuestTitle(title: string): void;
export interface Module {
    id: number;
    name: string;
    icon: string;
    position: number;
    visible: boolean;
    entities: string[];
}
export declare function readModules(): Module[];
export declare function createModule(name: string, icon?: string): Module;
export declare function updateModule(id: number, updates: {
    name?: string;
    icon?: string;
    position?: number;
    visible?: boolean;
}): void;
export declare function deleteModule(id: number): void;
export declare function setModuleEntities(moduleId: number, entityIds: string[]): void;
export declare function reorderModules(moduleIds: number[]): void;
export interface EntityDisplayProps {
    entity_id: string;
    custom_name?: string | null;
    custom_icon?: string | null;
    show_last_updated?: boolean;
    hide_state?: boolean;
    hide_updated?: boolean;
    hide_attributes?: boolean;
    hide_logbook?: boolean;
}
export declare function readEntityDisplayProps(entityId: string): EntityDisplayProps | null;
export declare function readAllEntityDisplayProps(): EntityDisplayProps[];
export declare function saveEntityDisplayProps(entityId: string, props: {
    custom_name?: string | null;
    custom_icon?: string | null;
    show_last_updated?: boolean;
    hide_state?: boolean;
    hide_updated?: boolean;
    hide_attributes?: boolean;
    hide_logbook?: boolean;
}): void;
export declare function deleteEntityDisplayProps(entityId: string): void;
export declare function readSetting(key: string): string | null;
export declare function readAllSettings(): Record<string, string>;
export declare function writeSetting(key: string, value: string): void;
export declare function writeSettings(entries: Record<string, string>): void;
export declare function hasSettings(): boolean;
export declare function verifyPassword(password: string, storedHash: string, storedSalt: string): boolean;
export declare function getAdminPassword(): {
    hash: string;
    salt: string;
    isDefault: boolean;
};
export declare function setAdminPassword(newPassword: string): void;
export declare function isGuestPinEnabled(): boolean;
export declare function setGuestPinEnabled(enabled: boolean): void;
export declare function readGuestPins(): string[];
export declare function saveGuestPins(pins: string[]): void;
export declare function verifyGuestPin(pin: string): boolean;
//# sourceMappingURL=db.d.ts.map