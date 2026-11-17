import { openSettingsPage } from './fixtures';
import { openLibraryTool } from './fixtures';
import { resolve } from 'node:path';
import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures';

test('verifies packaged assets and captures store previews with sample data', async ({
  page,
  context,
}, testInfo) => {
  const manifest = JSON.parse(
    await readFile(
      resolve(
        process.env.OASIS_EXTENSION_PATH ?? '.output/chrome-mv3',
        'manifest.json',
      ),
      'utf8',
    ),
  );
  expect(manifest.manifest_version).toBe(3);
  expect(manifest.permissions.sort()).toEqual(['activeTab', 'contextMenus']);
  expect(manifest.optional_permissions).toEqual(['scripting', 'tabs']);
  expect(manifest.host_permissions ?? []).toEqual([]);
  expect(manifest.optional_host_permissions.sort()).toEqual([
    'https://api.open-meteo.com/*',
    'https://geocoding-api.open-meteo.com/*',
  ]);
  expect(manifest.chrome_url_overrides.newtab).toBe('newtab.html');
  expect(manifest.action.default_popup).toBe('popup.html');
  await context.setOffline(true);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.clock.setFixedTime(new Date('2026-11-15T09:41:00Z'));
  await page.goto('chrome://newtab/');
  for (const size of [16, 32, 48, 128]) {
    expect(manifest.icons[size]).toBe(`icon/${size}.png`);
    const dimensions = await page.evaluate(async (path: string) => {
      const response = await fetch(path);
      const bitmap = await createImageBitmap(await response.blob());
      const dimensions = [bitmap.width, bitmap.height];
      bitmap.close();
      return dimensions;
    }, `/${manifest.icons[size]}`);
    expect(dimensions).toEqual([size, size]);
  }
  const notices = await page.evaluate(async () =>
    (await fetch('/THIRD_PARTY_NOTICES.txt')).text(),
  );
  expect(notices).toContain('Oasis third-party notices');
  expect(notices).toContain('dexie');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await openLibraryTool(page, 'Backup and restore');
  const metadata = {
    spaceId: 'default',
    createdAt: Date.parse('2026-11-12T10:00:00Z'),
    updatedAt: Date.parse('2026-11-12T10:00:00Z'),
  };
  const samples = [
    [
      'MDN Web Docs',
      'https://developer.mozilla.org/',
      'Reference for everyday web development.',
    ],
    [
      'TypeScript Handbook',
      'https://www.typescriptlang.org/docs/',
      'Keep the useful language patterns close.',
    ],
    [
      'React',
      'https://react.dev/',
      'Guides for building thoughtful interfaces.',
    ],
    ['WXT', 'https://wxt.dev/', 'Browser extension development notes.'],
    [
      'Open Library',
      'https://openlibrary.org/',
      'Find something good to read next.',
    ],
    [
      'Open-Meteo',
      'https://open-meteo.com/',
      'Weather data with a clear source.',
    ],
  ];
  const backup = {
    format: 'oasis',
    version: 1,
    spaceId: 'default',
    exportedAt: metadata.createdAt,
    folders: [
      {
        ...metadata,
        id: 'sample-development',
        name: 'Development',
        sortOrder: 1,
      },
      { ...metadata, id: 'sample-reading', name: 'Reading', sortOrder: 2 },
    ],
    tags: [
      {
        ...metadata,
        id: 'sample-reference',
        name: 'Reference',
        color: '#326649',
      },
    ],
    bookmarks: samples.map(([title, url, description], index) => ({
      ...metadata,
      id: `sample-${index}`,
      title,
      url,
      description,
      folderId: index < 4 ? 'sample-development' : 'sample-reading',
      tags: ['sample-reference'],
      notes:
        index === 0
          ? 'Start with the platform documentation. Save the useful examples here.'
          : '',
      isFavorite: index < 4,
      isPinned: false,
      sortOrder: index,
      openCount: 0,
    })),
  };
  await page.getByLabel('Choose a backup', { exact: true }).setInputFiles({
    name: 'sample-library.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page
    .getByRole('button', { name: 'Restore backup', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('status')).toContainText(
    'Restore complete',
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page
      .getByRole('list', { name: 'Bookmarks', exact: true })
      .locator(':scope > li'),
  ).toHaveCount(6);
  await page
    .getByRole('list', { name: 'Bookmarks', exact: true })
    .scrollIntoViewIfNeeded();
  await page.screenshot({ path: testInfo.outputPath('store-library.png') });
  await page
    .getByRole('button', { name: 'Notes for MDN Web Docs', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Notes', exact: true }),
  ).toHaveValue(/Start with/);
  await page.screenshot({ path: testInfo.outputPath('store-notes.png') });
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Oasis home', exact: true }).click();
  await openSettingsPage(page, 'Image albums');
  await page
    .getByRole('button', { name: 'Quiet geometry', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Use image', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('main')).toHaveClass(/home-photo/);
  await page.screenshot({ path: testInfo.outputPath('store-home.png') });
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  await expect(
    page.getByRole('list', { name: 'Saved links', exact: true }),
  ).toBeVisible();
  await page.screenshot({ path: testInfo.outputPath('store-links.png') });
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('preview-home-mobile.png'),
  });
});
