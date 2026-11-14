import { expect, it } from 'vitest';
import { captureTab } from './capture-tab';

it('prefills a validated page and falls back to its hostname', () => {
  expect(
    captureTab({ title: ' Example ', url: 'https://example.com' }),
  ).toMatchObject({
    title: 'Example',
    url: 'https://example.com/',
    isFavorite: false,
  });
  expect(captureTab({ title: ' ', url: 'https://example.com' }).title).toBe(
    'example.com',
  );
});
it('rejects missing, internal, malformed and credential-bearing pages', () => {
  expect(() => captureTab()).toThrow('Open a website');
  for (const url of [
    'chrome://settings/',
    'about:blank',
    'file:///tmp/file',
    'not a url',
    'https://user:password@example.com',
  ])
    expect(() => captureTab({ url })).toThrow();
});
