import { openSettingsPage } from './fixtures';
import AxeBuilder from '@axe-core/playwright';
import { test, expect } from './fixtures';
test('rates local images and quotes, persists across tabs and skips disliked daily content', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(60_000);
  await context.setOffline(true);
  await page.goto('chrome://newtab/');
  await openSettingsPage(page, 'Image albums');
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
  await page.locator('main').hover({ position: { x: 10, y: 10 } });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  const backgroundRating = page.getByRole('group', {
    name: 'background preference',
    exact: true,
  });
  await expect(backgroundRating).toHaveCSS('opacity', '0');
  await page.locator('footer').hover();
  await expect(backgroundRating).toHaveCSS('opacity', '1');
  const initial = await page
    .locator('main')
    .getAttribute('data-background-image');
  expect(initial).toBeTruthy();
  await page
    .getByRole('button', { name: 'Like this background', exact: true })
    .focus();
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
    .focus();
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
  await openSettingsPage(page, 'Quote collections');
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
    .focus();
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
  await page.locator('main').hover({ position: { x: 10, y: 10 } });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  const quoteRating = page.getByRole('group', {
    name: 'quote preference',
    exact: true,
  });
  await expect(quoteRating).toHaveCSS('opacity', '0');
  await expect(backgroundRating).toHaveCSS('opacity', '0');
  const quoteBox = await page
    .getByRole('figure', { name: 'Daily quote' })
    .boundingBox();
  await page.screenshot({
    path: testInfo.outputPath('feedback-desktop.png'),
    fullPage: true,
  });
  await page.getByRole('figure', { name: 'Daily quote' }).hover();
  await expect(quoteRating).toHaveCSS('opacity', '1');
  expect(
    (await page.getByRole('figure', { name: 'Daily quote' }).boundingBox())
      ?.height,
  ).toBe(quoteBox?.height);
  await page.screenshot({
    path: testInfo.outputPath('feedback-hover.png'),
    fullPage: true,
  });
  await page.locator('main').hover({ position: { x: 10, y: 10 } });
  await page
    .getByRole('button', { name: 'Like this quote', exact: true })
    .focus();
  await expect(quoteRating).toHaveCSS('opacity', '1');
  const touch = await context.newCDPSession(page);
  await touch.send('Emulation.setTouchEmulationEnabled', {
    enabled: true,
    maxTouchPoints: 1,
  });
  expect(
    await page.evaluate(() => matchMedia('(pointer: coarse)').matches),
  ).toBe(true);
  await page.locator('main').hover({ position: { x: 10, y: 10 } });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  await expect(backgroundRating).toHaveCSS('opacity', '1');
  await expect(quoteRating).toHaveCSS('opacity', '1');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath('feedback-mobile.png'),
    fullPage: true,
  });
  await page
    .getByRole('button', { name: 'Dislike this quote', exact: true })
    .focus();
  await page
    .getByRole('button', { name: 'Dislike this quote', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeFocused();
  await expect(page.getByRole('figure', { name: 'Daily quote' })).toHaveCount(
    0,
  );
  await page.reload();
  await expect(page.getByRole('figure', { name: 'Daily quote' })).toHaveCount(
    0,
  );
  await openSettingsPage(page, 'Content preferences');
  const preferences = page.getByRole('dialog', {
    name: 'Content preferences',
    exact: true,
  });
  await expect(
    preferences
      .getByRole('list', { name: 'Saved content preferences' })
      .getByRole('listitem'),
  ).toHaveCount(2);
  await preferences
    .getByRole('combobox', { name: 'Content type', exact: true })
    .selectOption('quote');
  await expect(preferences.getByRole('listitem')).toHaveCount(1);
  await preferences
    .getByRole('button', { name: /Clear preference for Make room/ })
    .click();
  await expect(preferences.getByRole('status')).toHaveText(
    'Preference cleared.',
  );
  await expect(
    preferences.getByRole('textbox', { name: 'Find a preference' }),
  ).toBeFocused();
  await preferences
    .getByRole('combobox', { name: 'Content type', exact: true })
    .selectOption('all');
  await preferences
    .getByRole('textbox', { name: 'Find a preference' })
    .fill('no matching content');
  await preferences
    .getByRole('button', { name: 'Clear all preferences', exact: true })
    .click();
  await expect(
    preferences.getByText(
      'This includes choices hidden by search or rating filters.',
      { exact: false },
    ),
  ).toBeVisible();
  await preferences
    .getByRole('button', { name: 'Cancel clear', exact: true })
    .click();
  await expect(
    preferences.getByRole('button', {
      name: 'Clear all preferences',
      exact: true,
    }),
  ).toBeFocused();
  await preferences
    .getByRole('textbox', { name: 'Find a preference' })
    .fill('');
  expect(
    (
      await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.screenshot({
    path: testInfo.outputPath('preferences-mobile.png'),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({
    path: testInfo.outputPath('preferences-desktop.png'),
    fullPage: true,
  });
  await preferences
    .getByRole('button', { name: 'Clear all preferences', exact: true })
    .click();
  await preferences
    .getByRole('button', { name: 'Confirm clear preferences', exact: true })
    .click();
  await expect(preferences.getByRole('listitem')).toHaveCount(0);
  await preferences.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeFocused();
  await expect(page.getByRole('figure', { name: 'Daily quote' })).toBeVisible();
  await openSettingsPage(page, 'Image albums');
  const fixedAlbums = page.getByRole('dialog', {
    name: 'Image albums',
    exact: true,
  });
  await fixedAlbums
    .getByRole('button', { name: 'Quiet geometry', exact: true })
    .click();
  await fixedAlbums
    .getByRole('button', { name: 'Use image', exact: true })
    .first()
    .click();
  await fixedAlbums.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute(
    'data-background-image',
    'oasis:builtin:jade-ridges',
  );
  await page
    .getByRole('button', { name: 'Dislike this background', exact: true })
    .focus();
  await page
    .getByRole('button', { name: 'Dislike this background', exact: true })
    .click();
  await expect(
    page.getByRole('button', { name: 'Dislike this background', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('main')).toHaveAttribute(
    'data-background-image',
    'oasis:builtin:jade-ridges',
  );
});
