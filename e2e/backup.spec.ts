import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures';

test('validates, restores and downloads a portable library backup', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Backup and restore' }).click();
  const file = page.getByLabel('Choose a backup');
  await file.setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"version":99}'),
  });
  await expect(page.getByRole('alert')).toContainText('version 1');
  await expect(
    page.getByRole('button', { name: 'Restore backup' }),
  ).toBeDisabled();
  const backup = {
    format: 'oasis',
    version: 1,
    spaceId: 'default',
    exportedAt: 1,
    folders: [
      {
        id: 'f',
        spaceId: 'default',
        name: 'Reading',
        sortOrder: 1,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    tags: [
      {
        id: 't',
        spaceId: 'default',
        name: 'Learn',
        color: '#336699',
        createdAt: 1,
        updatedAt: 1,
      },
    ],
    bookmarks: [
      {
        id: 'b',
        spaceId: 'default',
        title: 'Imported example',
        url: 'https://example.com/',
        folderId: 'f',
        tags: ['t'],
        isFavorite: true,
        isPinned: false,
        sortOrder: 1,
        openCount: 0,
        createdAt: 1,
        updatedAt: 1,
      },
    ],
  };
  await file.setInputFiles({
    name: 'backup.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await expect(
    page.getByText('Ready: 1 bookmarks, 1 folders, 1 tags.'),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Restore backup' }).click();
  await expect(page.getByRole('status')).toHaveText(
    'Restore complete. Added 3 items; kept 0 existing items.',
  );
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download backup' }).click();
  const download = await downloadPromise;
  const downloaded = JSON.parse(
    await readFile((await download.path())!, 'utf8'),
  );
  expect(downloaded.bookmarks[0]).toMatchObject(backup.bookmarks[0]!);
  expect(downloaded.folders).toEqual(backup.folders);
  expect(downloaded.tags).toEqual(backup.tags);
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page.getByRole('link', { name: /Imported example/ }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('link', { name: /Imported example/ }),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Oasis home' }).click();
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  await expect(
    page
      .getByRole('dialog', { name: 'Links', exact: true })
      .getByRole('link', { name: /Imported example/ }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  await page
    .getByRole('combobox', { name: 'Search bookmarks and actions' })
    .fill('Learn');
  await expect(
    page.getByRole('option', { name: /Imported example/ }),
  ).toBeVisible();
});
