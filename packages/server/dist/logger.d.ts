declare function normalizeLevel(l: string | undefined): string;
declare function setLevel(l: string): void;
declare function debug(msg: unknown): void;
declare function info(msg: unknown): void;
declare function warn(msg: unknown): void;
declare function error(msg: unknown): void;
declare function critical(msg: unknown): void;
declare const _default: {
    setLevel: typeof setLevel;
    debug: typeof debug;
    info: typeof info;
    warn: typeof warn;
    error: typeof error;
    critical: typeof critical;
    normalizeLevel: typeof normalizeLevel;
};
export default _default;
//# sourceMappingURL=logger.d.ts.map