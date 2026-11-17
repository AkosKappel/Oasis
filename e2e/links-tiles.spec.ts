import AxeBuilder from '@axe-core/playwright';
import { openLibraryTool, test, expect, settleTransitions } from './fixtures';

test('switches Links to tiles, browses folders, reorders and keeps the choice', async ({
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
  await page.getByLabel('Choose a backup', { exact: true }).setInputFiles({
    name: 'tiles.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'oasis',
        version: 1,
        spaceId: 'default',
        exportedAt: 1,
        folders: [
          { ...meta, id: 'work', name: 'Work', sortOrder: 1 },
          {
            ...meta,
            id: 'design',
            parentId: 'work',
            name: 'Design',
            sortOrder: 1,
          },
        ],
        tags: [],
        bookmarks: [
          ['gmail', 'Gmail', '✉️', undefined],
          ['calendar', 'Calendar', '📅', undefined],
          ['tracker', 'Tracker', '✅', 'work'],
          ['figma', 'Figma', '🎨', 'design'],
        ].map(([id, title, customIcon, folderId], index) => ({
          ...meta,
          id,
          title,
          customIcon,
          folderId,
          tags: [],
          url: `https://example.com/${id}`,
          isFavorite: id === 'figma',
          isPinned: false,
          sortOrder: index + 1,
          openCount: 0,
        })),
      }),
    ),
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
  await page.getByRole('link', { name: 'Oasis home', exact: true }).click();

  await page.getByRole('button', { name: 'Links', exact: true }).click();
  const panel = page.getByRole('dialog', { name: 'Links', exact: true });
  const toggle = panel.getByRole('button', { name: 'Show links as tiles' });
  await expect(toggle).toHaveAttribute('aria-pressed', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  const root = panel.getByRole('list', { name: 'Links tiles' });
  await expect(
    root.getByRole('button', { name: 'Open Favorites, 1 link' }),
  ).toBeVisible();
  await expect(
    root.getByRole('button', { name: 'Open Work, 2 links' }),
  ).toBeVisible();
  const linkNames = () =>
    root.locator('a[data-bookmark] .line-clamp-2').allTextContents();
  expect(await linkNames()).toEqual(['Gmail', 'Calendar']);
  await page.screenshot({
    path: test.info().outputPath('links-tiles-desktop.png'),
  });

  await panel.getByRole('button', { name: 'Reorder links' }).click();
  await root.getByRole('button', { name: 'Move Gmail later' }).click();
  await expect.poll(linkNames).toEqual(['Calendar', 'Gmail']);
  await panel.getByRole('button', { name: 'Done reordering' }).click();

  await root.getByRole('button', { name: 'Open Work, 2 links' }).click();
  await panel
    .getByRole('list', { name: 'Work tiles' })
    .getByRole('button', { name: 'Open Design, 1 link' })
    .click();
  const design = panel.getByRole('list', { name: 'Design tiles' });
  await expect(design.getByRole('link', { name: /Figma/ })).toBeVisible();
  const path = panel.getByRole('navigation', { name: 'Folder path' });
  await expect(path.locator('[aria-current="location"]')).toHaveText('Design');
  await path.getByRole('button', { name: 'Back' }).click();
  await expect(path.locator('[aria-current="location"]')).toHaveText('Work');
  await path.getByRole('button', { name: 'Links', exact: true }).click();
  await expect(root).toBeVisible();

  await panel.getByRole('searchbox', { name: 'Search links' }).fill('figma');
  const matches = panel.getByRole('list', { name: 'Matching links' });
  await expect(matches.locator('a[data-bookmark]')).toHaveCount(1);
  await expect(matches.getByRole('button')).toHaveCount(0);
  await panel.getByRole('searchbox', { name: 'Search links' }).fill('');

  await settleTransitions(page);
  expect(
    (await new AxeBuilder({ page }).include('#home-links').analyze())
      .violations,
  ).toEqual([]);
  await page.reload();
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  await expect(
    panel.getByRole('button', { name: 'Show links as tiles' }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(await linkNames()).toEqual(['Calendar', 'Gmail']);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await panel.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.screenshot({
    path: test.info().outputPath('links-tiles-mobile.png'),
  });
  await panel.getByRole('button', { name: 'Show links as tiles' }).click();
  await expect(
    panel.getByRole('list', { name: 'Saved links' }).first(),
  ).toBeVisible();
});
