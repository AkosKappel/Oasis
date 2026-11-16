import { test, expect } from './fixtures';

test('manages bookmarks in the new-tab extension', async ({
  context,
  page,
}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Library' })).toBeVisible();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Example site');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com');
  await page
    .getByRole('textbox', { name: 'Description' })
    .fill('A place to return to');
  await page.getByRole('checkbox', { name: 'Add to favorites' }).check();
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  const bookmark = page.getByRole('link', { name: /Example site/ });
  await expect(bookmark).toHaveAttribute('href', 'https://example.com/');
  await expect(bookmark).toHaveAttribute('target', '_blank');
  const secondTab = await context.newPage();
  await secondTab.goto('chrome://newtab/');
  await secondTab.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(
    secondTab.getByRole('link', { name: /Example site/ }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('library-mobile.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({
    path: testInfo.outputPath('library-desktop.png'),
    fullPage: true,
  });
  await page.reload();
  await expect(bookmark).toBeVisible();
  await page.getByRole('button', { name: 'Edit Example site' }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Updated site');
  await page.getByRole('checkbox', { name: 'Add to favorites' }).uncheck();
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(
    secondTab.getByRole('link', { name: /Updated site/ }),
  ).toBeVisible();
  await secondTab.close();
  await page.getByRole('button', { name: 'Favorites', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Your favorites belong here' }),
  ).toBeVisible();
  await page.getByRole('button', { name: /All bookmarks/ }).click();
  const search = page.getByRole('searchbox', { name: 'Search bookmarks' });
  await search.fill('missing');
  await expect(
    page.getByRole('heading', { name: 'No matching bookmarks' }),
  ).toBeVisible();
  await search.fill('Updated');
  await expect(page.getByRole('link', { name: /Updated site/ })).toBeVisible();
  await search.fill('');
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Unsafe');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('javascript:alert(1)');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('http:// or https://');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Delete Updated site' }).click();
  await expect(page.getByRole('link', { name: /Updated site/ })).toBeVisible();
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Delete Updated site' }).click();
  await expect(
    page.getByRole('heading', { name: 'Make room for your next discovery' }),
  ).toBeVisible();
  await page.reload();
  await expect(
    page.getByRole('heading', { name: 'Make room for your next discovery' }),
  ).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
