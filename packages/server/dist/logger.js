const LEVELS = {
    CRITICAL: 50,
    ERROR: 40,
    WARNING: 30,
    INFO: 20,
    DEBUG: 10,
};
let currentLevel = LEVELS.INFO;
function normalizeLevel(l) {
    if (!l)
        return 'INFO';
    const s = String(l).toUpperCase();
    return LEVELS[s] ? s : 'INFO';
}
function setLevel(l) {
    const name = normalizeLevel(l);
    currentLevel = LEVELS[name];
}
function enabled(levelName) {
    return (LEVELS[levelName] ?? 99) >= currentLevel;
}
function format(levelName, msg) {
    const t = new Date().toISOString();
    return `[${t}] ${levelName}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`;
}
function debug(msg) {
    if (enabled('DEBUG'))
        console.debug(format('DEBUG', msg));
}
function info(msg) {
    if (enabled('INFO'))
        console.log(format('INFO', msg));
}
function warn(msg) {
    if (enabled('WARNING'))
        console.warn(format('WARNING', msg));
}
function error(msg) {
    if (enabled('ERROR'))
        console.error(format('ERROR', msg));
}
function critical(msg) {
    if (enabled('CRITICAL'))
        console.error(format('CRITICAL', msg));
}
export default { setLevel, debug, info, warn, error, critical, normalizeLevel };
//# sourceMappingURL=logger.js.map