import AxeBuilder from '@axe-core/playwright';
import { openLibraryTool, openSettingsPage, test, expect } from './fixtures';

test('places links and folders on an opt-in Home desktop and keeps their positions', async ({
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Library', exact: true }),
  ).toBeVisible();
  await openLibraryTool(page, 'Backup and restore');
  const meta = { spaceId: 'default', createdAt: 1, updatedAt: 1 };
  await page.getByLabel('Choose a backup', { exact: true }).setInputFiles({
    name: 'desktop.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'oasis',
        version: 1,
        spaceId: 'default',
        exportedAt: 1,
        folders: [{ ...meta, id: 'work', name: 'Work', sortOrder: 1 }],
        tags: [],
        bookmarks: [
          ['gmail', 'Gmail', '✉️', undefined],
          ['calendar', 'Calendar', '📅', undefined],
          ['tracker', 'Tracker', '✅', 'work'],
        ].map(([id, title, customIcon, folderId], index) => ({
          ...meta,
          id,
          title,
          customIcon,
          folderId,
          tags: [],
          url: `https://example.com/${id}`,
          isFavorite: false,
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

  const section = page.getByRole('region', { name: 'Links desktop' });
  await expect(section).toHaveCount(0);
  await openSettingsPage(page, 'Home layout');
  const layout = page.getByRole('dialog', { name: 'Home layout' });
  await layout
    .getByRole('checkbox', { name: 'Show Links desktop', exact: true })
    .check();
  await layout
    .getByRole('button', { name: 'Save layout', exact: true })
    .click();
  await expect(layout).toHaveCount(0);
  await expect(section).toContainText('Place links and folders');

  await section.getByRole('button', { name: 'Arrange desktop' }).click();
  const find = section.getByRole('searchbox', {
    name: 'Find a link or folder to add',
  });
  await find.fill('gmail');
  await section.getByRole('button', { name: 'Add Gmail to desktop' }).click();
  await find.fill('work');
  await section.getByRole('button', { name: 'Add Work to desktop' }).click();
  await expect(page.locator('[data-cell="0:0"]')).toContainText('Gmail');
  await expect(page.locator('[data-cell="1:0"]')).toContainText('Work');
  await section.getByRole('button', { name: 'Move Gmail down' }).click();
  await expect(page.locator('[data-cell="0:1"]')).toContainText('Gmail');
  await page
    .locator('[data-cell="1:0"]')
    .getByRole('button', { name: /Open Work/ })
    .dragTo(page.locator('[data-cell="5:2"]'));
  await expect(page.locator('[data-cell="5:2"]')).toContainText('Work');
  await page.screenshot({
    path: testInfo.outputPath('desktop-arranging.png'),
  });
  expect(
    (
      await new AxeBuilder({ page })
        .include('[data-home-section="desktop"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await section.getByRole('button', { name: 'Done arranging' }).click();

  await page.reload();
  await expect(page.locator('[data-cell="0:1"]')).toContainText('Gmail');
  await expect(page.locator('[data-cell="5:2"]')).toContainText('Work');
  await page.screenshot({ path: testInfo.outputPath('desktop.png') });
  await section.getByRole('button', { name: 'Open Work, 1 link' }).click();
  const folder = page.getByRole('dialog', { name: 'Work' });
  await expect(folder.getByRole('link', { name: /Tracker/ })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(folder).toHaveCount(0);
  await expect(
    section.getByRole('button', { name: 'Open Work, 1 link' }),
  ).toBeFocused();

  await page.setViewportSize({ width: 320, height: 740 });
  await expect(section).toContainText('wider window to arrange');
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('desktop-mobile.png') });
  await page.setViewportSize({ width: 1280, height: 900 });
  await section.getByRole('button', { name: 'Arrange desktop' }).click();
  await section
    .getByRole('button', { name: 'Remove Gmail from desktop' })
    .click();
  await expect(section.getByRole('link', { name: /Gmail/ })).toHaveCount(0);
});
