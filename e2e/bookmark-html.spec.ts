import { openLibraryTool } from './fixtures';
import { readFile } from 'node:fs/promises';
import { test, expect } from './fixtures';

const bookmarkHtml = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">
<TITLE>Bookmarks</TITLE><H1>Bookmarks</H1>
<DL><p>
<DT><H3 ADD_DATE="1">Work &amp; learning</H3>
<DL><p>
<DT><H3>Articles</H3>
<DL><p>
<DT><A HREF="https://example.com/?a=1&amp;b=2" ADD_DATE="2">A &lt;guide&gt; &amp; reference</A>
<DD>Notes &amp; details
<DT><A HREF="https://example.com/?a=1&amp;b=2">Duplicate</A>
<DT><A HREF="javascript:alert(1)">Unsafe</A>
<DT><A HREF="chrome://settings/">Internal</A>
<DT><A HREF="https://user:password@example.com">Credentials</A>
</DL><p>
</DL><p>
<DT><H3>Personal</H3>
<DL><p><DT><H3>Articles</H3><DL><p>
<DT><A HREF="https://personal.example.com">Personal article</A>
</DL><p></DL><p>
</DL><p>
<script>window.__importExecuted = true</script>
<img src="https://external.invalid/probe"><iframe src="https://external.invalid/frame"></iframe>`;

test('imports inert browser HTML, preserves paths and round trips an escaped export', async ({
  page,
  context,
}) => {
  let externalRequests = 0;
  await context.route('https://external.invalid/**', (route) => {
    externalRequests++;
    return route.abort();
  });
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await openLibraryTool(page, 'Backup and restore');
  const file = page.getByLabel('Choose bookmark HTML', { exact: true });
  await file.setInputFiles({
    name: 'bookmarks.html',
    mimeType: 'text/html',
    buffer: Buffer.from(bookmarkHtml),
  });
  await expect(
    page.getByText(/Ready: 3 bookmarks, 4 folders. Skipped 3 unsafe/),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () =>
        (window as unknown as { __importExecuted?: boolean }).__importExecuted,
    ),
  ).toBeUndefined();
  expect(externalRequests).toBe(0);
  await page
    .getByRole('button', { name: 'Import bookmarks', exact: true })
    .click();
  await expect(page.getByRole('status')).toHaveText(
    'Import complete. Added 2 bookmarks and 4 folders. Skipped 1 duplicates and 3 invalid links.',
  );
  const downloading = page.waitForEvent('download');
  await page
    .getByRole('button', { name: 'Download bookmark HTML', exact: true })
    .click();
  const download = await downloading;
  const exported = await readFile((await download.path())!, 'utf8');
  expect(exported).toContain('A &lt;guide&gt; &amp; reference');
  expect(exported).toContain('Notes &amp; details');
  expect(exported).not.toContain('javascript:');
  expect(exported).not.toContain('<script>');
  await file.setInputFiles({
    name: 'roundtrip.html',
    mimeType: 'text/html',
    buffer: Buffer.from(exported),
  });
  await expect(
    page.getByText(/Ready: 2 bookmarks, 4 folders. Skipped 0 unsafe/),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Import bookmarks', exact: true })
    .click();
  await expect(page.getByRole('status')).toHaveText(
    'Import complete. Added 0 bookmarks and 0 folders. Skipped 2 duplicates and 0 invalid links.',
  );
  await page.getByRole('button', { name: 'Close', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'More Library tools', exact: true }),
  ).toBeFocused();
  const folder = page.getByRole('combobox', {
    name: 'Filter by folder',
    exact: true,
  });
  await folder.selectOption({ label: 'Work & learning (1)' });
  await expect(
    page.getByRole('link', { name: /A <guide> & reference/ }),
  ).toBeVisible();
  await expect(
    page.getByRole('link', { name: /Personal article/ }),
  ).toHaveCount(0);
  await page.reload();
  await expect(
    page.getByRole('link', { name: /Personal article/ }),
  ).toBeVisible();
});

test('rejects files without a bookmark list and invalid folder structures before import', async ({
  page,
}) => {
  await page.goto('chrome://newtab/');
  await page.getByRole('link', { name: 'Library', exact: true }).click();
  await openLibraryTool(page, 'Backup and restore');
  const file = page.getByLabel('Choose bookmark HTML', { exact: true });
  await file.setInputFiles({
    name: 'invalid.html',
    mimeType: 'text/html',
    buffer: Buffer.from('<h1>Not bookmarks</h1>'),
  });
  await expect(page.getByRole('alert')).toContainText('bookmark list');
  await expect(
    page.getByRole('button', { name: 'Import bookmarks', exact: true }),
  ).toBeDisabled();
  await file.setInputFiles({
    name: 'invalid.html',
    mimeType: 'text/html',
    buffer: Buffer.from(
      '<DL><DT><H3></H3><DL><DT><A HREF="https://example.com">Example</A></DL></DL>',
    ),
  });
  await expect(page.getByRole('alert')).toContainText('folder names');
  await expect(
    page.getByRole('button', { name: 'Import bookmarks', exact: true }),
  ).toBeDisabled();
});
