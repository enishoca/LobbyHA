const LEVELS: Record<string, number> = {
  CRITICAL: 50,
  ERROR: 40,
  WARNING: 30,
  INFO: 20,
  DEBUG: 10,
};

let currentLevel = LEVELS.INFO;

function normalizeLevel(l: string | undefined): string {
  if (!l) return 'INFO';
  const s = String(l).toUpperCase();
  return LEVELS[s] ? s : 'INFO';
}

function setLevel(l: string): void {
  const name = normalizeLevel(l);
  currentLevel = LEVELS[name];
}

function enabled(levelName: string): boolean {
  return (LEVELS[levelName] ?? 99) >= currentLevel;
}

function format(levelName: string, msg: unknown): string {
  const t = new Date().toISOString();
  return `[${t}] ${levelName}: ${typeof msg === 'string' ? msg : JSON.stringify(msg)}`;
}

function debug(msg: unknown): void {
  if (enabled('DEBUG')) console.debug(format('DEBUG', msg));
}

function info(msg: unknown): void {
  if (enabled('INFO')) console.log(format('INFO', msg));
}

function warn(msg: unknown): void {
  if (enabled('WARNING')) console.warn(format('WARNING', msg));
}

function error(msg: unknown): void {
  if (enabled('ERROR')) console.error(format('ERROR', msg));
}

function critical(msg: unknown): void {
  if (enabled('CRITICAL')) console.error(format('CRITICAL', msg));
}

export default { setLevel, debug, info, warn, error, critical, normalizeLevel };
