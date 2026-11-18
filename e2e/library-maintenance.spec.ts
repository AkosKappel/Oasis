import {
  axe,
  openLibraryTool,
  openSettingsPage,
  test,
  expect,
  settleTransitions,
} from './fixtures';

test('saves a pasted URL, suggests its folder and reports tag, folder and unopened bookmarks', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Library', exact: true }),
  ).toBeVisible();
  await openLibraryTool(page, 'Backup and restore');
  const meta = { spaceId: 'default', createdAt: 1, updatedAt: 1 };
  await page.getByLabel('Choose a backup', { exact: true }).setInputFiles({
    name: 'maintenance.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'oasis',
        version: 1,
        spaceId: 'default',
        exportedAt: 1,
        folders: [
          { ...meta, id: 'docs', name: 'Docs', sortOrder: 1 },
          { ...meta, id: 'misc', name: 'Misc', sortOrder: 2 },
        ],
        tags: [{ ...meta, id: 'ref', name: 'Reference', color: '#286443' }],
        bookmarks: [
          ['a', 'Guide A', 'https://docs.example/a', 'docs', ['ref']],
          ['b', 'Guide B', 'https://docs.example/b', 'docs', ['ref']],
          ['c', 'Other', 'https://other.example/c', 'misc', []],
        ].map(([id, title, url, folderId, tags], index) => ({
          ...meta,
          id,
          title,
          url,
          folderId,
          tags,
          isFavorite: false,
          isPinned: false,
          openCount: 0,
          sortOrder: index,
        })),
      }),
    ),
  });
  await page
    .getByRole('button', { name: 'Restore backup', exact: true })
    .click();
  await expect(
    page
      .getByRole('dialog', { name: 'Backup and restore' })
      .getByRole('status'),
  ).toContainText('Restore complete');
  await page.getByRole('button', { name: 'Close', exact: true }).click();

  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog', { name: 'Search Oasis' });
  await palette
    .getByRole('combobox', { name: 'Search bookmarks and actions' })
    .fill('https://docs.example/new-page');
  await palette
    .getByRole('option', {
      name: 'Save “https://docs.example/new-page” as a bookmark',
    })
    .click();
  const editor = page.getByRole('dialog', { name: 'Save a bookmark' });
  await expect(editor.getByRole('textbox', { name: 'URL' })).toHaveValue(
    'https://docs.example/new-page',
  );
  await expect(editor.getByRole('textbox', { name: 'Title' })).toHaveValue(
    'docs.example',
  );
  await editor.getByRole('textbox', { name: 'Title' }).fill('New guide');
  await editor.getByRole('button', { name: 'Suggest a folder' }).click();
  await expect(
    editor.getByRole('list', { name: 'Suggested folders' }),
  ).toContainText('2 of 2 from this website');
  await editor.getByRole('button', { name: 'Use Docs' }).click();
  await expect(editor.getByRole('combobox', { name: 'Folder' })).toHaveValue(
    'docs',
  );
  await settleTransitions(page);
  expect((await axe(page).include('dialog').analyze()).violations).toEqual([]);
  await editor
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(editor).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL(/#library$/);
  await expect(
    page.getByRole('dialog', { name: 'Save a bookmark' }),
  ).toHaveCount(0);
  await expect(page.locator('[data-bookmark-id]')).toHaveCount(4);

  await openLibraryTool(page, 'Statistics');
  const stats = page.getByRole('dialog', { name: 'Library statistics' });
  await expect(stats.getByRole('region', { name: 'Tag usage' })).toContainText(
    'Reference2',
  );
  await expect(
    stats.getByRole('region', { name: 'Bookmarks per folder' }),
  ).toContainText('Docs3');
  await expect(stats).toContainText('Open counting is off');
  await page.screenshot({ path: testInfo.outputPath('statistics.png') });
  await stats.getByRole('button', { name: 'Done' }).click();

  const collections = page.getByRole('combobox', { name: 'Collections' });
  await expect(collections.locator('option[value="not-opened"]')).toHaveCount(
    0,
  );
  await openSettingsPage(page, 'Privacy');
  await page
    .getByRole('checkbox', {
      name: 'Count bookmark opens in Oasis',
      exact: true,
    })
    .check();
  await page.getByRole('button', { name: 'Close settings' }).click();
  await collections.selectOption('not-opened');
  await expect(page.locator('[data-bookmark-id]')).toHaveCount(3);
  await expect(page.locator('[data-bookmark-id="a"]')).toBeVisible();
});
