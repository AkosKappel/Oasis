import { openSettingsPage } from './fixtures';
import { test, expect } from './fixtures';
import { readFile } from 'node:fs/promises';

test('manages local images, selects a background and backs up albums', async ({
  page,
  context,
}, testInfo) => {
  await page.goto('chrome://newtab/');
  const data = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 800;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 1280, 800);
    gradient.addColorStop(0, '#153c43');
    gradient.addColorStop(0.5, '#5b8792');
    gradient.addColorStop(1, '#deb996');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1280, 800);
    ctx.fillStyle = '#22484c';
    ctx.beginPath();
    ctx.moveTo(0, 800);
    ctx.lineTo(0, 600);
    ctx.lineTo(350, 260);
    ctx.lineTo(700, 720);
    ctx.lineTo(1000, 330);
    ctx.lineTo(1280, 500);
    ctx.lineTo(1280, 800);
    ctx.fill();
    return canvas.toDataURL('image/png').split(',')[1]!;
  });
  await openSettingsPage(page, 'Image albums');
  await page
    .getByRole('textbox', { name: 'New album name', exact: true })
    .fill('Landscapes');
  await page.getByRole('button', { name: 'Create album', exact: true }).click();
  await expect(
    page.getByRole('combobox', { name: 'Album', exact: true }),
  ).toHaveValue(/.+/);
  await page.getByLabel('Upload images', { exact: true }).setInputFiles({
    name: 'Mountain study.png',
    mimeType: 'image/png',
    buffer: Buffer.from(data, 'base64'),
  });
  await expect(page.getByRole('status')).toHaveText('Images added.');
  await page.getByRole('button', { name: 'Use image', exact: true }).click();
  const downloading = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download album backup', exact: true })
    .click();
  const download = await downloading;
  const archive = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(archive.albums[0].name).toBe('Landscapes');
  expect(archive.images[0].dataUrl).toMatch(/^data:image\/jpeg;base64,/);
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Restore album backup', { exact: true }).setInputFiles({
    name: 'albums.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(archive)),
  });
  await expect(page.getByRole('status')).toHaveText('Albums restored.');
  const invalid = structuredClone(archive);
  invalid.images[0].width++;
  await page.getByLabel('Restore album backup', { exact: true }).setInputFiles({
    name: 'invalid.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(invalid)),
  });
  await expect(page.getByRole('alert')).toContainText('invalid dimensions');
  await page.getByRole('checkbox', { name: 'Rotate this album daily' }).check();
  await page
    .getByRole('combobox', { name: 'Background dimming', exact: true })
    .selectOption('70');
  await page
    .getByRole('button', { name: 'Save background settings', exact: true })
    .click();
  await expect(page.getByRole('status')).toHaveText(
    'Background settings saved.',
  );
  await page.screenshot({ path: '/tmp/oasis-previews/albums.png' });
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('main')).toHaveClass(/home-photo/);
  await expect(page.locator('main')).toHaveAttribute(
    'data-background-image',
    /.+/,
  );
  await page.reload();
  await expect(page.locator('main')).toHaveClass(/home-photo/);
  await page.screenshot({ path: '/tmp/oasis-previews/home-album.png' });
  await page.screenshot({ path: testInfo.outputPath('home-album.png') });
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(other.locator('main')).toHaveClass(/home-photo/);
  await other.close();
  await openSettingsPage(page, 'Image albums');
  await page.getByLabel('Upload images', { exact: true }).setInputFiles({
    name: 'unsafe.svg',
    mimeType: 'image/svg+xml',
    buffer: Buffer.from('<svg/>'),
  });
  await expect(page.getByRole('alert')).toContainText('JPEG, PNG or WebP');
  await page
    .getByRole('button', { name: 'Use plain background', exact: true })
    .click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.locator('main')).not.toHaveClass(/home-photo/);
});
