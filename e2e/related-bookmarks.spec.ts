import AxeBuilder from '@axe-core/playwright';
import { openLibraryTool, test, expect } from './fixtures';

test('lists related bookmarks by shared words, tags and sites, then returns to all', async ({
  page,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Library', exact: true }),
  ).toBeVisible();
  await openLibraryTool(page, 'Backup and restore');
  const meta = { spaceId: 'default', createdAt: 1, updatedAt: 1 };
  await page.getByLabel('Choose a backup', { exact: true }).setInputFiles({
    name: 'related.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'oasis',
        version: 1,
        spaceId: 'default',
        exportedAt: 1,
        folders: [],
        tags: [{ ...meta, id: 'baking', name: 'Baking', color: '#286443' }],
        bookmarks: [
          [
            'a',
            'Sourdough bread starter',
            'https://bake.example/a',
            ['baking'],
          ],
          ['b', 'Rye bread loaf', 'https://other.example/b', ['baking']],
          ['c', 'Sourdough troubleshooting', 'https://bake.example/c', []],
          ['d', 'Tax return deadline', 'https://gov.example/d', []],
          ['e', 'Train timetable', 'https://rail.example/e', []],
        ].map(([id, title, url, tags], index) => ({
          ...meta,
          id,
          title,
          url,
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
  const cards = page
    .getByRole('list', { name: 'Bookmarks', exact: true })
    .locator(':scope > li');
  await expect(cards).toHaveCount(5);
  await page
    .getByRole('button', { name: 'Related to Sourdough bread starter' })
    .click();
  await expect(
    page.getByRole('status').filter({ hasText: 'related to' }),
  ).toContainText('Sourdough bread starter');
  await expect(cards).toHaveCount(2);
  await expect(
    cards.filter({ hasText: 'Sourdough troubleshooting' }),
  ).toHaveCount(1);
  await expect(cards.filter({ hasText: 'Rye bread loaf' })).toHaveCount(1);
  expect(
    (await new AxeBuilder({ page }).include('main').analyze()).violations,
  ).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('related.png') });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole('button', { name: 'Show all bookmarks' }).click();
  await expect(cards).toHaveCount(5);
  await page
    .getByRole('button', { name: 'Related to Train timetable' })
    .click();
  await expect(
    page.getByText('No related bookmarks found for “Train timetable”.'),
  ).toBeVisible();
});
