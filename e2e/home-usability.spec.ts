import { openSettingsPage } from './fixtures';
import { test, expect } from './fixtures';

async function readable(element: import('@playwright/test').Locator) {
  return element.evaluate((node) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    function luminance(color: string) {
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 1, 1);
      const linear = [...ctx.getImageData(0, 0, 1, 1).data]
        .slice(0, 3)
        .map((value) => {
          const s = value / 255;
          return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
      return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
    }
    const style = getComputedStyle(node);
    const a = luminance(style.color);
    const b = luminance(style.backgroundColor);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}

test('keeps 12-hour clocks and long quotes within a 320-pixel Home', async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.clock.install({ time: new Date(2026, 10, 14, 12, 58) });
  await page.goto('chrome://newtab/');
  await openSettingsPage(page, 'Appearance');
  await page
    .getByRole('combobox', { name: 'Clock format', exact: true })
    .selectOption('12');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await openSettingsPage(page, 'Quote collections');
  await page
    .getByRole('textbox', { name: 'New collection name', exact: true })
    .fill('Long text');
  await page
    .getByRole('button', { name: 'Create collection', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Quote', exact: true })
    .fill('A'.repeat(500));
  await page
    .getByRole('textbox', { name: 'Author (optional)', exact: true })
    .fill('B'.repeat(120));
  await page.getByRole('button', { name: 'Add quote', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Quote saved.');
  await page
    .getByRole('button', { name: 'Show daily on Home', exact: true })
    .click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test('keeps keyboard focus predictable across Links, command search and dismissal', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  const trigger = page.getByRole('button', { name: 'Links', exact: true });
  await trigger.focus();
  await trigger.press('Enter');
  const links = page.getByRole('dialog', { name: 'Links', exact: true });
  await expect(links.getByRole('searchbox')).toBeFocused();
  await links.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(trigger).toBeFocused();
  await trigger.press('Enter');
  await page.keyboard.press('Control+k');
  const palette = page.getByRole('dialog', {
    name: 'Search Oasis',
    exact: true,
  });
  await expect(palette.getByRole('combobox')).toBeFocused();
  await expect(links).not.toBeVisible();
  await palette.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(trigger).toBeFocused();
  await openSettingsPage(page, 'Appearance');
  await expect(
    page.getByRole('group', { name: 'Color preview', exact: true }),
  ).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(
    page.getByRole('button', { name: 'Settings', exact: true }),
  ).toBeFocused();
});

test('updates system-theme color controls while Appearance stays open', async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('chrome://newtab/');
  await openSettingsPage(page, 'Appearance');
  await expect(
    page.getByLabel('Primary color picker', { exact: true }),
  ).toHaveValue('#286443');
  await page.emulateMedia({ colorScheme: 'dark' });
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  await expect(
    page.getByLabel('Primary color picker', { exact: true }),
  ).toHaveValue('#85c9a4');
});

test('keeps a photo-backed Links panel and custom hover highlights readable', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Readable link');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com');
  await page.getByRole('checkbox', { name: 'Add to favorites' }).check();
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(page.getByRole('link', { name: /Readable link/ })).toBeVisible();
  await page.getByRole('link', { name: 'Oasis home' }).click();
  await openSettingsPage(page, 'Appearance');
  await page
    .getByRole('combobox', { name: 'Theme', exact: true })
    .selectOption('light');
  await page
    .getByRole('textbox', { name: 'Primary hex', exact: true })
    .fill('#ffffff');
  await page
    .getByRole('textbox', { name: 'Secondary hex', exact: true })
    .fill('#000000');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  const image = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 16;
    canvas.height = 16;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, 16, 16);
    return canvas.toDataURL('image/png').split(',')[1]!;
  });
  await openSettingsPage(page, 'Image albums');
  await page
    .getByRole('textbox', { name: 'New album name', exact: true })
    .fill('Bright photo');
  await page.getByRole('button', { name: 'Create album', exact: true }).click();
  await page.getByLabel('Upload images', { exact: true }).setInputFiles({
    name: 'white.png',
    mimeType: 'image/png',
    buffer: Buffer.from(image, 'base64'),
  });
  await expect(page.getByRole('status')).toHaveText('Images added.');
  await page.getByRole('button', { name: 'Use image', exact: true }).click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('main')).toHaveClass(/home-photo/);
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  const links = page.getByRole('dialog', { name: 'Links', exact: true });
  expect(await readable(links)).toBeGreaterThanOrEqual(4.5);
  const link = links.getByRole('link', { name: /Readable link/ });
  await link.hover();
  expect(await readable(link)).toBeGreaterThanOrEqual(4.5);
  await expect(link.locator('span').last()).toHaveCSS(
    'color',
    'rgb(255, 255, 255)',
  );
});
