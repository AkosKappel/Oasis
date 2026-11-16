import { useState } from 'react';
import { Button } from '@/components/ui/button';
import type { Folder, Tag } from '@/types/entities';
import { folderOptions } from '@/features/organization/folder-tree';
import { buildSearchQuery, emptyQueryFilters } from './build-search-query';
export function QueryBuilder({
  folders,
  tags,
  onApply,
}: {
  folders: Folder[];
  tags: Tag[];
  onApply: (query: string) => void;
}) {
  const [filters, setFilters] = useState(emptyQueryFilters),
    [error, setError] = useState<string>();
  return (
    <details className="rounded-lg border border-border p-3">
      <summary className="cursor-pointer text-sm font-medium">
        Build with filters
      </summary>
      <p className="my-3 text-xs text-muted-foreground">
        All selected filters must match. Text matches a phrase, folders include
        subfolders, and domains include subdomains. Apply filters replaces the
        query draft below.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="field min-w-0">
          Contains text
          <input
            maxLength={300}
            value={filters.text}
            onChange={(event) =>
              setFilters({ ...filters, text: event.target.value })
            }
          />
        </label>
        <label className="field min-w-0">
          Website domain
          <input
            maxLength={253}
            placeholder="example.com"
            value={filters.domain}
            onChange={(event) =>
              setFilters({ ...filters, domain: event.target.value })
            }
          />
        </label>
        <label className="field min-w-0">
          In folder
          <select
            className="min-w-0 max-w-full"
            value={filters.folderId}
            onChange={(event) =>
              setFilters({ ...filters, folderId: event.target.value })
            }
          >
            <option value="">Any folder</option>
            {folderOptions(folders).map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.path}
              </option>
            ))}
          </select>
        </label>
        <label className="field min-w-0">
          With tag
          <select
            className="min-w-0 max-w-full"
            value={filters.tagId}
            onChange={(event) =>
              setFilters({ ...filters, tagId: event.target.value })
            }
          >
            <option value="">Any tag</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="my-3 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={filters.favoritesOnly}
          onChange={(event) =>
            setFilters({ ...filters, favoritesOnly: event.target.checked })
          }
        />
        Favorites only
      </label>
      <Button
        type="button"
        variant="outline"
        onClick={() => {
          try {
            onApply(buildSearchQuery(filters, folders, tags));
            setError(undefined);
          } catch (cause) {
            setError(
              cause instanceof Error
                ? cause.message
                : 'These filters could not be applied.',
            );
          }
        }}
      >
        Apply filters to query
      </Button>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error}
        </p>
      )}
    </details>
  );
}
