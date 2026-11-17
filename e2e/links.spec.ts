import AxeBuilder from '@axe-core/playwright';
import { openSettingsPage } from './fixtures';
import { openLibraryTool } from './fixtures';
import { test, expect } from './fixtures';

test('shows links on demand with folder search, keyboard access and focus return', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await openLibraryTool(page, 'Backup and restore');
  const meta = { spaceId: 'default', createdAt: 1, updatedAt: 1 };
  const backup = {
    format: 'oasis',
    version: 1,
    spaceId: 'default',
    exportedAt: 1,
    folders: [
      { ...meta, id: 'f', name: 'Reading', sortOrder: 1 },
      { ...meta, id: 'child', parentId: 'f', name: 'Design', sortOrder: 1 },
    ],
    tags: [
      {
        ...meta,
        id: 'tag',
        name: 'Design resources with a very long label',
        color: '#123456',
      },
    ],
    bookmarks: [
      {
        ...meta,
        id: 'b',
        title: 'Design reference',
        url: 'https://example.com/',
        folderId: 'child',
        tags: ['tag'],
        customIcon: '🎨',
        isFavorite: true,
        isPinned: false,
        sortOrder: 1,
        openCount: 0,
      },
      ...['First link', 'Second link', 'Long title ' + 'x'.repeat(300)].map(
        (title, index) => ({
          ...meta,
          id: `extra${index}`,
          title,
          url: `https://example.com/${'path'.repeat(index === 2 ? 100 : 1)}?id=${index}`,
          tags: [],
          isFavorite: false,
          isPinned: false,
          sortOrder: index + 2,
          openCount: index + 1,
          lastOpenedAt: index + 1,
        }),
      ),
    ],
  };
  await page.getByLabel('Choose a backup', { exact: true }).setInputFiles({
    name: 'sample.json',
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
  await expect(
    page.getByRole('navigation', { name: 'Favorite bookmarks' }),
  ).toHaveCount(0);
  const trigger = page.getByRole('button', { name: 'Links', exact: true });
  await trigger.focus();
  await trigger.press('Enter');
  const menu = page.getByRole('dialog', { name: 'Links', exact: true });
  await expect(
    menu.getByRole('searchbox', { name: 'Search links' }),
  ).toBeFocused();
  const folder = menu
    .locator('details')
    .filter({ has: page.locator('summary', { hasText: 'Reading / Design' }) });
  await expect(folder).not.toHaveAttribute('open');
  await folder.locator('summary').click();
  const design = menu.getByRole('link', { name: /Design reference/ });
  await expect(design).toBeVisible();
  await expect(design).toContainText('🎨');
  await expect(design).toContainText('Design resources');
  await expect(design).toHaveAttribute('title', /https:\/\/example.com\//);
  await menu
    .getByRole('button', { name: 'Reorder links', exact: true })
    .click();
  await menu
    .getByRole('button', { name: 'Move Second link up', exact: true })
    .click();
  await expect(menu.locator('a[data-bookmark]').first()).toContainText(
    'Second link',
  );
  await menu
    .getByRole('img', { name: 'Drag First link', exact: true })
    .dragTo(menu.getByRole('link', { name: /^Second link/ }));
  await expect(menu.locator('a[data-bookmark]').first()).toContainText(
    'First link',
  );
  await menu
    .getByRole('button', { name: 'Move Second link up', exact: true })
    .click();
  await expect(menu.locator('a[data-bookmark]').first()).toContainText(
    'Second link',
  );

  await menu
    .getByRole('button', { name: 'Done reordering', exact: true })
    .click();
  await menu.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(menu.locator('a[data-bookmark]')).toHaveCount(1);
  await menu
    .getByRole('button', { name: 'Recently visited', exact: true })
    .click();
  await expect(menu.locator('a[data-bookmark]').first()).toContainText(
    'Long title',
  );
  await expect(
    menu.getByRole('button', { name: 'Reorder links', exact: true }),
  ).toHaveCount(0);
  await menu.getByRole('button', { name: 'Often used', exact: true }).click();
  await expect(menu.locator('a[data-bookmark]').first()).toContainText(
    'Long title',
  );
  await menu
    .getByRole('button', { name: 'All bookmarks', exact: true })
    .click();
  await folder.locator('summary').click();
  await page.screenshot({
    path:
      (process.env.OASIS_PREVIEW_DIR ?? '/tmp/oasis-previews') +
      '/links-desktop.png',
  });
  expect(
    (await new AxeBuilder({ page }).include('#home-links').analyze())
      .violations,
  ).toEqual([]);
  await menu.getByRole('searchbox').fill('desgin');
  await expect(
    menu.getByRole('link', { name: /Design reference/ }),
  ).toBeVisible();
  await menu.getByRole('searchbox').press('ArrowDown');
  await expect(
    menu.getByRole('link', { name: /Design reference/ }),
  ).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await expect(menu).not.toBeVisible();
  await trigger.click();
  await page.locator('main time').click();
  await expect(menu).not.toBeVisible();
  await page.reload();
  await trigger.click();
  await expect(menu.locator('a[data-bookmark]').first()).toContainText(
    'Second link',
  );
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 320, height: 740 });
  await trigger.click();
  await menu.locator('summary').click();
  await page.screenshot({
    path:
      (process.env.OASIS_PREVIEW_DIR ?? '/tmp/oasis-previews') +
      '/links-mobile.png',
  });
  expect(
    await menu.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  expect(
    await menu.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth;
    }),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await openSettingsPage(page, 'Appearance');
  await page
    .getByRole('checkbox', { name: 'Show shortcut row', exact: true })
    .check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(
    page.getByRole('navigation', { name: 'Favorite bookmarks' }),
  ).toBeVisible();
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
