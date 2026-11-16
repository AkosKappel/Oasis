import type { Page } from '@playwright/test';
import { test as base, expect } from '@playwright/test';
import { resolve } from 'node:path';

export const test = base.extend<{ skipSetup: boolean }>({
  skipSetup: [true, { option: true }],
  context: async ({ playwright, skipSetup }, provideContext) => {
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
      if (skipSetup) {
        const warmup = await context.newPage();
        await warmup.goto('chrome://newtab/');
        const welcome = warmup.getByRole('dialog', {
          name: 'Welcome to Oasis',
        });
        await welcome.waitFor({ state: 'visible' });
        await welcome
          .getByRole('button', { name: 'Skip setup', exact: true })
          .click();
        await expect(welcome).toHaveCount(0);
        await warmup.close();
      }
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

export async function openSettingsPage(page: Page, name: string) {
  if (
    !(await page
      .getByRole('button', { name: 'Close settings', exact: true })
      .isVisible())
  )
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
  const mobile = page.getByRole('combobox', {
    name: 'Settings section',
    exact: true,
  });
  if (await mobile.isVisible()) await mobile.selectOption({ label: name });
  else
    await page
      .getByRole('navigation', { name: 'Settings sections' })
      .getByRole('button', { name, exact: true })
      .click();
}
