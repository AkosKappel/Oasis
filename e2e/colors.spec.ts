import { test, expect } from './fixtures';

test('previews custom colors, cancels safely, persists saves and resets to a preset', async ({
  page,
  context,
}) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('chrome://newtab/');
  const second = await context.newPage();
  await second.emulateMedia({ colorScheme: 'light' });
  await second.goto(page.url());
  const primary = () =>
    page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--primary'),
    );
  await expect.poll(primary).toBe('#286443');
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Primary hex', exact: true })
    .fill('#ffffff');
  await page
    .getByRole('textbox', { name: 'Secondary hex', exact: true })
    .fill('#000000');
  await expect.poll(primary).toBe('#ffffff');
  await expect
    .poll(() =>
      second.evaluate(() =>
        document.documentElement.style.getPropertyValue('--primary'),
      ),
    )
    .toBe('#286443');
  const contrast = await page
    .getByLabel('Color preview', { exact: true })
    .evaluate((element) => {
      function luminance(rgb: string) {
        const channels = rgb
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((v) => {
            const s = v / 255;
            return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
          });
        return (
          channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722
        );
      }
      return Array.from(element.children).map((child) => {
        const style = getComputedStyle(child);
        const first = luminance(style.backgroundColor);
        const second = luminance(style.color);
        return (
          (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05)
        );
      });
    });
  for (const ratio of contrast) expect(ratio).toBeGreaterThanOrEqual(4.5);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect.poll(primary).toBe('#286443');
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Primary hex', exact: true })
    .fill('#4568ab');
  await page
    .getByRole('textbox', { name: 'Secondary hex', exact: true })
    .fill('#eadfff');
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect.poll(primary).toBe('#4568ab');
  await expect
    .poll(() =>
      second.evaluate(() =>
        document.documentElement.style.getPropertyValue('--primary'),
      ),
    )
    .toBe('#4568ab');
  await page.reload();
  await expect.poll(primary).toBe('#4568ab');
  await page.getByRole('button', { name: 'Appearance', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Primary hex', exact: true })
    .fill('#oops');
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect(page.getByRole('alert')).toContainText('hex');
  await page.getByRole('button', { name: 'Reset colors', exact: true }).click();
  await page
    .getByRole('button', { name: 'Save settings', exact: true })
    .click();
  await expect.poll(primary).toBe('#286443');
  await second.close();
});
