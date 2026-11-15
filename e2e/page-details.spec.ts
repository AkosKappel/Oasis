import AxeBuilder from '@axe-core/playwright';
import type { PageDetails } from '../src/features/capture/read-page-details';
import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures';

test('explicitly reads serialized page details and saves only offline cached images', async ({
  context,
  page,
}, testInfo) => {
  const png = await readFile('public/icon/128.png');
  let imageReads = 0,
    foreignReads = 0;
  await context.route('https://sample.example/**', (route) => {
    if (route.request().url().endsWith('.png')) {
      imageReads++;
      return route.fulfill({ contentType: 'image/png', body: png });
    }
    return route.fulfill({
      contentType: 'text/html',
      body: '<title>Sample reading guide</title><meta name="description" content="A sample page description"><link rel="icon" href="/icon.png"><meta property="og:image" content="/preview.png"><h1>Sample reading guide</h1>',
    });
  });
  await context.route('https://foreign.example/**', (route) => {
    foreignReads++;
    return route.abort();
  });
  await page.goto('chrome://newtab/');
  const extensionUrl = page.url();
  const source = await context.newPage();
  await source.goto('https://sample.example/guide');
  let serialized = '';
  await context.exposeBinding(
    'readSampleDetails',
    async (_source, fn: string) => {
      serialized = fn;
      return source.evaluate(`(${fn})()`);
    },
  );
  await context.addInitScript(() => {
    if (location.pathname !== '/popup.html') return;
    const api = (
      globalThis as unknown as {
        chrome: {
          tabs: {
            query: () => Promise<unknown[]>;
            get: () => Promise<unknown>;
          };
          permissions: {
            request: () => Promise<boolean>;
            contains: () => Promise<boolean>;
            remove: () => Promise<boolean>;
          };
          scripting: {
            executeScript: (options: {
              func: () => unknown;
            }) => Promise<unknown[]>;
          };
        };
      }
    ).chrome;
    api.tabs.query = async () => [
      {
        id: 7,
        title: 'Sample reading guide',
        url: 'https://sample.example/guide',
      },
    ];
    api.tabs.get = async () => ({ id: 7, url: 'https://sample.example/guide' });
    let attempts = 0;
    api.permissions.contains = async () => false;
    api.permissions.request = async () => ++attempts > 1;
    api.permissions.remove = async () => true;
    api.scripting = {
      executeScript: async (options) => [
        {
          result: await (
            globalThis as unknown as {
              readSampleDetails: (fn: string) => Promise<unknown>;
            }
          ).readSampleDetails(options.func.toString()),
        },
      ],
    };
    const alternate = (
      globalThis as unknown as { browser?: { scripting: typeof api.scripting } }
    ).browser;
    if (alternate) alternate.scripting = api.scripting;
  });
  const popup = await context.newPage();
  await popup.setViewportSize({ width: 400, height: 700 });
  await popup.goto(new URL('/popup.html', extensionUrl).href);
  const before = imageReads;
  await popup
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('My reading guide');
  await expect(
    popup.getByRole('button', { name: 'Read page details', exact: true }),
  ).toBeVisible();
  expect(imageReads).toBe(before);
  expect(serialized).toBe('');
  await popup
    .getByRole('button', { name: 'Read page details', exact: true })
    .click();
  await expect(popup.getByRole('alert')).toContainText('stay off');
  expect(serialized).toBe('');
  await popup
    .getByRole('button', { name: 'Read page details', exact: true })
    .click();
  await expect(popup.getByRole('status')).toContainText('Review before saving');
  await expect(
    popup.getByRole('textbox', { name: 'Title', exact: true }),
  ).toHaveValue('My reading guide');
  await expect(popup.getByRole('textbox', { name: 'Description' })).toHaveValue(
    'A sample page description',
  );
  await popup
    .getByRole('textbox', { name: 'Description' })
    .fill('My own description');
  await popup
    .getByRole('button', { name: 'Read page details', exact: true })
    .click();
  await expect(popup.getByRole('status')).toContainText('Review before saving');
  await expect(popup.getByRole('textbox', { name: 'Description' })).toHaveValue(
    'My own description',
  );
  await popup
    .getByRole('button', { name: 'Remove page-detail access' })
    .click();
  await expect(
    popup.getByRole('button', { name: 'Remove page-detail access' }),
  ).toHaveCount(0);
  expect(
    (
      await new AxeBuilder({ page: popup })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze()
    ).violations,
  ).toEqual([]);
  await popup.screenshot({
    path: testInfo.outputPath('metadata-capture-mobile.png'),
    fullPage: true,
  });
  await popup
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(popup.getByRole('status')).toContainText('Bookmark saved');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  const card = page
    .getByRole('listitem')
    .filter({ has: page.getByRole('link', { name: /My reading guide/ }) });
  await expect(
    card.getByRole('img', { name: 'Saved preview for My reading guide' }),
  ).toHaveAttribute('src', /^data:image\/jpeg;base64,/);
  await expect(card.getByText('My own description')).toBeVisible();
  // Reuse the actual minified injection function with hostile external declarations.
  await source.evaluate(() => {
    document.querySelector('link')!.rel = 'apple-touch-icon';
    document
      .querySelector('link')!
      .setAttribute('href', 'https://foreign.example/icon.png');
    document
      .querySelector('meta[property="og:image"]')!
      .setAttribute('content', 'https://foreign.example/image.png');
  });
  const ignored = await source.evaluate<PageDetails>(`(${serialized})()`);
  expect(ignored.favicon).toBeUndefined();
  expect(ignored.image).toBeUndefined();
  expect(foreignReads).toBe(0);
  await context.setOffline(true);
  await page.reload();
  await expect(card.getByRole('img', { name: /Saved preview/ })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.screenshot({
    path: testInfo.outputPath('metadata-library-desktop.png'),
    fullPage: true,
  });
  await card
    .getByRole('button', { name: 'Edit My reading guide', exact: true })
    .click();
  const editor = page.getByRole('dialog', { name: 'Edit bookmark' });
  await editor.getByRole('button', { name: 'Remove saved preview' }).click();
  await editor.getByRole('button', { name: 'Remove saved icon' }).click();
  await editor
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(card.getByRole('img', { name: /Saved preview/ })).toHaveCount(0);
});
