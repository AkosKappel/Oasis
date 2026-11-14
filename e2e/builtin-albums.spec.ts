import { test, expect } from './fixtures';
import { readFile } from 'node:fs/promises';

test('browses bundled albums offline, selects images and preserves daily rotation across tabs', async ({
  page,
  context,
}, testInfo) => {
  await context.setOffline(true);
  await page.goto('chrome://newtab/');
  await expect(page.locator('main')).not.toHaveClass(/home-photo/);
  await page.getByRole('button', { name: 'Image albums', exact: true }).click();
  const dialog = page.getByRole('dialog', {
    name: 'Image albums',
    exact: true,
  });
  const names = [
    'Quiet geometry',
    'Open air',
    'Soft forms',
    'After dark',
    'Woodland',
    'Quiet spaces',
  ];
  const firstImages = [
    'jade-ridges',
    'morning-lake',
    'warm-folds',
    'moonlit-dunes',
    'fern-path',
    'sunlit-arch',
  ];
  for (const [index, name] of names.entries()) {
    await dialog.getByRole('button', { name, exact: true }).click();
    await expect(
      dialog.getByRole('button', { name: 'Use image', exact: true }),
    ).toHaveCount(index < 4 ? 3 : 2);
    await expect(
      dialog.getByRole('button', { name: 'Rename album', exact: true }),
    ).toHaveCount(0);
    await expect(
      dialog.getByLabel('Upload images', { exact: true }),
    ).toHaveCount(0);
    const images = dialog.locator('img');
    await expect
      .poll(() =>
        images.evaluateAll((items) =>
          items.every(
            (item) =>
              item instanceof HTMLImageElement &&
              item.complete &&
              item.naturalWidth > 0,
          ),
        ),
      )
      .toBe(true);
    await dialog
      .getByRole('button', { name: 'Use image', exact: true })
      .first()
      .click();
    await expect(page.locator('main')).toHaveAttribute(
      'data-background-image',
      `oasis:builtin:${firstImages[index]}`,
    );
    await dialog.getByRole('button', { name: 'Done', exact: true }).click();
    await page.screenshot({
      path: testInfo.outputPath(
        `oasis-${name.toLowerCase().replaceAll(' ', '-')}.png`,
      ),
    });
    await page
      .getByRole('button', { name: 'Image albums', exact: true })
      .click();
  }
  await dialog
    .getByRole('button', { name: 'Quiet geometry', exact: true })
    .click();
  await dialog
    .getByRole('checkbox', { name: 'Rotate this album daily' })
    .check();
  await dialog
    .getByRole('button', { name: 'Save background settings', exact: true })
    .click();
  await expect(dialog.getByRole('status')).toHaveText(
    'Background settings saved.',
  );
  await expect(page.locator('main')).toHaveAttribute(
    'data-background-image',
    /^oasis:builtin:(jade-ridges|desert-dusk|snow-lines)$/,
  );
  const chosen = await page
    .locator('main')
    .getAttribute('data-background-image');
  expect(chosen).toMatch(/^oasis:builtin:/);
  const downloading = page.waitForEvent('download');
  await dialog
    .getByRole('button', { name: 'Download album backup', exact: true })
    .click();
  const file = await (await downloading).path();
  const archive = JSON.parse(await readFile(file!, 'utf8'));
  expect(archive.albums).toEqual([]);
  expect(archive.images).toEqual([]);
  await dialog.evaluate((element) => {
    element.scrollTop = 0;
  });
  await page.screenshot({
    path: testInfo.outputPath('oasis-builtin-albums.png'),
  });
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await expect(page.locator('main')).toHaveAttribute(
    'data-background-image',
    chosen!,
  );
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.locator('main')).toHaveAttribute(
    'data-background-image',
    chosen!,
  );
  await other.close();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: testInfo.outputPath('oasis-builtin-mobile.png'),
  });
  await page.getByRole('button', { name: 'Image albums', exact: true }).click();
  await expect(dialog).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await dialog
    .getByRole('button', { name: 'Use plain background', exact: true })
    .click();
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('main')).not.toHaveClass(/home-photo/);
  await page.reload();
  await expect(page.locator('main')).not.toHaveClass(/home-photo/);
});
