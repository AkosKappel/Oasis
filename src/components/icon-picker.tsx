import { useId, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

/** A fixed set keeps icons legible everywhere, including inside native select options. */
/** Each icon has a name and extra search words. */
export const ICON_CHOICES: readonly (readonly [string, string, string])[] = [
  ['📁', 'Folder', 'directory files'],
  ['⭐', 'Star', 'favorite important'],
  ['❤️', 'Heart', 'love like favorite'],
  ['🏠', 'Home', 'house personal'],
  ['💼', 'Work', 'job office business briefcase'],
  ['📚', 'Books', 'read reading library learn'],
  ['📰', 'News', 'newspaper articles blog'],
  ['📝', 'Notes', 'write memo document todo'],
  ['📅', 'Calendar', 'date schedule events'],
  ['✉️', 'Mail', 'email inbox letter'],
  ['💬', 'Chat', 'message social talk'],
  ['🔖', 'Bookmark', 'saved later'],
  ['💻', 'Computer', 'code dev laptop tech'],
  ['🛠️', 'Tools', 'build settings fix utilities'],
  ['🧪', 'Lab', 'science research test'],
  ['☁️', 'Cloud', 'storage drive server'],
  ['🔒', 'Lock', 'security password private'],
  ['🌐', 'Web', 'internet globe world site'],
  ['🗺️', 'Map', 'location places navigation'],
  ['✈️', 'Travel', 'flight trip vacation plane'],
  ['🛒', 'Shopping', 'cart store buy'],
  ['💰', 'Money', 'finance bank budget'],
  ['📈', 'Chart', 'stats analytics growth'],
  ['🎓', 'School', 'education course university study'],
  ['💡', 'Idea', 'inspiration light tips'],
  ['🎨', 'Design', 'art paint creative'],
  ['📷', 'Photos', 'camera pictures images'],
  ['🎵', 'Music', 'audio songs'],
  ['🎬', 'Video', 'movies film tv watch'],
  ['🎮', 'Games', 'gaming play'],
  ['⚽', 'Sport', 'football fitness'],
  ['🏃', 'Fitness', 'run exercise workout'],
  ['🩺', 'Health', 'doctor medical'],
  ['🍳', 'Cooking', 'recipes food kitchen'],
  ['☕', 'Coffee', 'cafe drink break'],
  ['🌱', 'Plant', 'garden nature leaf green'],
  ['🐾', 'Pets', 'animals dog cat'],
  ['👶', 'Family', 'kids baby children'],
  ['🎁', 'Gift', 'present birthday'],
  ['🚀', 'Rocket', 'launch startup space projects'],
];

/**
 * Chooses an icon from a fixed list, or none to use the default.
 * Older free-text icons still show until another choice replaces them.
 */
export function IconPicker({
  label,
  value,
  onChange,
  name,
  noneLabel = 'Default',
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Adds a hidden input so uncontrolled forms submit the choice. */
  name?: string;
  noneLabel?: string;
  disabled?: boolean;
}) {
  const id = useId();
  const popover = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const current = ICON_CHOICES.find(([icon]) => icon === value);
  const [query, setQuery] = useState('');
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const matches = ICON_CHOICES.filter(([, iconLabel, extra]) => {
    const text = `${iconLabel} ${extra}`.toLowerCase();
    return words.every((word) => text.includes(word));
  });
  function choose(icon: string) {
    onChange(icon);
    popover.current?.hidePopover();
    setQuery('');
    trigger.current?.focus();
  }
  return (
    <div className="field">
      <span id={`${id}-label`}>{label}</span>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        popoverTarget={`${id}-choices`}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={(event) => {
          // Anchor the floating list under the button.
          const rect = event.currentTarget.getBoundingClientRect();
          const element = popover.current;
          if (!element) return;
          element.style.top = `${Math.min(rect.bottom + 4, innerHeight - 260)}px`;
          element.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - 296))}px`;
        }}
        className="flex w-full items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-left font-normal"
      >
        <span aria-hidden="true" className="w-5 text-center text-base">
          {value || '–'}
        </span>
        <span id={`${id}-value`} className="min-w-0 flex-1 truncate">
          {value ? (current?.[1] ?? value) : noneLabel}
        </span>
        <ChevronDown
          className="size-4 shrink-0 opacity-70"
          aria-hidden="true"
        />
      </button>
      <div
        ref={popover}
        id={`${id}-choices`}
        popover="auto"
        onToggle={(event) => {
          if (event.newState === 'open') search.current?.focus();
          else setQuery('');
        }}
        // Escape closes only this list, not a surrounding form that also listens for it.
        onKeyDown={(event) => {
          if (event.key === 'Escape') event.stopPropagation();
        }}
        role="dialog"
        aria-label={`Choose ${label.toLowerCase()}`}
        className="glass-panel m-0 w-72 rounded-lg border border-border bg-background p-2 text-foreground shadow-xl"
        style={{ position: 'fixed', right: 'auto', bottom: 'auto' }}
      >
        <button
          type="button"
          aria-pressed={!value}
          onClick={() => choose('')}
          className="mb-1 w-full rounded px-2 py-1.5 text-left text-sm font-normal hover:bg-secondary hover:text-secondary-foreground aria-pressed:bg-secondary aria-pressed:text-secondary-foreground"
        >
          {noneLabel}
        </button>
        <label className="mb-1 block">
          <span className="sr-only">Search icons</span>
          <input
            ref={search}
            type="search"
            value={query}
            placeholder="Search icons"
            onChange={(event) => setQuery(event.target.value)}
            className="w-full rounded-md border border-border bg-surface px-2 py-1.5 text-sm font-normal"
          />
        </label>
        {!matches.length && (
          <p className="px-2 py-1.5 text-sm font-normal text-muted-foreground">
            No matching icons.
          </p>
        )}
        <div className="grid grid-cols-8 gap-0.5">
          {matches.map(([icon, iconLabel]) => (
            <button
              key={icon}
              type="button"
              title={iconLabel}
              aria-label={iconLabel}
              aria-pressed={value === icon}
              onClick={() => choose(icon)}
              className="flex size-8 items-center justify-center rounded text-lg hover:bg-secondary aria-pressed:bg-secondary aria-pressed:outline-2 aria-pressed:outline-ring"
            >
              <span aria-hidden="true">{icon}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
