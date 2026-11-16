import { test, expect, openSettingsPage } from './fixtures';
test('shows neutral next controls without recording dislikes or changing another tab', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(60000);
  await page.goto('chrome://newtab/');
  await openSettingsPage(page, 'Image albums');
  const albums = page.getByRole('dialog');
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
  const original = await page
    .locator('main')
    .getAttribute('data-background-image');
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.locator('main')).toHaveAttribute(
    'data-background-image',
    original!,
  );
  await page.locator('footer').hover();
  await page.getByRole('button', { name: 'Next image', exact: true }).click();
  await expect(page.locator('main')).not.toHaveAttribute(
    'data-background-image',
    original!,
  );
  await expect(other.locator('main')).toHaveAttribute(
    'data-background-image',
    original!,
  );
  await openSettingsPage(page, 'Quote collections');
  const quotes = page.getByRole('dialog');
  await quotes
    .getByRole('textbox', { name: 'New collection name', exact: true })
    .fill('Quiet reminders');
  await quotes
    .getByRole('button', { name: 'Create collection', exact: true })
    .click();
  for (const text of [
    'Leave room to think.',
    'One useful thing at a time.',
    'Take a quiet moment.',
  ]) {
    await quotes
      .getByRole('textbox', { name: 'Quote', exact: true })
      .fill(text);
    await quotes
      .getByRole('textbox', { name: 'Author (optional)', exact: true })
      .fill('Personal note');
    await quotes
      .getByRole('button', { name: 'Add quote', exact: true })
      .click();
    await expect(quotes.getByRole('status')).toContainText('Quote saved');
  }
  await quotes
    .getByRole('button', { name: 'Show daily on Home', exact: true })
    .click();
  await quotes.getByRole('button', { name: 'Done', exact: true }).click();
  const figure = page.getByRole('figure', { name: 'Daily quote' }),
    first = await figure.locator('blockquote').textContent();
  await figure.hover();
  await page.getByRole('button', { name: 'Next quote', exact: true }).click();
  await expect(figure.locator('blockquote')).not.toHaveText(first!);
  const second = await figure.locator('blockquote').textContent();
  await page.getByRole('button', { name: 'Next quote', exact: true }).click();
  await expect(figure.locator('blockquote')).not.toHaveText(first!);
  await expect(figure.locator('blockquote')).not.toHaveText(second!);
  await page.locator('main').hover({ position: { x: 10, y: 10 } });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement)
      document.activeElement.blur();
  });
  await expect(
    page.getByRole('group', { name: 'quote preference', exact: true }),
  ).toHaveCSS('opacity', '0');
  await expect(
    page.getByRole('group', { name: 'background preference', exact: true }),
  ).toHaveCSS('opacity', '0');
  await page.screenshot({
    path: testInfo.outputPath('home-minimal-desktop.png'),
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath('home-minimal-mobile.png'),
    fullPage: true,
  });
  await openSettingsPage(page, 'Content preferences');
  await expect(
    page.getByText(
      'No saved preferences. Like or dislike a background or quote on Home to get started.',
      { exact: true },
    ),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.locator('main')).toHaveAttribute(
    'data-background-image',
    original!,
  );
  await other.close();
});

test('previews another fixed background without changing the saved image', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await openSettingsPage(page, 'Image albums');
  const albums = page.getByRole('dialog');
  await albums
    .getByRole('button', { name: 'Quiet geometry', exact: true })
    .click();
  await albums
    .getByRole('button', { name: 'Use image', exact: true })
    .first()
    .click();
  await albums.getByRole('button', { name: 'Done', exact: true }).click();
  const fixed = await page
    .locator('main')
    .getAttribute('data-background-image');
  await page.locator('footer').hover();
  await page.getByRole('button', { name: 'Next image', exact: true }).click();
  await expect(page.locator('main')).not.toHaveAttribute(
    'data-background-image',
    fixed!,
  );
  await openSettingsPage(page, 'Image albums');
  await page
    .getByRole('button', { name: 'Use image', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('main')).toHaveAttribute(
    'data-background-image',
    fixed!,
  );
  await page.locator('footer').hover();
  await page.getByRole('button', { name: 'Next image', exact: true }).click();
  await expect(page.locator('main')).not.toHaveAttribute(
    'data-background-image',
    fixed!,
  );
  await page.reload();
  await expect(page.locator('main')).toHaveAttribute(
    'data-background-image',
    fixed!,
  );
  await openSettingsPage(page, 'Image albums');
  await expect(
    page.getByRole('checkbox', { name: 'Rotate this album daily' }),
  ).not.toBeChecked();
});
