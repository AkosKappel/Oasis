import { describe, expect, it } from 'vitest';
import { parseLinkText } from './parse-link-text';

const links = (text: string, folder?: string) =>
  parseLinkText(text, folder).bookmarks.map(({ input, folder }) => [
    input.url,
    input.title,
    folder,
  ]);

describe('parseLinkText', () => {
  it('reads plain URLs, Markdown, CSV, TSV and "url | title" lines', () => {
    expect(
      links(
        [
          'https://a.example/',
          '- [Docs](https://b.example/docs)',
          'title,url',
          '"Hello, world",https://c.example/',
          'https://d.example/\tTabbed',
          'https://e.example/ | OneTab title',
          'See https://f.example/page.',
        ].join('\n'),
      ),
    ).toEqual([
      ['https://a.example/', 'a.example', undefined],
      ['https://b.example/docs', 'Docs', undefined],
      ['https://c.example/', 'Hello, world', undefined],
      ['https://d.example/', 'Tabbed', undefined],
      ['https://e.example/', 'OneTab title', undefined],
      ['https://f.example/page', 'See', undefined],
    ]);
  });

  it('reads nested JSON exports and skips duplicates', () => {
    const json = JSON.stringify({
      children: [
        { title: 'One', uri: 'https://one.example/' },
        { name: 'Two', url: 'https://two.example/' },
        'https://one.example/',
      ],
    });
    expect(links(json)).toEqual([
      ['https://one.example/', 'One', undefined],
      ['https://two.example/', 'Two', undefined],
    ]);
  });

  it('puts links in the chosen folder and counts unsafe ones', () => {
    const plan = parseLinkText(
      'https://ok.example/\n[x](javascript:alert(1))\nhttp://[bad/',
      ' Reading ',
    );
    expect(plan.folders).toEqual([
      { name: 'Reading', parent: undefined, createdAt: undefined },
    ]);
    expect(plan.bookmarks).toHaveLength(1);
    expect(plan.bookmarks[0]!.folder).toBe(0);
    expect(plan.skipped).toBe(1);
  });

  it('explains when nothing can be imported', () => {
    expect(() => parseLinkText('just words')).toThrow('No links found');
  });
});
