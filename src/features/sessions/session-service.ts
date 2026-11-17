import { browser } from 'wxt/browser';
import { MAX_OPEN_TABS, sessionPreview, type SessionTab } from './session-tabs';
export async function readWindowTabs(api = browser) {
  if (!(await api.permissions.request({ permissions: ['tabs'] })))
    throw new Error('Tab access was not granted. Nothing was read or saved.');
  return sessionPreview(await api.tabs.query({ currentWindow: true }));
}
export async function openSession(
  rows: SessionTab[],
  signal: AbortSignal,
  progress: (count: number) => void,
  api = browser,
) {
  if (!rows.length || rows.length > MAX_OPEN_TABS)
    throw new Error('Choose a folder with between 1 and 50 unique links.');
  let opened = 0;
  for (const row of rows) {
    if (signal.aborted) break;
    try {
      await api.tabs.create({ url: row.url, active: false });
    } catch {
      throw new Error(
        `Opened ${opened} tabs. The browser could not open the next link. Tabs already opened are kept.`,
      );
    }
    progress(++opened);
  }
  return opened;
}
