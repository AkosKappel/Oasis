import { useState, type SubmitEvent } from 'react';
import { Pencil, Trash2 } from 'lucide-react';
import { descendantFolderIds, folderOptions } from './folder-tree';
import { Button } from '@/components/ui/button';

interface OrganizationItem {
  id: string;
  name: string;
  color?: string;
  parentId?: string;
}
interface OrganizationSectionProps {
  kind: 'folder' | 'tag';
  items: OrganizationItem[];
  onSave: (
    name: string,
    color: string,
    id?: string,
    parentId?: string,
  ) => Promise<unknown>;
  onRemove: (id: string) => Promise<void>;
  onBusyChange: (busy: boolean) => void;
  disabled: boolean;
}

export function OrganizationSection({
  kind,
  items,
  onSave,
  onRemove,
  onBusyChange,
  disabled,
}: OrganizationSectionProps) {
  const [editingId, setEditingId] = useState<string>();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [color, setColor] = useState('#286443');
  const [error, setError] = useState<string>();
  const options = folderOptions(items);
  const paths = new Map(options.map((folder) => [folder.id, folder.path]));
  const blockedParents = editingId
    ? descendantFolderIds(items, editingId)
    : new Set<string>();
  const title = kind === 'folder' ? 'Folders' : 'Tags';

  function reset() {
    setEditingId(undefined);
    setName('');
    setParentId('');
    setColor('#286443');
    setError(undefined);
  }

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled) return;
    onBusyChange(true);
    setError(undefined);
    try {
      await onSave(name, color, editingId, parentId);
      reset();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `The ${kind} could not be saved. Try again.`,
      );
    } finally {
      onBusyChange(false);
    }
  }

  async function remove(item: OrganizationItem) {
    const consequence =
      kind === 'folder'
        ? 'Its bookmarks will move to Unorganized.'
        : 'It will be removed from all bookmarks.';
    if (
      !window.confirm(
        `Delete ${kind} “${item.name}”? ${consequence} Your bookmarks will be kept.`,
      )
    )
      return;
    onBusyChange(true);
    setError(undefined);
    try {
      await onRemove(item.id);
      if (editingId === item.id) reset();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : `The ${kind} could not be deleted. Try again.`,
      );
    } finally {
      onBusyChange(false);
    }
  }

  return (
    <section aria-labelledby={`${kind}-heading`} className="min-w-0">
      <h3 id={`${kind}-heading`} className="text-lg font-semibold">
        {title}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {kind === 'folder'
          ? 'Move folders by editing their parent.'
          : 'Connect bookmarks across folders.'}
      </p>
      <form onSubmit={save} className="mt-5 flex flex-col gap-3">
        <fieldset disabled={disabled} className="flex min-w-0 items-end gap-3">
          <label className="field min-w-0 flex-1">
            {editingId ? `Rename ${kind}` : `New ${kind} name`}
            <input
              required
              maxLength={80}
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={kind === 'folder' ? 'e.g. Reading' : 'e.g. Design'}
            />
          </label>
          {kind === 'tag' && (
            <label className="field">
              Tag color
              <input
                type="color"
                value={color}
                onChange={(event) => setColor(event.target.value)}
                className="h-10 !w-12 !p-1"
              />
            </label>
          )}
        </fieldset>
        {kind === 'folder' && (
          <label className="field">
            Parent folder
            <select
              disabled={disabled}
              value={parentId}
              onChange={(event) => setParentId(event.target.value)}
            >
              <option value="">Top level</option>
              {options
                .filter((folder) => !blockedParents.has(folder.id))
                .map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.path}
                  </option>
                ))}
            </select>
          </label>
        )}
        <div className="flex gap-2">
          <Button type="submit" size="sm" disabled={disabled}>
            {editingId ? `Save ${kind}` : `Create ${kind}`}
          </Button>
          {editingId && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={reset}
              disabled={disabled}
            >
              Cancel rename
            </Button>
          )}
        </div>
      </form>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
      {items.length === 0 ? (
        <p className="mt-5 text-sm text-muted-foreground">
          No {title.toLowerCase()} yet.
        </p>
      ) : (
        <ul className="mt-5 flex flex-col gap-2">
          {(kind === 'folder' ? options : items).map((item) => (
            <li
              key={item.id}
              className="flex min-w-0 items-center gap-2 rounded-lg border border-border px-3 py-2"
            >
              {item.color && (
                <span
                  className="size-3 shrink-0 rounded-full border border-black/15"
                  style={{ backgroundColor: item.color }}
                  aria-hidden="true"
                />
              )}
              <span className="min-w-0 flex-1 break-words text-sm">
                {kind === 'folder' ? paths.get(item.id) : item.name}
              </span>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={disabled}
                aria-label={`Edit ${kind} ${kind === 'folder' ? paths.get(item.id) : item.name}`}
                onClick={() => {
                  setEditingId(item.id);
                  setName(item.name);
                  setParentId(item.parentId ?? '');
                  setColor(item.color ?? '#286443');
                  setError(undefined);
                }}
              >
                <Pencil className="size-4" aria-hidden="true" />
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                disabled={disabled}
                aria-label={`Delete ${kind} ${kind === 'folder' ? paths.get(item.id) : item.name}`}
                onClick={() => void remove(item)}
              >
                <Trash2 className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
