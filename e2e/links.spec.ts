import { test, expect } from './fixtures';

test('shows links on demand with folder search, keyboard access and focus return', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page
    .getByRole('button', { name: 'Backup and restore', exact: true })
    .click();
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
    tags: [],
    bookmarks: [
      {
        ...meta,
        id: 'b',
        title: 'Design reference',
        url: 'https://example.com/',
        folderId: 'child',
        tags: [],
        isFavorite: true,
        isPinned: false,
        sortOrder: 1,
        openCount: 0,
      },
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
  await expect(page.getByRole('status')).toContainText('Restore complete');
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
  await expect(
    menu.getByRole('link', { name: /Design reference/ }),
  ).toBeVisible();
  await menu
    .getByRole('combobox', { name: 'Show links' })
    .selectOption({ label: 'Reading' });
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
  await page.setViewportSize({ width: 390, height: 844 });
  await trigger.click();
  expect(
    await menu.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return box.left >= 0 && box.right <= innerWidth;
    }),
  ).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page
    .getByRole('checkbox', { name: 'Show shortcut row', exact: true })
    .check();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(
    page.getByRole('navigation', { name: 'Favorite bookmarks' }),
  ).toBeVisible();
});
