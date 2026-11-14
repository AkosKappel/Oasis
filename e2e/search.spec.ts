import { test, expect } from './fixtures';

test('navigates search results with the keyboard and restores focus', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).focus();
  await page.keyboard.press('Control+k');
  const search = page.getByRole('combobox', {
    name: 'Search bookmarks and actions',
  });
  await expect(search).toBeFocused();
  await search.fill('missing');
  await expect(page.getByRole('status')).toHaveText(
    'No matching bookmarks or actions.',
  );
  await search.press('Enter');
  await expect(page.getByRole('dialog')).toBeVisible();
  await search.fill('');
  await expect(
    page.getByRole('option', { name: 'Go to Home Navigation' }),
  ).toHaveAttribute('aria-selected', 'true');
  await search.press('ArrowDown');
  await expect(
    page.getByRole('option', { name: 'Go to Library Navigation' }),
  ).toHaveAttribute('aria-selected', 'true');
  await search.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Your library' }),
  ).toBeVisible();
  await page.getByRole('searchbox').focus();
  await page.keyboard.press('Meta+k');
  await expect(search).toBeFocused();
  await search.press('Escape');
  await expect(page.getByRole('searchbox')).toBeFocused();
});
