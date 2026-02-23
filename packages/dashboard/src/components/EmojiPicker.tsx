import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

const EMOJI_GROUPS: { label: string; emojis: string[] }[] = [
  {
    label: 'Home',
    emojis: ['🏠', '🏡', '🏢', '🏗', '🏘', '🏰', '🛏', '🛋', '🚪', '🪟', '🏕', '⛺', '🧱'],
  },
  {
    label: 'Rooms',
    emojis: ['🛁', '🚿', '🚽', '🪥', '🍳', '🍽', '🧑‍🍳', '📺', '🎮', '💻', '🖥', '📚', '🎵', '🎸', '🎹'],
  },
  {
    label: 'Lighting',
    emojis: ['💡', '🔦', '🕯', '🌟', '✨', '⭐', '🌙', '☀️', '🔆', '🔅', '🪔'],
  },
  {
    label: 'Climate',
    emojis: ['🌡', '❄️', '🔥', '💨', '🌀', '☁️', '🌤', '🌧', '🌊', '💧', '🧊'],
  },
  {
    label: 'Security',
    emojis: ['🔒', '🔓', '🔑', '🛡', '📹', '📷', '🚨', '🔔', '🚫', '⚠️', '👁'],
  },
  {
    label: 'Outdoor',
    emojis: ['🌳', '🌲', '🌿', '🌺', '🌻', '🌴', '🏊', '🅿️', '🚗', '🏋', '🧹', '🗑'],
  },
  {
    label: 'Appliances',
    emojis: ['🧺', '👕', '🫧', '🧊', '🍕', '☕', '🧃', '🥤', '🧽', '🪣', '🔌', '🔋', '⚡'],
  },
  {
    label: 'General',
    emojis: ['📦', '🎯', '🎨', '🧩', '🛠', '⚙️', '📊', '📈', '🗂', '📋', '✅', '❌', '➕', '🔄'],
  },
];

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
}

export function EmojiPicker({ value, onChange }: EmojiPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

  // Position the popup near the button
  useEffect(() => {
    if (open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({
        top: rect.bottom + 6,
        left: Math.max(8, rect.left - 100),
      });
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

  const allEmojis = EMOJI_GROUPS.flatMap(g => g.emojis);
  const filtered = search.trim()
    ? allEmojis.filter(() => true) // emojis don't have text names to search — show all when searching
    : null;

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        className="emoji-picker-trigger"
        onClick={() => setOpen(!open)}
        title="Pick icon"
      >
        {value || '🏠'}
      </button>

      {open && createPortal(
        <div
          ref={panelRef}
          className="emoji-picker-panel"
          style={{ top: pos.top, left: pos.left }}
        >
          <div className="emoji-picker-grid">
            {(filtered ?? EMOJI_GROUPS.flatMap(g => g.emojis)).map((emoji, i) => (
              <button
                key={`${emoji}-${i}`}
                type="button"
                className={`emoji-picker-item${emoji === value ? ' selected' : ''}`}
                onClick={() => { onChange(emoji); setOpen(false); }}
              >
                {emoji}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
