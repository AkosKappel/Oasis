import { openSettingsPage } from './fixtures';
import { test, expect } from './fixtures';
import type { Locator } from '@playwright/test';
async function worstContrast(panel: Locator) {
  return panel.evaluate((element) => {
    const context = document.createElement('canvas').getContext('2d')!;
    function color(value: string) {
      context.clearRect(0, 0, 1, 1);
      context.fillStyle = value;
      context.fillRect(0, 0, 1, 1);
      return [...context.getImageData(0, 0, 1, 1).data];
    }
    function light(values: number[]) {
      const a = values.map((value) => {
        const x = value / 255;
        return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
      });
      return a[0]! * 0.2126 + a[1]! * 0.7152 + a[2]! * 0.0722;
    }
    const style = getComputedStyle(element),
      fill = color(style.backgroundColor),
      alpha = fill[3]! / 255;
    const label = element.querySelector<HTMLElement>('.text-muted-foreground')!;
    const text = color(getComputedStyle(label).color).slice(0, 3);
    return Math.min(
      ...[0, 255].map((under) => {
        const bg = fill
          .slice(0, 3)
          .map((value) => value * alpha + under * (1 - alpha));
        const a = light(text),
          b = light(bg);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      }),
    );
  });
}
test('uses readable glass panels in light/dark and opaque reduced-transparency fallback', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  await openSettingsPage(page, 'Image albums');
  await page.getByRole('button', { name: 'Open air', exact: true }).click();
  await page
    .getByRole('button', { name: 'Use image', exact: true })
    .first()
    .click();
  await expect(page.locator('main')).toHaveClass(/home-photo/);
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  for (const theme of ['light', 'dark']) {
    await openSettingsPage(page, 'Appearance');
    await page
      .getByRole('combobox', { name: 'Theme', exact: true })
      .selectOption(theme);
    await page
      .getByRole('button', { name: 'Save settings', exact: true })
      .click();
    await expect(
      page.getByRole('dialog', { name: 'Appearance', exact: true }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: 'Links', exact: true }).click();
    const links = page.getByRole('dialog', { name: 'Links', exact: true });
    expect(
      await links.evaluate((node) => getComputedStyle(node).backdropFilter),
    ).toContain('blur(20px)');
    expect(await worstContrast(links)).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({
      path: testInfo.outputPath(`links-glass-${theme}.png`),
    });
    await page.keyboard.press('Escape');
    await openSettingsPage(page, 'Appearance');
    const editor = page.getByRole('dialog', {
      name: 'Appearance',
      exact: true,
    });
    expect(
      await editor.evaluate((node) => getComputedStyle(node).backdropFilter),
    ).toContain('blur(20px)');
    expect(await worstContrast(editor)).toBeGreaterThanOrEqual(4.5);
    await page.screenshot({
      path: testInfo.outputPath(`dialog-glass-${theme}.png`),
    });
    await page.keyboard.press('Escape');
  }
  const cdp = await context.newCDPSession(page);
  await cdp.send('Emulation.setEmulatedMedia', {
    features: [{ name: 'prefers-reduced-transparency', value: 'reduce' }],
  });
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  const links = page.getByRole('dialog', { name: 'Links', exact: true });
  expect(
    await links.evaluate((node) => getComputedStyle(node).backdropFilter),
  ).toBe('none');
  expect(
    await links.evaluate((node) => getComputedStyle(node).backgroundColor),
  ).not.toContain(' / ');
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Links', exact: true }).click();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
