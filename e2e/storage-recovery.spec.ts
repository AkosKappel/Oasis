import { test, expect } from './fixtures';
test('keeps a failed save in its form and recovers after a quota failure', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Kept draft');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com');
  await page.evaluate(() => {
    const original = IDBObjectStore.prototype.add;
    IDBObjectStore.prototype.add = function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore['add']>
    ) {
      if (this.name === 'bookmarks') {
        IDBObjectStore.prototype.add = original;
        throw new DOMException('Storage quota exceeded', 'QuotaExceededError');
      }
      return Reflect.apply(original, this, args);
    };
  });
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText(
    'quota',
  );
  await expect(
    page.getByRole('textbox', { name: 'Title', exact: true }),
  ).toHaveValue('Kept draft');
  await expect(page.locator('[aria-label="Storage recovery"]')).toContainText(
    'Storage is full',
  );
  await page
    .getByRole('button', { name: 'Save bookmark', exact: true })
    .click();
  await expect(page.getByRole('link', { name: /Kept draft/ })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('link', { name: /Kept draft/ })).toBeVisible();
});
test('retries a failed storage read without a page reload or database reset', async ({
  page,
  context,
}) => {
  await context.addInitScript(() => {
    const original = IDBObjectStore.prototype.get;
    IDBObjectStore.prototype.get = function (
      this: IDBObjectStore,
      ...args: Parameters<IDBObjectStore['get']>
    ) {
      if (this.name === 'spaces') {
        IDBObjectStore.prototype.get = original;
        throw new DOMException('Storage unavailable', 'UnknownError');
      }
      return Reflect.apply(original, this, args);
    };
  });
  await page.goto('chrome://newtab/');
  const recovery = page.getByRole('region', { name: 'Storage recovery' });
  await expect(recovery).toContainText('Storage is unavailable');
  await recovery
    .getByRole('button', { name: 'Retry storage', exact: true })
    .click();
  await expect(recovery.getByRole('status')).toContainText(
    'Storage is reachable',
  );
  await recovery.getByRole('button', { name: 'Dismiss', exact: true }).click();
  await expect(recovery).toHaveCount(0);
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Add bookmark', exact: true }),
  ).toBeEnabled();
});

test('keeps an open draft when refreshing the space list fails', async ({
  page,
  context,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: 'Add bookmark', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'Title', exact: true })
    .fill('Retained during space refresh');
  await page
    .getByRole('textbox', { name: 'URL', exact: true })
    .fill('https://example.com/retained');
  await page.evaluate(() => {
    for (const method of ['getAll', 'openCursor'] as const) {
      const original = IDBObjectStore.prototype[method];
      Object.defineProperty(IDBObjectStore.prototype, method, {
        configurable: true,
        writable: true,
        value: function (this: IDBObjectStore, ...args: unknown[]) {
          if (this.name === 'spaces')
            throw new DOMException('Space list unavailable', 'UnknownError');
          return Reflect.apply(original, this, args);
        },
      });
    }
  });
  const other = await context.newPage();
  await other.goto(page.url());
  await other
    .getByRole('button', { name: 'Manage spaces', exact: true })
    .click();
  await other
    .getByRole('textbox', { name: 'New space name', exact: true })
    .fill('Reading');
  await other
    .getByRole('button', { name: 'Create space', exact: true })
    .click();
  await expect(
    page.locator('p[role="alert"]').filter({ hasText: /Spaces could not/ }),
  ).toBeAttached();
  await expect(
    page.getByRole('textbox', { name: 'Title', exact: true }),
  ).toHaveValue('Retained during space refresh');
  await other.close();
});
