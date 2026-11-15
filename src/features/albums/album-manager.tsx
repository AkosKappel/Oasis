import { useSpaceRepositories } from '@/features/spaces/space-context';
import { reportStorageError } from '@/database/storage-health';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { validateAlbumArchive, type PreparedImage } from '@/database/albums';
import { useAlbums } from './use-albums';
import {
  BUILTIN_ALBUMS,
  builtinAlbumId,
  isBuiltinAlbum,
} from '@/database/builtin-albums';
import { prepareImage, verifyArchivedImages } from './prepare-image';

export function AlbumManager({ onClose }: { onClose: () => void }) {
  const { personalAlbums } = useSpaceRepositories();
  const dialog = useRef<HTMLDialogElement>(null);
  const previous = useRef(document.activeElement);
  const { data, error: loadError } = useAlbums();
  const [selected, setSelected] = useState('');
  const [name, setName] = useState('');
  const [editing, setEditing] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [message, setMessage] = useState('');
  const album =
    data?.albums.find((item) => item.id === selected) ??
    data?.albums.find((item) => item.id === data.background?.albumId) ??
    data?.albums[0];
  const builtin = album ? isBuiltinAlbum(album.id) : false;
  useEffect(() => {
    const focused = previous.current;
    dialog.current?.showModal();
    return () => {
      if (focused instanceof HTMLElement && focused.isConnected)
        focused.focus();
    };
  }, []);
  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(undefined);
    setMessage('');
    try {
      await action();
    } catch (cause) {
      reportStorageError(cause);
      setError(
        cause instanceof Error
          ? cause.message
          : 'Images could not be saved. Your existing images are unchanged.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <dialog
      ref={dialog}
      className="editor !max-w-3xl"
      aria-labelledby="albums-title"
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
    >
      <div className="flex items-center justify-between gap-4">
        <h2 id="albums-title" className="text-2xl font-semibold">
          Image albums
        </h2>
        <Button variant="outline" disabled={busy} onClick={onClose}>
          Done
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        Choose a built-in collection or upload your own images. Everything works
        offline.
      </p>
      <section className="mt-5" aria-labelledby="builtin-albums-title">
        <h3 id="builtin-albums-title" className="font-semibold">
          Built-in albums
        </h3>
        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {BUILTIN_ALBUMS.map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={busy || !data}
              aria-pressed={album?.id === builtinAlbumId(item.id)}
              onClick={() => {
                setSelected(builtinAlbumId(item.id));
                setEditing(undefined);
                setName('');
              }}
              className="overflow-hidden rounded-lg border border-border text-left aria-pressed:border-primary-content aria-pressed:ring-2 aria-pressed:ring-primary-content"
            >
              <img
                src={`/albums/${item.images[0].id}.webp`}
                alt=""
                className="aspect-[8/5] w-full object-cover"
              />
              <span className="block px-3 py-2 text-sm font-medium">
                {item.name}
              </span>
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Original AI-generated artwork, included with Oasis. Your current
          background stays until you choose an image or save daily rotation.
        </p>
      </section>
      <h3 className="mt-6 font-semibold">Your albums</h3>
      <form
        className="mt-3 flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          void run(async () => {
            const id = await personalAlbums.saveAlbum(name, editing);
            setSelected(id);
            setName('');
            setEditing(undefined);
          });
        }}
      >
        <label className="field min-w-0 flex-1">
          {editing ? 'Album name' : 'New album name'}
          <input
            required
            maxLength={80}
            disabled={busy}
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <Button disabled={busy}>
          {editing ? 'Save album' : 'Create album'}
        </Button>
        {editing && (
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => {
              setEditing(undefined);
              setName('');
            }}
          >
            Cancel edit
          </Button>
        )}
      </form>
      {!!data?.albums.length && (
        <label className="field mt-5">
          Album
          <select
            disabled={busy}
            value={album?.id ?? ''}
            onChange={(event) => setSelected(event.target.value)}
          >
            <optgroup label="Built-in">
              {data.albums
                .filter((item) => isBuiltinAlbum(item.id))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </optgroup>
            <optgroup label="Your albums">
              {data.albums
                .filter((item) => !isBuiltinAlbum(item.id))
                .map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
            </optgroup>
          </select>
        </label>
      )}
      {album && (
        <>
          {builtin && (
            <p className="mt-4 text-sm text-muted-foreground">
              {
                BUILTIN_ALBUMS.find(
                  (item) => builtinAlbumId(item.id) === album.id,
                )?.description
              }{' '}
              Built-in albums stay available and cannot be edited.
            </p>
          )}
          {!builtin && (
            <>
              <div className="my-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setEditing(album.id);
                    setName(album.name);
                  }}
                >
                  Rename album
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete album “${album.name}” and its images?`,
                      )
                    )
                      void run(async () => {
                        await personalAlbums.remove(album.id, 'album');
                        setSelected('');
                      });
                  }}
                >
                  Delete album
                </Button>
              </div>
              <label className="field">
                Upload images
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  disabled={busy}
                  onChange={(event) => {
                    const files = Array.from(event.target.files ?? []);
                    event.target.value = '';
                    if (files.length)
                      void run(async () => {
                        if (files.length > 100)
                          throw new Error('Choose up to 100 images.');
                        const prepared: PreparedImage[] = [];
                        for (const file of files)
                          prepared.push(await prepareImage(file));
                        await personalAlbums.addImages(album.id, prepared);
                        setMessage('Images added.');
                      });
                  }}
                />
              </label>
            </>
          )}
          <form
            key={`${album.id}:${data?.background?.updatedAt ?? 0}`}
            className="my-5 flex flex-col gap-3 rounded-lg border border-border p-4"
            onSubmit={(event) => {
              event.preventDefault();
              const values = new FormData(event.currentTarget);
              void run(async () => {
                await personalAlbums.setBackground(
                  album.id,
                  data?.background?.albumId === album.id
                    ? data.background.imageId
                    : undefined,
                  {
                    rotateDaily: values.has('daily'),
                    mixAllAlbums: values.has('mix'),
                    dimming: Number(values.get('dimming')) / 100,
                  },
                );
                setMessage('Background settings saved.');
              });
            }}
          >
            <label className="flex items-center gap-2 text-sm">
              <input
                name="daily"
                type="checkbox"
                defaultChecked={
                  data?.background?.albumId === album.id
                    ? data.background.rotateDaily
                    : builtin
                }
                disabled={busy}
              />{' '}
              Rotate this album daily
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                name="mix"
                type="checkbox"
                defaultChecked={data?.background?.mixAllAlbums ?? false}
                disabled={busy}
              />{' '}
              Mix all albums during daily rotation
            </label>
            <p className="text-xs text-muted-foreground">
              Likes favor an image and others in its album. Dislikes skip images
              during rotation. Fixed images stay fixed.
            </p>
            <label className="field">
              Background dimming
              <select
                name="dimming"
                defaultValue={String((data?.background?.dimming ?? 0.6) * 100)}
                disabled={busy}
              >
                <option value="60">60%</option>
                <option value="70">70%</option>
                <option value="85">85%</option>
              </select>
            </label>
            <p className="text-xs text-muted-foreground">
              The same image stays all day, including across tabs. White text
              stays readable with dimming.
            </p>
            <Button
              size="sm"
              disabled={
                busy ||
                !data?.images.some((image) => image.albumId === album.id)
              }
            >
              Save background settings
            </Button>
          </form>
          <ul className="mt-5 grid gap-4 sm:grid-cols-3">
            {data?.images
              .filter((image) => image.albumId === album.id)
              .map((image) => (
                <li
                  key={image.id}
                  className="min-w-0 rounded-lg border border-border p-2"
                >
                  <img
                    src={image.dataUrl}
                    alt={image.name}
                    className="h-28 w-full rounded object-cover"
                  />
                  <p className="my-2 truncate text-xs">{image.name}</p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() =>
                        void run(() =>
                          personalAlbums.setBackground(album.id, image.id, {
                            rotateDaily: false,
                            dimming: data?.background?.dimming ?? 0.6,
                          }),
                        )
                      }
                    >
                      Use image
                    </Button>
                    {!builtin && (
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={busy}
                        aria-label={`Delete image ${image.name}`}
                        onClick={() => {
                          if (window.confirm(`Delete image “${image.name}”?`))
                            void run(() =>
                              personalAlbums.remove(image.id, 'image'),
                            );
                        }}
                      >
                        Delete
                      </Button>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        </>
      )}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button
          variant="outline"
          disabled={busy}
          onClick={() => void run(() => personalAlbums.setBackground())}
        >
          Use plain background
        </Button>
        <Button
          variant="outline"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const url = URL.createObjectURL(
                new Blob([JSON.stringify(await personalAlbums.export())], {
                  type: 'application/json',
                }),
              );
              const link = document.createElement('a');
              link.href = url;
              link.download = 'oasis-albums.json';
              link.click();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
              setMessage('Album backup downloaded.');
            })
          }
        >
          Download album backup
        </Button>
      </div>
      <label className="field mt-5">
        Restore album backup
        <input
          type="file"
          accept=".json,application/json"
          disabled={busy}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = '';
            if (file)
              void run(async () => {
                if (file.size > 50 * 1024 * 1024)
                  throw new Error('Choose an album backup smaller than 50 MB.');
                const archive = validateAlbumArchive(
                  JSON.parse(await file.text()),
                );
                await verifyArchivedImages(archive.images);
                if (
                  !window.confirm(
                    `Restore ${archive.albums.length} albums and ${archive.images.length} images? Existing records stay unchanged.`,
                  )
                )
                  return;
                await personalAlbums.restore(archive);
                setMessage('Albums restored.');
              });
          }}
        />
      </label>
      <p className="mt-3 text-xs text-muted-foreground">
        Your albums can hold up to 100 images and 30 MB after resizing. Built-in
        images do not use this allowance and are not copied into backups. Album
        backups are separate from bookmark backups.
      </p>
      {(error || loadError) && (
        <p role="alert" className="mt-4 text-sm text-danger">
          {error || loadError}
        </p>
      )}
      {message && (
        <p role="status" className="mt-4 text-sm">
          {message}
        </p>
      )}
    </dialog>
  );
}
