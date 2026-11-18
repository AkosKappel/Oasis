import { useId, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

/** A fixed set keeps icons legible everywhere, including inside native select options. */
export const ICON_CHOICES: readonly (readonly [string, string])[] = [
  ['📁', 'Folder'],
  ['⭐', 'Star'],
  ['❤️', 'Heart'],
  ['🏠', 'Home'],
  ['💼', 'Work'],
  ['📚', 'Books'],
  ['📰', 'News'],
  ['📝', 'Notes'],
  ['📅', 'Calendar'],
  ['✉️', 'Mail'],
  ['💬', 'Chat'],
  ['🔖', 'Bookmark'],
  ['💻', 'Computer'],
  ['🛠️', 'Tools'],
  ['🧪', 'Lab'],
  ['☁️', 'Cloud'],
  ['🔒', 'Lock'],
  ['🌐', 'Web'],
  ['🗺️', 'Map'],
  ['✈️', 'Travel'],
  ['🛒', 'Shopping'],
  ['💰', 'Money'],
  ['📈', 'Chart'],
  ['🎓', 'School'],
  ['💡', 'Idea'],
  ['🎨', 'Design'],
  ['📷', 'Photos'],
  ['🎵', 'Music'],
  ['🎬', 'Video'],
  ['🎮', 'Games'],
  ['⚽', 'Sport'],
  ['🏃', 'Fitness'],
  ['🩺', 'Health'],
  ['🍳', 'Cooking'],
  ['☕', 'Coffee'],
  ['🌱', 'Plant'],
  ['🐾', 'Pets'],
  ['👶', 'Family'],
  ['🎁', 'Gift'],
  ['🚀', 'Rocket'],
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
  const current = ICON_CHOICES.find(([icon]) => icon === value);
  function choose(icon: string) {
    onChange(icon);
    popover.current?.hidePopover();
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
        <div className="grid grid-cols-8 gap-0.5">
          {ICON_CHOICES.map(([icon, iconLabel]) => (
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
