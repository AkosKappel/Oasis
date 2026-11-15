import { test, expect } from './fixtures';
test('keeps bookmark sections opt-in, persists them and provides a useful empty state', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await expect(
    page.getByRole('region', { name: 'Recently added', exact: true }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page
    .getByRole('checkbox', {
      name: 'Show recently added bookmarks',
      exact: true,
    })
    .check();
  await page
    .getByRole('checkbox', {
      name: 'Show frequently opened bookmarks',
      exact: true,
    })
    .check();
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect(
    page.getByRole('region', { name: 'Recently added', exact: true }),
  ).toContainText('Save a bookmark');
  await expect(
    page.getByRole('region', { name: 'Frequently opened', exact: true }),
  ).toContainText('Enable open counting');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('A useful reference');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com/reference');
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await page.getByRole('link', { name: 'Oasis home', exact: true }).click();
  await expect(
    page
      .getByRole('region', { name: 'Recently added', exact: true })
      .getByRole('link'),
  ).toHaveText('A useful reference');
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(
    other.getByRole('region', { name: 'Recently added', exact: true }),
  ).toBeVisible();
  await other.close();
  await page.reload();
  await expect(
    page.getByRole('region', { name: 'Recently added', exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath('bookmark-sections-desktop.png'),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('bookmark-sections-mobile.png'),
  });
});
