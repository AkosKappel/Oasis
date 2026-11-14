import { test, expect } from './fixtures';

test('shares typo-tolerant ranked search and operators between Library and palette', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Documentation');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://docs.example.com');
  await page.getByRole('checkbox', { name: 'Add to favorites' }).check();
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  const search = page.getByRole('searchbox', { name: 'Search bookmarks' });
  await search.fill('documantation domain:example.com is:favorite');
  await expect(page.getByRole('link', { name: /Documentation/ })).toBeVisible();
  await search.fill('domain:other.com');
  await expect(page.getByRole('link', { name: /Documentation/ })).toHaveCount(
    0,
  );
  await page.keyboard.press('Control+k');
  const palette = page.getByRole('combobox', {
    name: 'Search bookmarks and actions',
  });
  await palette.fill('documantation domain:example.com is:favorite');
  await expect(
    page.getByRole('option', { name: /Documentation/ }),
  ).toBeVisible();
  await palette.press('Escape');
  await expect(search).toBeFocused();
});
