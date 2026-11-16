import { openLibraryTool } from './fixtures';
import { test, expect } from './fixtures';

test('captures a page into the shared library with folders and tags', async ({
  context,
  page,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await openLibraryTool(page, 'Folders and tags');
  const manager = page.getByRole('dialog', { name: 'Folders and tags' });
  await manager
    .getByRole('textbox', { name: 'New folder name', exact: true })
    .fill('Reading');
  await manager
    .getByRole('button', { name: 'Create folder', exact: true })
    .click();
  await expect(
    manager.getByRole('button', { name: 'Edit folder Reading' }),
  ).toBeVisible();
  await manager
    .getByRole('textbox', { name: 'New tag name', exact: true })
    .fill('Reference');
  await manager
    .getByRole('button', { name: 'Create tag', exact: true })
    .click();
  await expect(
    manager.getByRole('button', { name: 'Edit tag Reference' }),
  ).toBeVisible();
  await manager.getByRole('button', { name: 'Done', exact: true }).click();
  // Headless Chromium cannot click the toolbar. Supply its tab response at the API boundary.
  await context.addInitScript(() => {
    if (location.pathname !== '/popup.html') return;
    const extension = (
      globalThis as unknown as {
        chrome: { tabs: { query: () => Promise<unknown[]> } };
      }
    ).chrome;
    extension.tabs.query = async () => [
      { title: 'Captured example', url: 'https://example.com/' },
    ];
  });
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 400, height: 600 });
  await popup.goto(new URL('/popup.html', page.url()).href);
  await expect(
    popup.getByRole('textbox', { name: 'Title', exact: true }),
  ).toHaveValue('Captured example');
  await expect(
    popup.getByRole('textbox', { name: 'URL', exact: true }),
  ).toHaveValue('https://example.com/');
  await popup
    .getByRole('combobox', { name: 'Folder', exact: true })
    .selectOption({ label: 'Reading' });
  await popup.getByRole('checkbox', { name: 'Reference', exact: true }).check();
  await popup.getByRole('checkbox', { name: 'Add to favorites' }).check();
  await popup.screenshot({
    path: testInfo.outputPath('capture-popup.png'),
    fullPage: true,
  });
  await popup
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(popup.getByRole('status')).toContainText('Bookmark saved');
  const card = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /Captured example/ }) });
  await expect(card).toBeVisible();
  await expect(card.getByText('Reading', { exact: true })).toBeVisible();
  await expect(card.getByText('Reference', { exact: true })).toBeVisible();
  await popup.close();
  await page.reload();
  await expect(card).toBeVisible();
  await page.getByRole('link', { name: 'Oasis home' }).click();
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  await expect(
    page
      .getByRole('dialog', { name: 'Links', exact: true })
      .getByRole('link', { name: /Captured example/ }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.keyboard.press('Control+k');
  const search = page.getByRole('combobox', {
    name: 'Search bookmarks and actions',
  });
  await search.fill('Reference');
  await expect(
    page.getByRole('option', { name: /Captured example/ }),
  ).toBeVisible();
  await page.route('https://example.com/', (route) =>
    route.fulfill({ body: '<title>Example</title>' }),
  );
  await search.press('Enter');
  await expect(page).toHaveURL('https://example.com/');
});

test('explains why an internal page cannot be captured', async ({
  context,
  page,
}) => {
  await page.goto('chrome://newtab/');
  await context.addInitScript(() => {
    if (location.pathname !== '/popup.html') return;
    const extension = (
      globalThis as unknown as {
        chrome: { tabs: { query: () => Promise<unknown[]> } };
      }
    ).chrome;
    extension.tabs.query = async () => [
      { title: 'Settings', url: 'chrome://settings/' },
    ];
  });
  await page.goto(new URL('/popup.html', page.url()).href);
  await expect(page.getByRole('alert')).toContainText('http:// or https://');
  await expect(page.getByRole('button', { name: 'Save bookmark' })).toHaveCount(
    0,
  );
  await expect(page.getByRole('link', { name: 'Open Library' })).toBeVisible();
});
