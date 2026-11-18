import { afterEach, beforeEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import { createAppearanceRepository, defaultAppearance } from './appearance';
const database = new OasisDatabase('oasis-appearance-test');
const repository = createAppearanceRepository('default', database);
beforeEach(() => database.open());
afterEach(() => database.delete());
it('returns defaults without writing and persists validated preferences', async () => {
  expect(await repository.get()).toEqual(defaultAppearance);
  expect(await database.preferences.count()).toBe(0);
  await repository.save({
    ...defaultAppearance,
    theme: 'dark',
    clock: '24',
    showDate: false,
  });
  const created = (await database.preferences.toArray())[0]!;
  await repository.save({ ...defaultAppearance, accent: 'ocean' });
  expect(await repository.get()).toEqual({
    ...defaultAppearance,
    accent: 'ocean',
  });
  expect(await database.preferences.count()).toBe(1);
  expect((await database.preferences.toArray())[0]?.createdAt).toBe(
    created.createdAt,
  );
});
it('rejects invalid settings and cross-space or deleted preference records', async () => {
  await expect(
    repository.save({ ...defaultAppearance, theme: 'invalid' as 'dark' }),
  ).rejects.toThrow('valid');
  expect(await database.preferences.count()).toBe(0);
  await database.transaction('rw', database.preferences, () =>
    database.preferences.put({
      ...defaultAppearance,
      id: 'default:appearance',
      spaceId: 'other',
      createdAt: 1,
      updatedAt: 1,
    }),
  );
  await expect(repository.save(defaultAppearance)).rejects.toThrow(
    'unavailable',
  );
  await expect(repository.get()).rejects.toThrow('unavailable');
  await database.transaction('rw', database.preferences, () =>
    database.preferences.update('default:appearance', {
      spaceId: 'default',
      deletedAt: 1,
    }),
  );
  await expect(repository.save(defaultAppearance)).rejects.toThrow(
    'unavailable',
  );
});

it('persists canonical custom colors, rejects invalid values and resets to presets', async () => {
  await repository.save({
    ...defaultAppearance,
    primaryColor: '#ABC',
    secondaryColor: '#000000',
  });
  expect(await repository.get()).toMatchObject({
    primaryColor: '#aabbcc',
    secondaryColor: '#000000',
  });
  await expect(
    repository.save({ ...defaultAppearance, primaryColor: 'red' }),
  ).rejects.toThrow('hex');
  expect((await repository.get()).primaryColor).toBe('#aabbcc');
  await repository.save({ ...defaultAppearance });
  expect((await repository.get()).primaryColor).toBeUndefined();
});

it('persists Links side/pinning and rejects unsupported placement', async () => {
  await repository.save({
    ...defaultAppearance,
    linksSide: 'right',
    linksPinned: true,
  });
  expect(await repository.get()).toMatchObject({
    linksSide: 'right',
    linksPinned: true,
  });
  await expect(
    repository.save({ ...defaultAppearance, linksSide: 'top' as 'left' }),
  ).rejects.toThrow('valid');
});

it('persists an optional search engine and rejects unknown providers', async () => {
  await repository.save({ ...defaultAppearance, searchEngine: 'duckduckgo' });
  expect((await repository.get()).searchEngine).toBe('duckduckgo');
  await expect(
    repository.save({
      ...defaultAppearance,
      searchEngine: 'unknown' as 'google',
    }),
  ).rejects.toThrow('appearance');
  expect((await repository.get()).searchEngine).toBe('duckduckgo');
});

it('keeps recent/frequent sections opt-in and preserves per-space choices', async () => {
  expect((await repository.get()).showRecentBookmarks ?? false).toBe(false);
  await repository.save({
    ...defaultAppearance,
    showRecentBookmarks: true,
    showFrequentBookmarks: true,
  });
  expect(await repository.get()).toMatchObject({
    showRecentBookmarks: true,
    showFrequentBookmarks: true,
  });
  await expect(
    repository.save({
      ...defaultAppearance,
      showRecentBookmarks: 'yes' as unknown as boolean,
    }),
  ).rejects.toThrow('valid');
});
it('stores optional Home background colors and rejects incomplete ones', async () => {
  await repository.save({
    ...defaultAppearance,
    homeBackground: 'gradient',
    backgroundFrom: '#ABC',
    backgroundTo: '#123456',
  });
  expect(await repository.get()).toMatchObject({
    homeBackground: 'gradient',
    backgroundFrom: '#aabbcc',
    backgroundTo: '#123456',
  });
  for (const invalid of [
    { homeBackground: 'gradient' as const, backgroundFrom: '#123456' },
    { homeBackground: 'color' as const },
    { homeBackground: 'color' as const, backgroundFrom: 'blue' },
    { homeBackground: 'image' as 'color', backgroundFrom: '#123456' },
  ])
    await expect(
      repository.save({ ...defaultAppearance, ...invalid }),
    ).rejects.toThrow('background');
});
it('stores optional font and text size, omitting defaults', async () => {
  await repository.save({
    ...defaultAppearance,
    font: 'serif',
    textSize: 'large',
  });
  expect(await repository.get()).toMatchObject({
    font: 'serif',
    textSize: 'large',
  });
  await repository.save({
    ...defaultAppearance,
    font: 'system',
    textSize: 'normal',
  });
  const saved = await repository.get();
  expect(saved).not.toHaveProperty('font');
  expect(saved).not.toHaveProperty('textSize');
  await expect(
    repository.save({ ...defaultAppearance, font: 'comic' as 'serif' }),
  ).rejects.toThrow('font');
});
it('stores the background blur choice only when enabled', async () => {
  await repository.save({ ...defaultAppearance, blurBackground: true });
  expect((await repository.get()).blurBackground).toBe(true);
  await repository.save({ ...defaultAppearance, blurBackground: false });
  expect(await repository.get()).not.toHaveProperty('blurBackground');
  await expect(
    repository.save({
      ...defaultAppearance,
      blurBackground: 'yes' as unknown as boolean,
    }),
  ).rejects.toThrow('valid');
});
