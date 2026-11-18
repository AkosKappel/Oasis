import {
  axe,
  test,
  expect,
  openLibraryTool,
  openLibraryFilters,
} from './fixtures';

test('builds reviewed smart-collection queries without replacing advanced drafts automatically', async ({
  page,
}, testInfo) => {
  test.setTimeout(60000);
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await openLibraryTool(page, 'Backup and restore');
  const meta = { spaceId: 'default', createdAt: 1, updatedAt: 1, sortOrder: 1 };
  const backup = {
    format: 'oasis',
    version: 1,
    spaceId: 'default',
    exportedAt: 1,
    folders: [
      { ...meta, id: 'p', name: 'Learning' },
      { ...meta, id: 'c', name: 'Web guides', parentId: 'p' },
      { ...meta, id: 'n', name: 'Examples', parentId: 'c' },
    ],
    tags: [{ ...meta, id: 't', name: 'Read later', color: '#336699' }],
    bookmarks: [
      ['matching', 'Reference guide', 'https://docs.example.com/guide', true],
      ['ordinary', 'Another guide', 'https://example.com/other', false],
      ['other', 'Different guide', 'https://other.test/guide', true],
    ].map(([id, title, url, isFavorite]) => ({
      ...meta,
      id,
      title,
      url,
      isFavorite,
      folderId: 'n',
      tags: ['t'],
      description: 'Useful references',
      isPinned: false,
      openCount: 0,
    })),
  };
  const restore = page.getByRole('dialog', {
    name: 'Backup and restore',
    exact: true,
  });
  await restore.getByLabel('Choose a backup', { exact: true }).setInputFiles({
    name: 'collection-samples.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await restore
    .getByRole('button', { name: 'Restore backup', exact: true })
    .click();
  await expect(restore.getByRole('status')).toContainText('Restore complete');
  await restore.getByRole('button', { name: 'Close', exact: true }).click();
  await page
    .getByRole('button', { name: 'Saved searches', exact: true })
    .click();
  const manager = page.getByRole('dialog', {
    name: 'Saved searches',
    exact: true,
  });
  await manager
    .getByRole('textbox', { name: 'Search name', exact: true })
    .fill('Reading references');
  await manager.getByText('Build with filters', { exact: true }).click();
  await manager
    .getByRole('textbox', { name: 'Contains text', exact: true })
    .fill('guide');
  await manager
    .getByRole('textbox', { name: 'Website domain', exact: true })
    .fill('https://example.com/private');
  await manager
    .getByRole('button', { name: 'Apply filters to query', exact: true })
    .click();
  await expect(manager.getByRole('alert')).toContainText('without a path');
  await expect(
    manager.getByRole('textbox', { name: 'Search query', exact: true }),
  ).toHaveValue('');
  await manager
    .getByRole('textbox', { name: 'Website domain', exact: true })
    .fill('example.com');
  await manager
    .getByRole('combobox', { name: 'In folder', exact: true })
    .selectOption('c');
  await manager
    .getByRole('combobox', { name: 'With tag', exact: true })
    .selectOption('t');
  await manager
    .getByRole('checkbox', { name: 'Favorites only', exact: true })
    .check();
  await manager
    .getByRole('button', { name: 'Apply filters to query', exact: true })
    .click();
  const query =
    '"guide" domain:example.com folder:"Learning / Web guides" tag:"Read later" is:favorite';
  await expect(
    manager.getByRole('textbox', { name: 'Search query', exact: true }),
  ).toHaveValue(query);
  await expect(
    manager
      .getByRole('list', { name: 'Saved searches', exact: true })
      .getByRole('listitem'),
  ).toHaveCount(0);
  expect(
    (
      await axe(page)
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await manager.evaluate((node) => {
    node.scrollTop = 0;
  });
  await page.screenshot({
    path: testInfo.outputPath('query-builder-desktop.png'),
  });
  await manager
    .getByRole('button', { name: 'Save search', exact: true })
    .click();
  await expect(manager.getByRole('status')).toHaveText('Search saved.');
  await manager
    .getByRole('button', { name: 'Load Reading references', exact: true })
    .click();
  await expect(
    page.getByRole('link', { name: /Reference guide/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Another guide|Different guide/ }),
  ).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.locator('aside[aria-label="Library navigation"] > details'),
  ).not.toHaveAttribute('open', '');
  await openLibraryFilters(page);
  await page
    .getByRole('button', { name: 'Saved searches', exact: true })
    .click();
  await manager
    .getByRole('button', {
      name: 'Edit saved search Reading references',
      exact: true,
    })
    .click();
  await expect(
    manager.getByRole('textbox', { name: 'Search query', exact: true }),
  ).toHaveValue(query);
  await manager.getByText('Build with filters', { exact: true }).click();
  await expect(
    manager.getByRole('textbox', { name: 'Search query', exact: true }),
  ).toHaveValue(query);
  await manager
    .getByRole('textbox', { name: 'Contains text', exact: true })
    .fill('guide');
  await manager
    .getByRole('textbox', { name: 'Website domain', exact: true })
    .fill('other.test');
  await expect(
    manager.getByRole('textbox', { name: 'Search query', exact: true }),
  ).toHaveValue(query);
  await manager
    .getByRole('textbox', { name: 'Website domain', exact: true })
    .fill('example.com');
  await manager
    .getByRole('combobox', { name: 'In folder', exact: true })
    .selectOption('c');
  await manager
    .getByRole('combobox', { name: 'With tag', exact: true })
    .selectOption('t');
  await manager
    .getByRole('checkbox', { name: 'Favorites only', exact: true })
    .check();
  await manager.evaluate((node) => {
    node.scrollTop = 0;
  });
  await page.screenshot({
    path: testInfo.outputPath('query-builder-mobile.png'),
  });
  expect(
    await manager.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await manager
    .getByRole('textbox', { name: 'Search query', exact: true })
    .fill('domain:other.test');
  await manager
    .getByRole('button', { name: 'Save changes', exact: true })
    .click();
  await expect(manager.getByRole('status')).toHaveText('Search saved.');
  await manager
    .getByRole('button', { name: 'Load Reading references', exact: true })
    .click();
  await expect(
    page.getByRole('link', { name: /Different guide/ }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: /Reference guide/ })).toHaveCount(
    0,
  );
});
