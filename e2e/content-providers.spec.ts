import { readFile } from 'node:fs/promises';
import {
  axe,
  openSettingsPage,
  settleTransitions,
  test,
  expect,
} from './fixtures';

const feed = {
  image: {
    title: 'File:Sample lake.jpg',
    thumbnail: {
      source:
        'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/Sample_lake.jpg/960px-Sample_lake.jpg',
    },
    image: { width: 4000 },
    artist: { text: 'Sample Photographer' },
    license: {
      type: 'CC BY-SA 4.0',
      url: 'https://creativecommons.org/licenses/by-sa/4.0',
    },
    file_page: 'https://commons.wikimedia.org/wiki/File:Sample_lake.jpg',
  },
};

test('shows opt-in daily web content with attribution and fetches it once a day', async ({
  context,
  page,
}, testInfo) => {
  const png = await readFile('public/icon/128.png');
  const calls = { feed: 0, image: 0, quote: 0 };
  await context.route(
    'https://en.wikipedia.org/api/rest_v1/feed/featured/**',
    (route) => {
      calls.feed++;
      return route.fulfill({ json: feed });
    },
  );
  await context.route('https://thumb.wikimedia.org/**', (route) => {
    calls.image++;
    expect(route.request().url()).toContain('/1920px-Sample_lake.jpg');
    return route.fulfill({ contentType: 'image/png', body: png });
  });
  await context.route('https://zenquotes.io/**', (route) => {
    calls.quote++;
    return route.fulfill({
      json: [{ q: 'Small steps add up.', a: 'Sample Author' }],
    });
  });
  await context.addInitScript(() => {
    if (!location.protocol.endsWith('-extension:')) return;
    const api = (
      globalThis as unknown as {
        chrome: {
          permissions: {
            request: () => Promise<boolean>;
            contains: () => Promise<boolean>;
            remove: () => Promise<boolean>;
          };
        };
      }
    ).chrome;
    const key = 'oasis-test-quote-access';
    let requests = 0;
    api.permissions.request = async () => {
      requests++;
      const allowed = requests > 1;
      if (allowed) localStorage.setItem(key, 'yes');
      return allowed;
    };
    api.permissions.contains = async () => localStorage.getItem(key) === 'yes';
    api.permissions.remove = async () => {
      localStorage.removeItem(key);
      return true;
    };
  });
  await page.goto('chrome://newtab/');
  const main = page.locator('main');
  await expect(main).not.toHaveAttribute('data-background-image', /wikimedia/);
  expect(calls).toEqual({ feed: 0, image: 0, quote: 0 });

  await openSettingsPage(page, 'Image albums');
  const picture = page.getByRole('button', {
    name: 'Use the Wikimedia Commons picture of the day',
  });
  await expect(picture).toHaveAttribute('aria-pressed', 'false');
  await picture.click();
  await expect(picture).toHaveAttribute('aria-pressed', 'true');
  await openSettingsPage(page, 'Quote collections');
  const quote = page.getByRole('button', {
    name: 'Show the ZenQuotes quote of the day',
  });
  await quote.click();
  await expect(page.getByRole('alert')).toContainText('not granted');
  await expect(quote).toHaveAttribute('aria-pressed', 'false');
  await quote.click();
  await expect(quote).toHaveAttribute('aria-pressed', 'true');
  await settleTransitions(page);
  expect(
    (
      await axe(page)
        .include('[aria-labelledby="provider-quote-title"]')
        .analyze()
    ).violations,
  ).toEqual([]);
  await page.keyboard.press('Escape');

  await expect(main).toHaveAttribute('data-background-image', /^wikimedia:/);
  await expect(
    page.getByRole('link', { name: 'Picture of the day: Sample lake' }),
  ).toHaveAttribute(
    'href',
    'https://commons.wikimedia.org/wiki/File:Sample_lake.jpg',
  );
  await expect(page.getByRole('link', { name: 'CC BY-SA 4.0' })).toBeVisible();
  const daily = page.getByRole('figure', { name: 'Quote of the day' });
  await expect(daily).toContainText('Small steps add up.');
  await expect(
    daily.getByRole('link', { name: 'Quote from ZenQuotes' }),
  ).toHaveAttribute('href', 'https://zenquotes.io/');
  await page.screenshot({ path: testInfo.outputPath('daily-web-content.png') });

  await page.reload();
  await expect(main).toHaveAttribute('data-background-image', /^wikimedia:/);
  await expect(daily).toContainText('Small steps add up.');
  expect(calls.feed).toBe(1);
  expect(calls.quote).toBe(1);

  await openSettingsPage(page, 'Quote collections');
  await quote.click();
  await expect(quote).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Escape');
  await expect(daily).toHaveCount(0);
});

test('keeps the album background when the daily picture cannot load', async ({
  context,
  page,
}) => {
  await context.route(
    'https://en.wikipedia.org/api/rest_v1/feed/featured/**',
    (route) => route.fulfill({ json: feed }),
  );
  await context.route('https://thumb.wikimedia.org/**', (route) =>
    route.abort(),
  );
  await page.goto('chrome://newtab/');
  await openSettingsPage(page, 'Image albums');
  await page
    .getByRole('button', {
      name: 'Use the Wikimedia Commons picture of the day',
    })
    .click();
  await page.keyboard.press('Escape');
  await expect(page.locator('main')).not.toHaveAttribute(
    'data-background-image',
    /wikimedia/,
  );
  await expect(
    page.getByRole('link', { name: /Picture of the day/ }),
  ).toHaveCount(0);
});
