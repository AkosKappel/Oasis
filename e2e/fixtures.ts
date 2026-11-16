import type { Page } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import { resolve } from 'node:path';

export const test = base.extend({
  context: async ({ playwright }, provideContext) => {
    const extensionPath = resolve(
      process.env.OASIS_EXTENSION_PATH ?? '.output/chrome-mv3',
    );
    const context = await playwright.chromium.launchPersistentContext('', {
      channel: 'chromium',
      headless: true,
      args: [
        `--disable-extensions-except=${extensionPath}`,
        `--load-extension=${extensionPath}`,
      ],
    });
    try {
      await provideContext(context);
    } finally {
      await context.close();
    }
  },
});
export { expect };

export async function openLibraryTool(page: Page, name: string) {
  const action = page.getByRole('button', { name, exact: true });
  if (!(await action.isVisible()))
    await page
      .getByRole('button', { name: 'More Library tools', exact: true })
      .click();
  await action.click();
}
export async function openLibraryFilters(page: Page) {
  if (
    !(await page
      .getByRole('combobox', { name: 'Collections', exact: true })
      .isVisible())
  )
    await page.getByText('Filters and collections', { exact: true }).click();
}
