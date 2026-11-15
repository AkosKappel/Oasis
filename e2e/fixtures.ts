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
