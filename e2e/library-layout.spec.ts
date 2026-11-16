import AxeBuilder from '@axe-core/playwright';
import { test, expect, openLibraryTool } from './fixtures';
test('keeps results near the top and puts secondary tools and filters out of the way', async ({
  page,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  for (const title of ['Reading guide', 'Design reference']) {
    await page
      .getByRole('button', { name: 'Add bookmark', exact: true })
      .click();
    await page.getByRole('textbox', { name: 'Title', exact: true }).fill(title);
    await page
      .getByRole('textbox', { name: 'URL', exact: true })
      .fill('https://example.com/' + title.split(' ')[0]);
    await page
      .getByRole('button', { name: 'Save bookmark', exact: true })
      .click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  }
  await page.evaluate(() => scrollTo(0, 0));
  const cards = page.getByRole('list', { name: 'Bookmarks', exact: true });
  expect(
    (await cards.locator(':scope>li').first().boundingBox())!.y,
  ).toBeLessThan(600);
  await expect(
    page.getByRole('button', { name: 'Backup and restore', exact: true }),
  ).not.toBeVisible();
  await openLibraryTool(page, 'Statistics');
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'More Library tools', exact: true }),
  ).toBeFocused();
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({ path: testInfo.outputPath('library-desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => scrollTo(0, 0));
  await expect(
    page.getByRole('combobox', { name: 'Collections' }),
  ).not.toBeVisible();
  expect(
    (await cards.locator(':scope>li').first().boundingBox())!.y,
  ).toBeLessThan(760);
  await page.screenshot({ path: testInfo.outputPath('library-mobile.png') });
  await page.getByText('Filters and collections', { exact: true }).click();
  await page
    .getByRole('searchbox', { name: 'Search bookmarks', exact: true })
    .fill('Reading');
  await expect(cards.locator(':scope>li')).toHaveCount(1);
  await page
    .getByRole('button', { name: 'Clear filters', exact: true })
    .click();
  await expect(cards.locator(':scope>li')).toHaveCount(2);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
