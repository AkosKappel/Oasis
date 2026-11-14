import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures';
test('edits local quote collections, rotates daily and supports portable backups', async ({
  page,
  context,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('button', { name: 'Quotes', exact: true }).click();
  await page
    .getByRole('textbox', { name: 'New collection name', exact: true })
    .fill('Personal reminders');
  await page
    .getByRole('button', { name: 'Create collection', exact: true })
    .click();
  await page
    .getByRole('textbox', { name: 'Quote', exact: true })
    .fill('Make room for what matters.');
  await page
    .getByRole('textbox', { name: 'Author (optional)', exact: true })
    .fill('Personal note');
  await page.getByRole('button', { name: 'Add quote', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Quote saved.');
  await page
    .getByRole('button', { name: 'Show daily on Home', exact: true })
    .click();
  await expect(page.getByRole('status')).toHaveText(
    'This collection is shown on Home.',
  );
  const downloading = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download quote backup', exact: true })
    .click();
  const download = await downloading;
  const archive = JSON.parse(await readFile((await download.path())!, 'utf8'));
  expect(archive.quotes[0].author).toBe('Personal note');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByLabel('Restore quote backup', { exact: true }).setInputFiles({
    name: 'quotes.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(archive)),
  });
  await expect(page.getByRole('status')).toHaveText('Quotes restored.');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('figure', { name: 'Daily quote' })).toContainText(
    'Make room for what matters.',
  );
  await page.reload();
  await expect(page.getByRole('figure', { name: 'Daily quote' })).toContainText(
    'Personal note',
  );
  const other = await context.newPage();
  await other.goto(page.url());
  await expect(
    other.getByRole('figure', { name: 'Daily quote' }),
  ).toContainText('Make room for what matters.');
  await other.close();
  await page.screenshot({ path: '/tmp/oasis-previews/home-quote.png' });
  await page.getByRole('button', { name: 'Quotes', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Edit quote Make room for what matters.',
      exact: true,
    })
    .click();
  await page
    .getByRole('textbox', { name: 'Quote', exact: true })
    .fill('Keep it simple.');
  await page.getByRole('button', { name: 'Save quote', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Quote saved.');
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('figure', { name: 'Daily quote' })).toContainText(
    'Keep it simple.',
  );
  await page.getByRole('button', { name: 'Quotes', exact: true }).click();
  page.once('dialog', (dialog) => dialog.accept());
  await page
    .getByRole('button', { name: 'Delete collection', exact: true })
    .click();
  await page.getByRole('button', { name: 'Done', exact: true }).click();
  await expect(page.getByRole('figure', { name: 'Daily quote' })).toHaveCount(
    0,
  );
});
