import { openSettingsPage, test, expect } from './fixtures';

test('applies font, text size, background blur and compact cards', async ({
  page,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await openSettingsPage(page, 'Appearance');
  await page
    .getByRole('combobox', { name: 'Font', exact: true })
    .selectOption('serif');
  await page.getByRole('combobox', { name: 'Text size' }).selectOption('large');
  await page.getByRole('checkbox', { name: 'Blur background images' }).check();
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    await page.evaluate(() => ({
      size: getComputedStyle(document.documentElement).fontSize,
      font: getComputedStyle(document.body).fontFamily,
    })),
  ).toEqual({ size: '18px', font: expect.stringContaining('Georgia') });

  const main = page.locator('main');
  await expect(main).not.toHaveClass(/home-blur/);
  await openSettingsPage(page, 'Image albums');
  await page
    .getByRole('button', { name: 'Quiet geometry', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Use image', exact: true })
    .first()
    .click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(main).toHaveClass(/home-blur/);
  expect(
    await main.evaluate(
      (node) => getComputedStyle(node, '::before').backdropFilter,
    ),
  ).toBe('blur(14px)');
  await page.screenshot({ path: testInfo.outputPath('blur-home.png') });

  await page.reload();
  await expect
    .poll(() =>
      page.evaluate(() => getComputedStyle(document.documentElement).fontSize),
    )
    .toBe('18px');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  const editor = page.getByRole('dialog', { name: 'Save a bookmark' });
  await editor.getByRole('textbox', { name: 'Title' }).fill('Density sample');
  await editor
    .getByRole('textbox', { name: 'URL' })
    .fill('https://example.com/density');
  await editor
    .getByRole('textbox', { name: 'Description' })
    .fill('A description that compact cards hide.');
  await editor
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  const card = page.locator('[data-bookmark-id]').first();
  await expect(card).toContainText('A description that compact cards hide.');
  const compact = page.getByRole('button', { name: 'Compact cards' });
  await compact.click();
  await expect(compact).toHaveAttribute('aria-pressed', 'true');
  await expect(card).not.toContainText(
    'A description that compact cards hide.',
  );
  await page.reload();
  await expect(
    page.getByRole('button', { name: 'Compact cards' }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: testInfo.outputPath('compact-library.png') });
});
