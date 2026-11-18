import { useRef, useState, type ReactNode } from 'react';
import { ChevronRight, Folder, History, Star, TrendingUp } from 'lucide-react';
import type { LinkFolderNode } from './link-groups';
import { LINK_DRAG_TYPE, LinkList } from './link-list';

const EXPANDED_KEY = 'oasis:links-expanded';

/** Which sections and folders are open, remembered per browser like the panel itself. */
function readExpanded() {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem(EXPANDED_KEY) ?? '[]',
    );
    return new Set(
      Array.isArray(value)
        ? value.filter((item) => typeof item === 'string')
        : [],
    );
  } catch {
    return new Set<string>();
  }
}
function saveExpanded(key: string, open: boolean) {
  try {
    const keys = readExpanded();
    if (open) keys.add(key);
    else keys.delete(key);
    localStorage.setItem(EXPANDED_KEY, JSON.stringify([...keys]));
  } catch {
    // Storage blocked: sections start closed next time.
  }
}

export function LinkSection({
  name,
  count,
  icon = 'folder',
  emoji,
  expanded = false,
  children,
  onDropLink,
  storageKey,
}: {
  onDropLink?: (id: string) => void;
  /** Remembers this section's open state; searches open everything without saving. */
  storageKey?: string;
  name: string;
  emoji?: string;
  count: number;
  icon?: 'folder' | 'recent' | 'frequent' | 'favorites';
  expanded?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(
    () => expanded || (!!storageKey && readExpanded().has(storageKey)),
  );
  const [target, setTarget] = useState(false);
  const expandTimer = useRef<number>(undefined);
  const Icon = {
    folder: Folder,
    recent: History,
    frequent: TrendingUp,
    favorites: Star,
  }[icon];
  return (
    <details
      open={open}
      onToggle={(event) => {
        if (event.target !== event.currentTarget) return;
        setOpen(event.currentTarget.open);
        if (storageKey && !expanded)
          saveExpanded(storageKey, event.currentTarget.open);
      }}
    >
      <summary
        className={`links-folder flex cursor-pointer list-none items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-secondary hover:text-secondary-foreground ${target ? 'bg-secondary text-secondary-foreground outline-2 outline-dashed outline-ring' : ''}`}
        title={name}
        onDragOver={(event) => {
          if (!onDropLink || !event.dataTransfer.types.includes(LINK_DRAG_TYPE))
            return;
          event.preventDefault();
          event.dataTransfer.dropEffect = 'move';
          if (!target && !open)
            // Hovering a dragged link over a closed folder opens it to drop inside.
            expandTimer.current = window.setTimeout(() => setOpen(true), 700);
          setTarget(true);
        }}
        onDragLeave={() => {
          window.clearTimeout(expandTimer.current);
          setTarget(false);
        }}
        onDrop={(event) => {
          window.clearTimeout(expandTimer.current);
          setTarget(false);
          const id = event.dataTransfer.getData(LINK_DRAG_TYPE);
          if (!onDropLink || !id) return;
          event.preventDefault();
          onDropLink(id);
        }}
      >
        <ChevronRight
          aria-hidden="true"
          className={`size-3 shrink-0 ${open ? 'rotate-90' : ''}`}
        />
        {emoji ? (
          <span aria-hidden="true" className="w-4 shrink-0 text-center text-sm">
            {emoji}
          </span>
        ) : (
          <Icon aria-hidden="true" className="size-4 shrink-0" />
        )}
        <span className="min-w-0 flex-1 truncate">{name}</span>
        <span className="shrink-0 text-xs opacity-70">{count}</span>
      </summary>
      {open && children}
    </details>
  );
}

export function LinkFolder({
  node,
  filtering,
  depth = 0,
  ...props
}: Omit<Parameters<typeof LinkList>[0], 'bookmarks'> & {
  node: LinkFolderNode;
  filtering: boolean;
  depth?: number;
}) {
  return (
    <LinkSection
      name={node.name}
      emoji={node.icon}
      count={node.count}
      expanded={filtering}
      storageKey={`folder:${node.id}`}
      onDropLink={
        props.busy ? undefined : (id) => void props.onMove(id, null, node.id)
      }
    >
      <div className={depth < 5 ? 'ml-3 border-l border-border/40 pl-1' : ''}>
        {node.children.map((child) => (
          <LinkFolder
            key={child.id}
            node={child}
            filtering={filtering}
            depth={depth + 1}
            {...props}
          />
        ))}
        <LinkList {...props} bookmarks={node.bookmarks} folderId={node.id} />
        {!node.count && (
          <p className="px-2 py-1.5 text-xs text-muted-foreground">
            Empty folder
          </p>
        )}
      </div>
    </LinkSection>
  );
}
