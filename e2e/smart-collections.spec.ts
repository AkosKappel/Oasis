import { test, expect } from './fixtures';
test('smart collections update after editing and combine with text filters', async ({
  page,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Reading reference');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com/reference');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const collection = page.getByRole('combobox', {
    name: 'Collections',
    exact: true,
  });
  const cards = page
    .getByRole('list', { name: 'Bookmarks', exact: true })
    .locator(':scope > li');
  for (const value of ['recent', 'untagged', 'unorganized']) {
    await collection.selectOption(value);
    await expect(cards).toHaveCount(1);
  }
  await collection.selectOption('favorites');
  await expect(cards).toHaveCount(0);
  await page.getByRole('button', { name: /^All bookmarks/ }).click();
  await page
    .getByRole('button', { name: 'Edit Reading reference', exact: true })
    .click();
  await page.getByLabel('Add to favorites', { exact: true }).check();
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await collection.selectOption('favorites');
  await expect(cards).toHaveCount(1);
  await page.getByRole('searchbox').fill('"Missing phrase"');
  await expect(cards).toHaveCount(0);
  await page.getByRole('searchbox').clear();
  await expect(cards).toHaveCount(1);
  await page.screenshot({ path: testInfo.outputPath('smart-collections.png') });
});
