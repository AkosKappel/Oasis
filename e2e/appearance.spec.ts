import { test, expect } from './fixtures';

test('persists appearance, synchronizes tabs and follows system theme', async ({
  page,
  context,
}, testInfo) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('chrome://newtab/');
  const second = await context.newPage();
  await second.emulateMedia({ colorScheme: 'light' });
  await second.goto(page.url());
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Theme', exact: true })
    .selectOption('dark');
  await page
    .getByRole('combobox', { name: 'Accent', exact: true })
    .selectOption('ocean');
  await page
    .getByRole('combobox', { name: 'Clock format', exact: true })
    .selectOption('24');
  await page.getByLabel('Show date', { exact: true }).uncheck();
  await page.getByLabel('Show shortcut row', { exact: true }).uncheck();
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(second.locator('html')).toHaveAttribute('data-accent', 'ocean');
  await expect(page.locator('time')).toHaveText(/^\d{2}:\d{2}$/);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await expect(page.getByLabel('Show date', { exact: true })).not.toBeChecked();
  await expect(
    page.getByLabel('Show shortcut row', { exact: true }),
  ).not.toBeChecked();
  await page
    .getByRole('combobox', { name: 'Theme', exact: true })
    .selectOption('light');
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(
    page.getByRole('button', { name: 'Appearance', exact: true }),
  ).toBeFocused();
  await page.screenshot({ path: testInfo.outputPath('home-dark.png') });
  const contrasts = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    function luminance(color: string) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const rgb = Array.from(ctx.getImageData(0, 0, 1, 1).data)
        .slice(0, 3)
        .map((v) => {
          const s = v / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
      return rgb[0]! * 0.2126 + rgb[1]! * 0.7152 + rgb[2]! * 0.0722;
    }
    const bg = luminance(style.getPropertyValue('--background'));
    return ['--foreground', '--muted-foreground'].map((key) => {
      const fg = luminance(style.getPropertyValue(key));
      return (Math.max(bg, fg) + 0.05) / (Math.min(bg, fg) + 0.05);
    });
  });
  for (const contrast of contrasts)
    expect(contrast).toBeGreaterThanOrEqual(4.5);
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('link', { name: 'Oasis home' }).click();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Theme', exact: true })
    .selectOption('system');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await second.close();
});
