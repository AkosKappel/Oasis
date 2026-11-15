import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
test('rates local images and quotes, persists across tabs and skips disliked daily content', async ({
  page,
  context,
}, testInfo) => {
  await context.setOffline(true);
  await page.goto('chrome://newtab/');
  await page.getByRole('button', { name: 'Image albums', exact: true }).click();
  const albums = page.getByRole('dialog', {
    name: 'Image albums',
    exact: true,
  });
  await albums
    .getByRole('button', { name: 'Quiet geometry', exact: true })
    .click();
  await albums
    .getByRole('checkbox', { name: 'Rotate this album daily' })
    .check();
  await albums
    .getByRole('checkbox', { name: 'Mix all albums during daily rotation' })
    .check();
  await albums
    .getByRole('button', { name: 'Save background settings', exact: true })
    .click();
  await expect(albums.getByRole('status')).toContainText('saved');
  await albums.getByRole('button', { name: 'Done', exact: true }).click();
  const initial = await page
    .locator('main')
    .getAttribute('data-background-image');
  expect(initial).toBeTruthy();
  await page
    .getByRole('button', { name: 'Like this background', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Like this background', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('main')).toHaveAttribute(
    'data-background-image',
    initial!,
  );
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.locator('main')).toHaveAttribute(
    'data-background-image',
    initial!,
  );
  await expect(
    other.getByRole('button', { name: 'Like this background', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page
    .getByRole('button', { name: 'Dislike this background', exact: true })
    .click();
  await expect(page.locator('main')).not.toHaveAttribute(
    'data-background-image',
    initial!,
  );
  const next = await page.locator('main').getAttribute('data-background-image');
  await expect(other.locator('main')).toHaveAttribute(
    'data-background-image',
    next!,
  );
  await other.close();
  await page.reload();
  await expect(page.locator('main')).toHaveAttribute(
    'data-background-image',
    next!,
  );
  await page.getByRole('button', { name: 'Quotes', exact: true }).click();
  const quotes = page.getByRole('dialog');
  await quotes
    .getByRole('textbox', { name: 'New collection name', exact: true })
    .fill('Small reminders');
  await quotes
    .getByRole('button', { name: 'Create collection', exact: true })
    .click();
  await quotes
    .getByRole('textbox', { name: 'Quote', exact: true })
    .fill('Make room for what matters.');
  await quotes
    .getByRole('textbox', { name: 'Author (optional)', exact: true })
    .fill('Personal note');
  await quotes.getByRole('button', { name: 'Add quote', exact: true }).click();
  await expect(quotes.getByRole('status')).toContainText('Quote saved');
  await quotes
    .getByRole('button', { name: 'Show daily on Home', exact: true })
    .click();
  await expect(quotes.getByRole('status')).toContainText('shown on Home');
  await quotes.getByRole('button', { name: 'Done', exact: true }).click();
  await page
    .getByRole('button', { name: 'Like this quote', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Like this quote', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({
    path: testInfo.outputPath('feedback-desktop.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath('feedback-mobile.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Dislike this quote', exact: true })
    .click();
  await expect(page.getByRole('figure', { name: 'Daily quote' })).toHaveCount(
    0,
  );
  await page.reload();
  await expect(page.getByRole('figure', { name: 'Daily quote' })).toHaveCount(
    0,
  );
});
