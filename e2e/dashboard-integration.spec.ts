import { test, expect } from './fixtures';
import type { Locator } from '@playwright/test';
async function buttonContrast(button: Locator) {
  return button.evaluate((element) => {
    const context = document.createElement('canvas').getContext('2d')!;
    function sample(color: string) {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = color;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    }
    function luminance(rgb: number[]) {
      const values = rgb.map((value) => {
        const s = value / 255;
        return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      });
      return values[0]! * 0.2126 + values[1]! * 0.7152 + values[2]! * 0.0722;
    }
    const style = getComputedStyle(element),
      text = sample(style.color),
      fill = sample(style.backgroundColor),
      alpha = fill[3]! / 255;
    // The brightest possible photo is 102/255 after the minimum 60% dimming.
    const background = fill
      .slice(0, 3)
      .map((value) => value * alpha + 102 * (1 - alpha));
    const a = luminance(text.slice(0, 3)),
      b = luminance(background);
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  });
}
test('combines opt-in widgets over photos, keeps buttons readable and restores Home after focus', async ({
  page,
  context,
}, testInfo) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await context.addInitScript(() => {
    const permissions = (
      globalThis as unknown as {
        chrome: { permissions: { contains: () => Promise<boolean> } };
      }
    ).chrome.permissions;
    permissions.contains = async () => true;
  });
  await context.route('https://geocoding-api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        results: [
          {
            name: 'Bratislava',
            country: 'Slovakia',
            latitude: 48.15,
            longitude: 17.11,
          },
        ],
      },
    }),
  );
  await context.route('https://api.open-meteo.com/**', (route) =>
    route.fulfill({
      json: {
        current: { temperature_2m: 12, weather_code: 2 },
        current_units: { temperature_2m: '°C' },
        daily_units: { temperature_2m_max: '°C', temperature_2m_min: '°C' },
        daily: {
          time: ['2026-11-14', '2026-11-15', '2026-11-16'],
          temperature_2m_min: [5, 6, 7],
          temperature_2m_max: [12, 13, 14],
          weather_code: [2, 61, 0],
        },
      },
    }),
  );
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('MDN Web Docs');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://developer.mozilla.org');
  await page
    .getByRole('checkbox', { name: 'Add to favorites', exact: true })
    .check();
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('link', { name: 'Oasis home', exact: true }).click();
  await page.getByRole('button', { name: 'Image albums', exact: true }).click();
  await page
    .getByRole('button', { name: 'Quiet geometry', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Use image', exact: true })
    .first()
    .click();
  await expect(page.locator('main')).toHaveAttribute(
    'data-background-image',
    'oasis:builtin:jade-ridges',
  );
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page
    .getByRole('combobox', { name: 'Clock format', exact: true })
    .selectOption('24');
  await page
    .getByRole('checkbox', { name: 'Show daily focus', exact: true })
    .check();
  await page
    .getByRole('combobox', { name: 'Links side', exact: true })
    .selectOption('right');
  await page
    .getByRole('checkbox', { name: 'Keep Links open on desktop', exact: true })
    .check();
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page
    .getByRole('textbox', { name: "Today's focus", exact: true })
    .fill('Write a clear first draft');
  expect(
    await buttonContrast(
      page.getByRole('button', { name: 'Save focus', exact: true }),
    ),
  ).toBeGreaterThanOrEqual(4.5);
  await page.getByRole('button', { name: 'Save focus', exact: true }).click();
  await expect(
    page.getByText('Write a clear first draft', { exact: true }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Widgets', exact: true }).click();
  const widgets = page.getByRole('dialog', { name: 'Widgets', exact: true });
  await widgets
    .getByRole('textbox', { name: 'Widget label', exact: true })
    .fill('Tokyo');
  await widgets
    .getByRole('combobox', { name: 'Time zone', exact: true })
    .selectOption('Asia/Tokyo');
  await widgets
    .getByRole('button', { name: 'Add widget', exact: true })
    .click();
  await expect(
    widgets.getByRole('button', { name: 'Edit Tokyo', exact: true }),
  ).toBeVisible();
  await widgets
    .getByRole('combobox', { name: 'Widget type', exact: true })
    .selectOption('countdown');
  await widgets
    .getByRole('textbox', { name: 'Widget label', exact: true })
    .fill('A weekend away');
  const future = new Date(Date.now() + 7 * 86_400_000);
  const date = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, '0')}-${String(future.getDate()).padStart(2, '0')}T18:00`;
  await widgets
    .getByLabel('Countdown date and time', { exact: true })
    .fill(date);
  await widgets
    .getByRole('button', { name: 'Add widget', exact: true })
    .click();
  await expect(
    widgets.getByRole('button', { name: 'Edit A weekend away', exact: true }),
  ).toBeVisible();
  await widgets
    .getByRole('searchbox', { name: 'Weather city', exact: true })
    .fill('Bratislava');
  await widgets.getByRole('button', { name: 'Find city', exact: true }).click();
  await widgets
    .getByRole('button', { name: 'Use Bratislava, Slovakia', exact: true })
    .click();
  await expect(widgets.getByRole('status')).toContainText('Weather is enabled');
  await widgets.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Weather', exact: true }),
  ).toContainText('12°C');
  await expect(
    page.getByRole('complementary', { name: 'Links', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('article', { name: 'A weekend away', exact: true }),
  ).toContainText('18:00');
  await page.screenshot({
    path: testInfo.outputPath('dashboard-desktop.png'),
    fullPage: true,
  });
  await page.getByRole('button', { name: 'Focus mode', exact: true }).click();
  await page.getByRole('button', { name: 'Start focus', exact: true }).click();
  await expect(
    page.getByRole('dialog', { name: 'Focus mode', exact: true }),
  ).toHaveCount(0);
  const focus = page.getByRole('region', { name: 'Focus mode', exact: true });
  await expect(focus).toBeVisible();
  expect(
    await buttonContrast(
      page.getByRole('button', { name: 'Pause focus', exact: true }),
    ),
  ).toBeGreaterThanOrEqual(4.5);
  expect(
    await buttonContrast(
      page.getByRole('button', { name: 'End focus', exact: true }),
    ),
  ).toBeGreaterThanOrEqual(4.5);
  await expect(
    page.getByRole('complementary', { name: 'Links', exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole('region', { name: 'Home widgets', exact: true }),
  ).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath('focus-photo.png') });
  await page.getByRole('button', { name: 'End focus', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Daily focus', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('region', { name: 'Weather', exact: true }),
  ).toContainText('12°C');
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    page.getByRole('complementary', { name: 'Links', exact: true }),
  ).toHaveCount(0);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: testInfo.outputPath('dashboard-mobile.png'),
    fullPage: true,
  });
});
