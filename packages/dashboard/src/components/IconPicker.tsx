import { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Icon, loadIcons, iconLoaded } from '@iconify/react';

/**
 * IconPicker — Browsable MDI icon library with color-coded categories and search.
 * ~300 hand-picked icons across 15 categories using @iconify/react.
 */

interface IconCategory {
  label: string;
  color: string;
  icons: string[];
}

const ICON_CATEGORIES: IconCategory[] = [
  {
    label: 'Lighting',
    color: '#ffd54f',
    icons: [
      'mdi:lightbulb', 'mdi:lightbulb-outline', 'mdi:lightbulb-group', 'mdi:lightbulb-on',
      'mdi:lamp', 'mdi:floor-lamp', 'mdi:desk-lamp', 'mdi:ceiling-light',
      'mdi:led-strip', 'mdi:led-strip-variant', 'mdi:track-light',
      'mdi:wall-sconce', 'mdi:wall-sconce-round', 'mdi:vanity-light',
      'mdi:chandelier', 'mdi:outdoor-lamp', 'mdi:lava-lamp',
      'mdi:string-lights', 'mdi:light-switch', 'mdi:brightness-5',
    ],
  },
  {
    label: 'Climate',
    color: '#4fc3f7',
    icons: [
      'mdi:thermometer', 'mdi:thermometer-half', 'mdi:thermometer-high', 'mdi:thermometer-low',
      'mdi:air-conditioner', 'mdi:hvac', 'mdi:fan', 'mdi:fan-off',
      'mdi:snowflake', 'mdi:fire', 'mdi:water-percent', 'mdi:weather-windy',
      'mdi:heat-wave', 'mdi:coolant-temperature', 'mdi:radiator',
      'mdi:air-humidifier', 'mdi:air-purifier', 'mdi:air-filter',
      'mdi:thermostat', 'mdi:thermostat-box',
    ],
  },
  {
    label: 'Security',
    color: '#ef5350',
    icons: [
      'mdi:lock', 'mdi:lock-open', 'mdi:lock-smart', 'mdi:shield-home',
      'mdi:shield-lock', 'mdi:alarm-light', 'mdi:bell-ring', 'mdi:bell',
      'mdi:cctv', 'mdi:video-surveillance', 'mdi:camera', 'mdi:camera-iris',
      'mdi:motion-sensor', 'mdi:door-sensor', 'mdi:window-sensor',
      'mdi:smoke-detector', 'mdi:fire-alert', 'mdi:siren',
      'mdi:shield-check', 'mdi:security',
    ],
  },
  {
    label: 'Doors & Windows',
    color: '#ab47bc',
    icons: [
      'mdi:door', 'mdi:door-open', 'mdi:door-closed', 'mdi:door-closed-lock',
      'mdi:window-closed', 'mdi:window-open', 'mdi:window-shutter',
      'mdi:window-shutter-open', 'mdi:blinds', 'mdi:blinds-open',
      'mdi:curtains', 'mdi:curtains-closed', 'mdi:garage', 'mdi:garage-open',
      'mdi:gate', 'mdi:gate-open', 'mdi:roller-shade', 'mdi:roller-shade-closed',
      'mdi:awning', 'mdi:awning-outline',
    ],
  },
  {
    label: 'Rooms',
    color: '#66bb6a',
    icons: [
      'mdi:sofa', 'mdi:bed', 'mdi:bed-double', 'mdi:bunk-bed',
      'mdi:bathtub', 'mdi:shower', 'mdi:toilet', 'mdi:sink',
      'mdi:television', 'mdi:desk', 'mdi:table-furniture',
      'mdi:wardrobe', 'mdi:bookshelf', 'mdi:chair-rolling',
      'mdi:stairs', 'mdi:elevator', 'mdi:room-service',
      'mdi:baby-carriage', 'mdi:toy-brick', 'mdi:cradle',
    ],
  },
  {
    label: 'Kitchen',
    color: '#ff7043',
    icons: [
      'mdi:fridge', 'mdi:fridge-outline', 'mdi:stove', 'mdi:microwave',
      'mdi:dishwasher', 'mdi:coffee-maker', 'mdi:toaster-oven',
      'mdi:blender', 'mdi:food-fork-drink', 'mdi:pot-steam',
      'mdi:silverware-fork-knife', 'mdi:glass-wine', 'mdi:beer',
      'mdi:water-pump', 'mdi:faucet', 'mdi:countertop',
      'mdi:kettle', 'mdi:grill', 'mdi:ice-cream', 'mdi:food-apple',
    ],
  },
  {
    label: 'Media',
    color: '#7e57c2',
    icons: [
      'mdi:speaker', 'mdi:speaker-wireless', 'mdi:cast', 'mdi:cast-audio',
      'mdi:play-circle', 'mdi:pause-circle', 'mdi:skip-next', 'mdi:skip-previous',
      'mdi:volume-high', 'mdi:volume-medium', 'mdi:volume-low', 'mdi:volume-off',
      'mdi:headphones', 'mdi:microphone', 'mdi:music', 'mdi:music-note',
      'mdi:radio', 'mdi:gamepad-variant', 'mdi:monitor', 'mdi:projector',
    ],
  },
  {
    label: 'Power & Energy',
    color: '#ffa726',
    icons: [
      'mdi:power-plug', 'mdi:power-plug-off', 'mdi:power-socket',
      'mdi:flash', 'mdi:flash-off', 'mdi:battery', 'mdi:battery-charging',
      'mdi:battery-50', 'mdi:battery-alert',
      'mdi:solar-power', 'mdi:solar-panel', 'mdi:wind-turbine', 'mdi:ev-station',
      'mdi:meter-electric', 'mdi:transmission-tower',
      'mdi:power-cycle', 'mdi:lightning-bolt', 'mdi:electric-switch',
      'mdi:surge-protector', 'mdi:battery-heart',
    ],
  },
  {
    label: 'Sensors',
    color: '#26c6da',
    icons: [
      'mdi:eye', 'mdi:motion-sensor', 'mdi:run', 'mdi:walk',
      'mdi:water-alert', 'mdi:leak', 'mdi:gauge', 'mdi:speedometer',
      'mdi:scale-bathroom', 'mdi:pulse', 'mdi:heart-pulse',
      'mdi:signal', 'mdi:signal-cellular-3', 'mdi:wifi',
      'mdi:bluetooth', 'mdi:nfc', 'mdi:chip',
      'mdi:counter', 'mdi:timer-sand', 'mdi:clock-outline',
    ],
  },
  {
    label: 'Weather',
    color: '#42a5f5',
    icons: [
      'mdi:weather-sunny', 'mdi:weather-night', 'mdi:weather-cloudy',
      'mdi:weather-partly-cloudy', 'mdi:weather-rainy', 'mdi:weather-pouring',
      'mdi:weather-snowy', 'mdi:weather-snowy-heavy', 'mdi:weather-lightning',
      'mdi:weather-fog', 'mdi:weather-windy-variant', 'mdi:weather-hail',
      'mdi:umbrella', 'mdi:sunglasses', 'mdi:moon-waning-crescent',
      'mdi:sun-compass', 'mdi:thermometer-lines', 'mdi:waves',
      'mdi:weather-tornado', 'mdi:weather-hurricane',
    ],
  },
  {
    label: 'Outdoor & Garden',
    color: '#8bc34a',
    icons: [
      'mdi:tree', 'mdi:flower', 'mdi:flower-tulip', 'mdi:leaf',
      'mdi:sprout', 'mdi:grass', 'mdi:mushroom', 'mdi:cactus',
      'mdi:water', 'mdi:watering-can', 'mdi:sprinkler', 'mdi:sprinkler-variant',
      'mdi:lawn-mower', 'mdi:shovel', 'mdi:rake', 'mdi:grill-outline',
      'mdi:pool', 'mdi:hot-tub', 'mdi:fence', 'mdi:patio-heater',
    ],
  },
  {
    label: 'Appliances',
    color: '#78909c',
    icons: [
      'mdi:washing-machine', 'mdi:tumble-dryer', 'mdi:iron',
      'mdi:vacuum', 'mdi:vacuum-outline', 'mdi:robot-vacuum',
      'mdi:water-boiler', 'mdi:water-heater', 'mdi:hair-dryer',
      'mdi:printer-3d', 'mdi:printer', 'mdi:router-wireless',
      'mdi:access-point', 'mdi:nas', 'mdi:server',
      'mdi:cellphone', 'mdi:laptop', 'mdi:tablet',
      'mdi:watch', 'mdi:keyboard',
    ],
  },
  {
    label: 'Transport',
    color: '#5c6bc0',
    icons: [
      'mdi:car', 'mdi:car-electric', 'mdi:car-connected', 'mdi:car-door',
      'mdi:garage-variant', 'mdi:bicycle', 'mdi:motorbike', 'mdi:scooter',
      'mdi:bus', 'mdi:train', 'mdi:airplane', 'mdi:boat',
      'mdi:parking', 'mdi:gas-station', 'mdi:ev-plug-type2',
      'mdi:map-marker', 'mdi:compass', 'mdi:navigation', 'mdi:road', 'mdi:traffic-light',
    ],
  },
  {
    label: 'People & Home',
    color: '#ec407a',
    icons: [
      'mdi:home', 'mdi:home-outline', 'mdi:home-variant', 'mdi:home-assistant',
      'mdi:account', 'mdi:account-group', 'mdi:account-child',
      'mdi:dog', 'mdi:cat', 'mdi:paw', 'mdi:baby-face-outline',
      'mdi:human-male-female', 'mdi:human-greeting', 'mdi:hand-wave',
      'mdi:phone', 'mdi:email', 'mdi:calendar', 'mdi:bell-alert',
      'mdi:heart', 'mdi:star',
    ],
  },
  {
    label: 'Automation & System',
    color: '#78909c',
    icons: [
      'mdi:cog', 'mdi:cog-outline', 'mdi:wrench', 'mdi:tools',
      'mdi:auto-fix', 'mdi:robot', 'mdi:script-text', 'mdi:code-tags',
      'mdi:webhook', 'mdi:api', 'mdi:cloud', 'mdi:database',
      'mdi:update', 'mdi:reload', 'mdi:sync', 'mdi:timer',
      'mdi:toggle-switch', 'mdi:numeric', 'mdi:form-select',
      'mdi:palette', 'mdi:format-paint',
    ],
  },
];

const ALL_ICONS = ICON_CATEGORIES.flatMap(cat => cat.icons.map(icon => ({ icon, color: cat.color, category: cat.label })));
const ALL_ICON_NAMES = ALL_ICONS.map(i => i.icon);

// Preload all icons once at module level — starts the API fetch immediately
let iconsPreloaded = false;
let iconsReady = false;
const preloadListeners: Array<() => void> = [];

function ensureIconsPreloaded() {
  if (iconsPreloaded) return;
  iconsPreloaded = true;
  loadIcons(ALL_ICON_NAMES, (_loaded, _missing, _pending) => {
    iconsReady = true;
    for (const fn of preloadListeners) fn();
    preloadListeners.length = 0;
  });
}

// Start preloading right away
ensureIconsPreloaded();

interface IconPickerProps {
  value: string;
  onChange: (icon: string) => void;
}

export function IconPicker({ value, onChange }: IconPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(iconsReady);
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Track when icons finish loading
  useEffect(() => {
    if (iconsReady) { setLoaded(true); return; }
    const handler = () => setLoaded(true);
    preloadListeners.push(handler);
    return () => {
      const idx = preloadListeners.indexOf(handler);
      if (idx >= 0) preloadListeners.splice(idx, 1);
    };
  }, []);

  // Position popup near trigger button
  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const panelWidth = 360;
      const panelHeight = 420;
      let top = rect.bottom + 6;
      let left = rect.left;

      // Keep within viewport
      if (left + panelWidth > window.innerWidth - 8) {
        left = window.innerWidth - panelWidth - 8;
      }
      if (top + panelHeight > window.innerHeight - 8) {
        top = rect.top - panelHeight - 6;
      }
      setPos({ top: Math.max(8, top), left: Math.max(8, left) });
    }
  }, [open]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        btnRef.current && !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  // Filtered icons based on search
  const filteredIcons = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q && !activeCategory) return ALL_ICONS;
    return ALL_ICONS.filter(item => {
      if (activeCategory && item.category !== activeCategory) return false;
      if (q) {
        const name = item.icon.replace('mdi:', '').replace(/-/g, ' ');
        return name.includes(q) || item.category.toLowerCase().includes(q);
      }
      return true;
    });
  }, [search, activeCategory]);

  const displayIcon = value || 'mdi:lightbulb';
  // Only show trigger icon if it's loaded
  const triggerLoaded = !value || iconLoaded(value);

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="icon-picker-trigger"
        onClick={() => setOpen(!open)}
        title="Pick icon"
      >
        {triggerLoaded ? (
          <Icon icon={displayIcon} width={22} height={22} />
        ) : (
          <span style={{ width: 22, height: 22, display: 'inline-block', opacity: 0.3 }}>⚙</span>
        )}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="icon-picker-panel"
          style={{ top: pos.top, left: pos.left }}
        >
          {/* Search bar */}
          <div className="icon-picker-search">
            <input
              type="text"
              placeholder="Search icons..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />
          </div>

          {/* Category tabs */}
          <div className="icon-picker-categories">
            <button
              type="button"
              className={`icon-cat-tab${!activeCategory ? ' active' : ''}`}
              onClick={() => setActiveCategory(null)}
              style={{ '--cat-color': '#aaa' } as React.CSSProperties}
            >
              All
            </button>
            {ICON_CATEGORIES.map(cat => (
              <button
                key={cat.label}
                type="button"
                className={`icon-cat-tab${activeCategory === cat.label ? ' active' : ''}`}
                onClick={() => setActiveCategory(activeCategory === cat.label ? null : cat.label)}
                style={{ '--cat-color': cat.color } as React.CSSProperties}
                title={cat.label}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Icon grid */}
          <div className="icon-picker-grid">
            {!loaded ? (
              <p className="icon-picker-empty">Loading icons...</p>
            ) : (
              <>
                {filteredIcons.map((item, i) => (
                  <button
                    key={`${item.icon}-${i}`}
                    type="button"
                    className={`icon-picker-item${item.icon === value ? ' selected' : ''}`}
                    onClick={() => { onChange(item.icon); setOpen(false); }}
                    title={item.icon.replace('mdi:', '').replace(/-/g, ' ')}
                    style={{ color: item.color }}
                  >
                    {iconLoaded(item.icon) ? (
                      <Icon icon={item.icon} width={24} height={24} />
                    ) : (
                      <span style={{ width: 24, height: 24, display: 'inline-block', borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
                    )}
                  </button>
                ))}
                {filteredIcons.length === 0 && (
                  <p className="icon-picker-empty">No icons match "{search}"</p>
                )}
              </>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
