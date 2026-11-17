import AxeBuilder from '@axe-core/playwright';
import { openLibraryTool, test, expect, settleTransitions } from './fixtures';
test('checks only selected sites on demand and distinguishes HTTP outcomes without following redirects', async ({
  page,
  context,
}) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 1280, height: 1500 });
  const reads: { method: string; cookie?: string; referrer?: string }[] = [];
  let redirects = 0;
  await context.addCookies([
    {
      name: 'fixture',
      value: 'sample',
      domain: 'check.example',
      path: '/',
      secure: true,
    },
  ]);
  await context.route('https://check.example/**', async (route) => {
    const request = route.request(),
      headers = request.headers();
    reads.push({
      method: request.method(),
      cookie: headers.cookie,
      referrer: headers.referer,
    });
    const path = new URL(request.url()).pathname;
    const status =
      (
        {
          '/ok': 200,
          '/missing': 404,
          '/moved': 302,
          '/login': 403,
          '/unsupported': 405,
          '/server': 503,
        } as Record<string, number>
      )[path] ?? 500;
    await route.fulfill({
      status,
      headers: {
        'access-control-allow-origin': '*',
        ...(status === 302
          ? { location: 'https://redirected.example/target' }
          : {}),
      },
      body: '',
    });
  });
  await context.route('https://redirected.example/**', (route) => {
    redirects++;
    return route.abort();
  });
  await context.addInitScript(() => {
    if (!location.protocol.endsWith('-extension:')) return;
    const api = (
      globalThis as unknown as {
        chrome: {
          permissions: {
            request: (value: { origins: string[] }) => Promise<boolean>;
            contains: () => Promise<boolean>;
            remove: () => Promise<boolean>;
          };
        };
      }
    ).chrome;
    const state = { requests: [] as string[][], allowed: false };
    (
      globalThis as unknown as { linkCheckFixture: typeof state }
    ).linkCheckFixture = state;
    api.permissions.request = async ({ origins }) => {
      state.requests.push(origins);
      state.allowed = state.requests.length > 1;
      return state.allowed;
    };
    api.permissions.contains = async () => state.allowed;
    api.permissions.remove = async () => {
      state.allowed = false;
      return true;
    };
  });
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: 'Library', exact: true }),
  ).toBeVisible();
  await openLibraryTool(page, 'Backup and restore');
  const meta = { spaceId: 'default', createdAt: 1, updatedAt: 1 };
  const cases = [
    ['Working page', 'ok'],
    ['Missing page', 'missing'],
    ['Moved page', 'moved'],
    ['Login wall', 'login'],
    ['HEAD unsupported', 'unsupported'],
    ['Temporary server error', 'server'],
    ['Duplicate working page', 'ok'],
  ];
  await page.getByLabel('Choose a backup', { exact: true }).setInputFiles({
    name: 'checks.json',
    mimeType: 'application/json',
    buffer: Buffer.from(
      JSON.stringify({
        format: 'oasis',
        version: 1,
        spaceId: 'default',
        exportedAt: 1,
        folders: [],
        tags: [],
        bookmarks: cases.map(([title, path], index) => ({
          ...meta,
          id: `check${index}`,
          title,
          url: `https://check.example/${path}`,
          tags: [],
          isFavorite: false,
          isPinned: false,
          openCount: 0,
          sortOrder: index,
        })),
      }),
    ),
  });
  await page
    .getByRole('button', { name: 'Restore backup', exact: true })
    .click();
  await expect(
    page
      .getByRole('dialog', { name: 'Backup and restore' })
      .getByRole('status'),
  ).toContainText('Restore complete');
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await openLibraryTool(page, 'Check links');
  const dialog = page.getByRole('dialog', { name: 'Check links', exact: true });
  await expect(
    dialog.getByRole('button', { name: 'Check selected links' }),
  ).toBeDisabled();
  expect(reads).toEqual([]);
  await dialog.getByRole('button', { name: 'Select first 6' }).click();
  await dialog
    .getByRole('button', { name: 'Allow selected sites', exact: true })
    .click();
  await expect(dialog.getByRole('alert')).toContainText('not granted');
  expect(reads).toEqual([]);
  await dialog
    .getByRole('button', { name: 'Allow selected sites', exact: true })
    .click();
  await expect(dialog.getByRole('status')).toContainText('Site access allowed');
  expect(reads).toEqual([]);
  expect(
    await page.evaluate(
      () =>
        (
          globalThis as unknown as {
            linkCheckFixture: { requests: string[][] };
          }
        ).linkCheckFixture.requests,
    ),
  ).toEqual([['https://check.example/*'], ['https://check.example/*']]);
  await dialog
    .getByRole('button', { name: 'Check selected links', exact: true })
    .click();
  await expect(dialog.getByRole('status')).toHaveText(
    'Completed after 6 of 6 checks.',
  );
  const results = dialog.getByRole('region', { name: 'Link check results' });
  for (const label of [
    'Responded (200)',
    'Not found (404)',
    'Redirect, not followed',
    'Login required or access blocked (403)',
    'HEAD not supported (405)',
    'Server error (503)',
  ])
    await expect(results.getByText(label, { exact: true })).toBeVisible();
  expect(reads).toHaveLength(6);
  expect(
    reads.every(
      (read) => read.method === 'HEAD' && !read.cookie && !read.referrer,
    ),
  ).toBe(true);
  expect(redirects).toBe(0);
  await settleTransitions(page);
  expect(
    (await new AxeBuilder({ page }).include('dialog').analyze()).violations,
  ).toEqual([]);
  const previews = process.env.OASIS_PREVIEW_DIR ?? '/tmp/oasis-previews';
  await dialog.screenshot({ path: previews + '/link-check-results.png' });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(
    await dialog.evaluate((node) => node.scrollWidth <= node.clientWidth),
  ).toBe(true);
  await page.screenshot({ path: previews + '/link-check-mobile.png' });
  await dialog
    .getByRole('button', { name: 'Check selected links', exact: true })
    .click();
  await expect(
    dialog.getByRole('button', { name: 'Stop checks', exact: true }),
  ).toBeVisible();
  await dialog
    .getByRole('button', { name: 'Stop checks', exact: true })
    .click();
  await expect(dialog.getByRole('status')).toContainText('Stopped after');
  const beforeRevocation = reads.length;
  page.once('dialog', (prompt) => prompt.accept());
  await dialog
    .getByRole('button', { name: 'Remove selected site access' })
    .click();
  await expect(dialog.getByRole('status')).toContainText('access removed');
  await dialog.getByRole('button', { name: 'Check selected links' }).click();
  await expect(dialog.getByRole('status')).toHaveText(
    'Completed after 6 of 6 checks.',
  );
  await expect(
    results.getByText('Site access not allowed', { exact: true }),
  ).toHaveCount(6);
  expect(reads).toHaveLength(beforeRevocation);
  await dialog.getByRole('button', { name: 'Done', exact: true }).click();
  await page.reload();
  await expect(page.locator('[data-bookmark-id]')).toHaveCount(7);
});
