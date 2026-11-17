import AxeBuilder from '@axe-core/playwright';
import {
  openLibraryTool,
  openSettingsPage,
  settleTransitions,
  test,
  expect,
} from './fixtures';

test('uses a readable gradient background, a default capture folder and a saves heatmap', async ({
  context,
  page,
}, testInfo) => {
  test.setTimeout(60_000);
  await page.goto('chrome://newtab/');
  const extensionUrl = page.url();
  await openSettingsPage(page, 'Appearance');
  const style = page.getByRole('combobox', { name: 'Background style' });
  await style.selectOption('gradient');
  await page.getByLabel('Gradient start').fill('#ffffff');
  await page.getByLabel('Gradient end').fill('#f5e663');
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const main = page.locator('main');
  await expect(main).toHaveClass(/home-photo/);
  await expect(main).toHaveAttribute('style', /linear-gradient\(135deg/);
  await settleTransitions(page);
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .include('main')
        .analyze()
    ).violations.filter((violation) => violation.id === 'color-contrast'),
  ).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('gradient-home.png') });

  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await openLibraryTool(page, 'Folders and tags');
  const manager = page.getByRole('dialog', { name: 'Folders and tags' });
  await manager
    .getByRole('textbox', { name: /folder name/i })
    .first()
    .fill('Inbox');
  await manager.getByRole('button', { name: 'Create folder' }).click();
  await expect(manager).toContainText('Inbox');
  await page.keyboard.press('Escape');
  await openSettingsPage(page, 'General');
  const captureFolder = page.getByRole('combobox', {
    name: 'Folder for new captures',
  });
  await captureFolder.selectOption({ label: 'Inbox' });
  await expect(
    page.getByRole('status').filter({ hasText: 'Capture folder saved.' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Close settings' }).click();

  await context.addInitScript(() => {
    if (location.pathname !== '/popup.html') return;
    const api = (
      globalThis as unknown as {
        chrome: { tabs: { query: () => Promise<unknown[]> } };
      }
    ).chrome;
    api.tabs.query = async () => [
      { id: 7, title: 'Inbox item', url: 'https://example.com/inbox' },
    ];
  });
  const popup = await context.newPage();
  await popup.goto(new URL('/popup.html', extensionUrl).href);
  const folder = popup.getByRole('combobox', { name: 'Folder' });
  await expect(folder).toHaveValue(/.+/);
  await expect(folder.locator('option:checked')).toHaveText('Inbox');
  await popup
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(popup.getByRole('status')).toContainText('Bookmark saved');
  await popup.close();

  await page.reload();
  await openLibraryTool(page, 'Statistics');
  const stats = page.getByRole('dialog', { name: 'Library statistics' });
  await expect(
    stats.getByRole('region', { name: 'Saved in the last 26 weeks' }),
  ).toContainText('1 bookmark saved');
  await expect(
    stats.getByRole('region', { name: 'Bookmarks per folder' }),
  ).toContainText('Inbox1');
  await stats
    .getByRole('region', { name: 'Saved in the last 26 weeks' })
    .screenshot({ path: testInfo.outputPath('heatmap.png') });
});
