import { useState } from 'react';
import { reportStorageError } from '@/database/storage-health';
import { useLibrary } from '@/features/bookmarks/use-library';
import { useLibraryPreferences } from '@/features/bookmarks/use-library-preferences';
import { folderOptions } from '@/features/organization/folder-tree';
import { useSpaceRepositories } from '@/features/spaces/space-context';

export function CaptureFolderSettings() {
  const { personalLibraryPreferences } = useSpaceRepositories();
  const { preferences } = useLibraryPreferences();
  const { library } = useLibrary();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState('');
  const folders = library?.folders ?? [];
  const current = folders.some(
    (folder) => folder.id === preferences.captureFolderId,
  )
    ? preferences.captureFolderId!
    : '';
  async function change(value: string) {
    setBusy(true);
    setError(undefined);
    setMessage('');
    try {
      await personalLibraryPreferences.save({
        captureFolderId: value || undefined,
      });
      setMessage('Capture folder saved.');
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'The capture folder could not be saved. Try again.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section
      aria-labelledby="capture-folder-title"
      className="mt-8 border-t border-border pt-6"
    >
      <h3 id="capture-folder-title" className="font-semibold">
        Saving pages
      </h3>
      <label className="field mt-3">
        Folder for new captures
        <select
          value={current}
          disabled={busy || !library}
          onChange={(event) => void change(event.target.value)}
        >
          <option value="">Unorganized</option>
          {folderOptions(folders).map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.path}
            </option>
          ))}
        </select>
      </label>
      <p className="mt-2 text-xs text-muted-foreground">
        The toolbar button, page and link menus and the keyboard shortcut start
        with this folder. You can change it before saving.
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="mt-2 text-sm">
          {message}
        </p>
      )}
    </section>
  );
}
