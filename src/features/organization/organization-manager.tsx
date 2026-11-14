import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { personalOrganization } from '@/database/organization';
import type { Folder, Tag } from '@/types/entities';
import { OrganizationSection } from './organization-section';

interface OrganizationManagerProps {
  folders: Folder[];
  tags: Tag[];
  onClose: () => void;
}

export function OrganizationManager({
  folders,
  tags,
  onClose,
}: OrganizationManagerProps) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      onCancel={(event) => {
        if (busy) event.preventDefault();
      }}
      onClose={onClose}
      aria-labelledby="organization-heading"
      className="editor !max-w-3xl"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Personal library</p>
          <h2 id="organization-heading" className="mt-2 text-2xl font-semibold">
            Folders and tags
          </h2>
        </div>
        <Button variant="outline" onClick={onClose} disabled={busy}>
          Done
        </Button>
      </div>
      <div className="grid gap-8 sm:grid-cols-2">
        <OrganizationSection
          kind="folder"
          items={folders}
          onSave={(name, _color, id, parentId) =>
            personalOrganization.saveFolder(name, id, parentId)
          }
          onRemove={personalOrganization.removeFolder}
          disabled={busy}
          onBusyChange={setBusy}
        />
        <OrganizationSection
          kind="tag"
          items={tags}
          onSave={(name, color, id) =>
            personalOrganization.saveTag({ name, color }, id)
          }
          onRemove={personalOrganization.removeTag}
          disabled={busy}
          onBusyChange={setBusy}
        />
      </div>
      <p className="mt-6 text-xs text-muted-foreground">
        Deleting folders or tags keeps your bookmarks.
      </p>
    </dialog>
  );
}
