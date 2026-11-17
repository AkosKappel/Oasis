import { afterEach, beforeEach, expect, it } from 'vitest';
import { OasisDatabase } from './schema';
import {
  createContentProviderRepository,
  parsePicture,
  parseQuote,
} from './content-providers';
const database = new OasisDatabase('content-providers-test');
const providers = createContentProviderRepository('default', database);
beforeEach(() => database.open());
afterEach(() => database.delete());
const feed = {
  image: {
    title: 'File:Lake <b>at</b> dawn.jpg',
    thumbnail: {
      source:
        'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/Lake.jpg/960px-Lake.jpg?utm_source=x',
    },
    image: {
      source: 'https://upload.wikimedia.org/wikipedia/commons/e/e0/Lake.jpg',
      width: 4000,
    },
    artist: { text: '<a href="x">Sample Author</a>' },
    license: {
      type: 'CC BY-SA 4.0',
      url: 'https://creativecommons.org/licenses/by-sa/4.0',
    },
    file_page: 'https://commons.wikimedia.org/wiki/File:Lake.jpg',
  },
};

it('reads a background-sized Wikimedia picture with attribution and rejects other hosts', () => {
  expect(parsePicture(feed, '2026-11-17')).toEqual({
    day: '2026-11-17',
    title: 'Lake at dawn',
    url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e0/Lake.jpg/1920px-Lake.jpg?utm_source=x',
    artist: 'Sample Author',
    license: 'CC BY-SA 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0',
    filePage: 'https://commons.wikimedia.org/wiki/File:Lake.jpg',
  });
  const small = structuredClone(feed);
  small.image.image.width = 1000;
  expect(parsePicture(small, 'd').url).toContain('/960px-Lake.jpg');
  const foreign = structuredClone(feed);
  foreign.image.thumbnail.source = 'https://example.com/Lake.jpg';
  expect(() => parsePicture(foreign, 'd')).toThrow('not available');
  expect(() => parsePicture({}, 'd')).toThrow('not available');
});

it('reads one ZenQuotes quote and ignores rate-limit placeholders', () => {
  expect(
    parseQuote([{ q: 'Keep <b>going</b>.', a: 'Someone', h: '<x>' }], 'd'),
  ).toEqual({ day: 'd', text: 'Keep going.', author: 'Someone' });
  expect(() =>
    parseQuote(
      [
        {
          q: 'Too many requests. Obtain an auth key from zenquotes.io',
          a: 'zenquotes.io',
        },
      ],
      'd',
    ),
  ).toThrow('not available');
  expect(() => parseQuote([], 'd')).toThrow('not available');
});

it('claims each enabled source once per day and forgets cached items when turned off', async () => {
  expect(await providers.get()).toMatchObject({ picture: false, quote: false });
  expect(await providers.claim('picture', 'd1', 1_000_000)).toBe(false);
  await providers.setEnabled('picture', true);
  expect(await providers.claim('picture', 'd1', 1_000_000)).toBe(true);
  expect(await providers.claim('picture', 'd1', 1_030_000)).toBe(false);
  expect(await providers.claim('picture', 'd1', 1_061_000)).toBe(true);
  const picture = parsePicture(feed, 'd1');
  await providers.storePicture(picture);
  expect((await providers.get()).dailyPicture).toEqual(picture);
  expect(await providers.claim('picture', 'd1', 2_000_000)).toBe(false);
  expect(await providers.claim('picture', 'd2', 2_000_000)).toBe(true);
  await providers.storeQuote({ day: 'd1', text: 'Ignored', author: 'A' });
  expect((await providers.get()).dailyQuote).toBeUndefined();
  await providers.setEnabled('picture', false);
  expect((await providers.get()).dailyPicture).toBeUndefined();
  await expect(
    providers.setEnabled('weather' as 'quote', true),
  ).rejects.toThrow('valid');
});
