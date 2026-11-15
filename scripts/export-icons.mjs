import { URL } from 'node:url';
import { readFile, mkdir } from 'node:fs/promises';
import { chromium } from '@playwright/test';

const svg = await readFile(new URL('../public/icon/icon.svg', import.meta.url));
const directory = new URL('../public/icon/', import.meta.url);
await mkdir(directory, { recursive: true });
const browser = await chromium.launch({ channel: 'chromium', headless: true });
try {
  const page = await browser.newPage();
  for (const size of [16, 32, 48, 128]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<html><body style="margin:0;background:transparent"><img width="${size}" height="${size}" src="data:image/svg+xml;base64,${svg.toString('base64')}" /></body></html>`,
    );
    await page.locator('img').evaluate((element) => element.decode());
    await page.screenshot({
      path: new URL(`${size}.png`, directory).pathname,
      omitBackground: true,
    });
  }
} finally {
  await browser.close();
}
