import AxeBuilder from '@axe-core/playwright';
import { openSettingsPage, openLibraryTool, test, expect } from './fixtures';

test('browses a compact nested Links tree with optional sections, tags and ordering', async ({
  page,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Library', exact: true }),
  ).toBeVisible();
  await openLibraryTool(page, 'Backup and restore');
  const meta = { spaceId: 'default', createdAt: 1, updatedAt: 1 };
  const backup = {
    format: 'oasis',
    version: 1,
    spaceId: 'default',
    exportedAt: 1,
    folders: [
      { ...meta, id: 'work', name: 'Work', sortOrder: 1 },
      { ...meta, id: 'design', parentId: 'work', name: 'Design', sortOrder: 1 },
      { ...meta, id: 'empty', name: 'Empty folder', sortOrder: 2 },
    ],
    tags: [
      { ...meta, id: 'reference', name: 'Reference', color: '#286443' },
      {
        ...meta,
        id: 'reading',
        name: 'Reading with a very long tag name',
        color: '#123456',
      },
    ],
    bookmarks: [
      ['gmail', 'Gmail', '✉️', undefined, [], 4],
      ['outlook', 'Outlook', '📬', undefined, [], 3],
      ['figma', 'Figma', '🎨', 'design', ['reference'], 2],
      [
        'docs',
        'Design documentation',
        '📚',
        'design',
        ['reference', 'reading'],
        1,
      ],
      [
        'long',
        'Long title ' + 'x'.repeat(300),
        '🌿',
        undefined,
        ['reading'],
        0,
      ],
    ].map(([id, title, customIcon, folderId, tags, count], index) => ({
      ...meta,
      id,
      title,
      customIcon,
      folderId,
      tags,
      url: `https://example.com/${id}/${id === 'long' ? 'path'.repeat(100) : ''}`,
      isFavorite: id === 'figma',
      isPinned: false,
      sortOrder: index + 1,
      openCount: count,
      ...(count ? { lastOpenedAt: count } : {}),
    })),
  };
  await page.getByLabel('Choose a backup', { exact: true }).setInputFiles({
    name: 'links-sample.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(backup)),
  });
  await page
    .getByRole('button', { name: 'Restore backup', exact: true })
    .click();
  await expect(
    page
      .getByRole('dialog', { name: 'Backup and restore', exact: true })
      .getByRole('status'),
  ).toContainText('Restore complete');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await page.getByRole('link', { name: 'Oasis home' }).click();
  const trigger = page.getByRole('button', { name: 'Links', exact: true });
  await trigger.click();
  const panel = page.getByRole('dialog', { name: 'Links', exact: true });
  const search = panel.getByRole('searchbox', { name: 'Search links' });
  await expect(search).toBeFocused();
  const work = panel.locator('summary[title="Work"]');
  await expect(work).toBeVisible();
  await expect(panel.locator('summary[title="Design"]')).toHaveCount(0);
  await work.click();
  const design = panel.locator('summary[title="Design"]');
  await design.click();
  const tree = work.locator('..');
  await expect(tree.getByRole('link', { name: /Figma/ })).toContainText('🎨');
  await expect(
    tree.getByRole('link', { name: /Design documentation/ }),
  ).toContainText('Reference');
  await expect(
    tree.getByRole('link', { name: /Design documentation/ }),
  ).toContainText('+1');
  await expect(
    tree.getByRole('link', { name: /Design documentation/ }),
  ).toHaveAttribute('title', /Tags: Reference, Reading/);
  await panel.locator('summary[title="Empty folder"]').click();
  await expect(
    panel.getByText('Empty folder', { exact: true }).last(),
  ).toBeVisible();
  await panel.locator('summary[title="Empty folder"]').click();
  for (const name of ['Recently used', 'Frequently used']) {
    const summary = panel.locator(`summary[title="${name}"]`);
    await summary.click();
    await expect(
      summary.locator('..').locator('a[data-bookmark]').first(),
    ).toContainText('Gmail');
    await summary.click();
  }
  const tagFilter = panel.getByRole('combobox', { name: 'Filter by tag' });
  await tagFilter.selectOption('reference');
  await expect(panel.getByRole('link', { name: /Gmail/ })).toHaveCount(0);
  await expect(panel.locator('summary[title="Work"]')).toBeVisible();
  await expect(panel.locator('summary[title="Empty folder"]')).toHaveCount(0);
  await search.fill('documentation');
  await expect(panel.getByRole('link', { name: /Figma/ })).toHaveCount(0);
  await expect(
    panel.getByRole('link', { name: /Design documentation/ }).first(),
  ).toBeVisible();
  await search.fill('missing');
  await expect(panel.getByRole('status')).toContainText('No matching links');
  await search.fill('');
  await tagFilter.selectOption('');
  await panel
    .getByRole('button', { name: 'Reorder links', exact: true })
    .click();
  await panel
    .getByRole('button', { name: 'Move Outlook up', exact: true })
    .click();
  const rootLinks = panel.locator('a[data-bookmark]');
  await expect(rootLinks.first()).toContainText('Outlook');
  await panel
    .getByRole('img', { name: 'Drag Gmail', exact: true })
    .dragTo(panel.getByRole('link', { name: /Outlook/ }));
  await expect(rootLinks.first()).toContainText('Gmail');
  await panel
    .getByRole('button', { name: 'Done reordering', exact: true })
    .click();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.reload();
  await trigger.click();
  await expect(rootLinks.first()).toContainText('Gmail');
  await search.press('ArrowDown');
  await expect(rootLinks.first()).toBeFocused();
  await page.keyboard.press('Escape');
  await openSettingsPage(page, 'Appearance');
  await page
    .getByRole('combobox', { name: 'Theme', exact: true })
    .selectOption('dark');
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await trigger.click();
  await work.click();
  await design.click();
  await expect(
    tree.getByRole('link', { name: /Design documentation/ }),
  ).toBeVisible();
  const previews = process.env.OASIS_PREVIEW_DIR ?? '/tmp/oasis-previews';
  await page.screenshot({ path: previews + '/links-explorer-desktop.png' });
  await panel.screenshot({
    path: previews + '/links-explorer-sidebar.png',
    animations: 'disabled',
  });
  expect(
    (await new AxeBuilder({ page }).include('#home-links').analyze())
      .violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 320, height: 740 });
  await page.screenshot({ path: previews + '/links-explorer-mobile.png' });
  expect(
    await panel.evaluate(
      (node) =>
        node.scrollWidth <= node.clientWidth &&
        node.getBoundingClientRect().right <= innerWidth,
    ),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await openSettingsPage(page, 'Appearance');
  for (const name of [
    'Show favorites in Links',
    'Show recently used in Links',
    'Show frequently used in Links',
  ])
    await page.getByRole('checkbox', { name, exact: true }).uncheck();
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.reload();
  await trigger.click();
  for (const name of ['Favorites', 'Recently used', 'Frequently used'])
    await expect(panel.locator(`summary[title="${name}"]`)).toHaveCount(0);
  await expect(work).toBeVisible();
});

test('edits a custom icon and falls back to the title initial after clearing it', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Library', exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Icon example');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com/icon');
  await page
    .getByRole('textbox', { name: 'Custom icon', exact: true })
    .fill('🌿');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Oasis home' }).click();
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Links', exact: true });
  const link = panel.getByRole('link', { name: /Icon example/ });
  await expect(link).toContainText('🌿');
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page
    .getByRole('button', { name: 'Edit Icon example', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Custom icon', exact: true }),
  ).toHaveValue('🌿');
  await page
    .getByRole('textbox', { name: 'Custom icon', exact: true })
    .fill('');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Oasis home' }).click();
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  await expect(link).not.toContainText('🌿');
  await expect(link.locator('[aria-hidden="true"]').first()).toHaveText('I');
});
