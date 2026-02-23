/** Map entity domain to icon name for domain chips and fallback displays */
export const DOMAIN_ICONS: Record<string, string> = {
  light: '💡',
  switch: '🔌',
  climate: '🌡️',
  sensor: '📊',
  binary_sensor: '🔲',
  lock: '🔒',
  cover: '🪟',
  media_player: '🎵',
  camera: '📷',
  fan: '🌀',
  vacuum: '🧹',
  automation: '⚡',
  scene: '🎬',
  script: '📜',
  weather: '🌤️',
  person: '👤',
  input_boolean: '☑️',
  input_number: '#️⃣',
  input_select: '📋',
  alarm_control_panel: '🚨',
};

/** Get a human-readable label for a domain */
export function domainLabel(domain: string): string {
  return domain
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

/** Get icon for a domain */
export function domainIcon(domain: string): string {
  return DOMAIN_ICONS[domain] ?? '🔧';
}

/** Extract domain from entity_id */
export function getDomain(entityId: string): string {
  return entityId.split('.')[0];
}

/** Determine if entity is a binary sensor type that should show open/closed */
export function isBinarySensorDoor(deviceClass?: string): boolean {
  return ['door', 'window', 'opening', 'garage_door'].includes(deviceClass ?? '');
}

/** Determine if entity is a motion-type binary sensor */
export function isBinarySensorMotion(deviceClass?: string): boolean {
  return ['motion', 'occupancy', 'presence'].includes(deviceClass ?? '');
}

/** Get human-readable state for binary sensors */
export function binarySensorState(state: string, deviceClass?: string): string {
  if (isBinarySensorDoor(deviceClass)) {
    return state === 'on' ? 'open' : 'closed';
  }
  if (isBinarySensorMotion(deviceClass)) {
    return state === 'on' ? 'active' : 'inactive';
  }
  return state;
}
