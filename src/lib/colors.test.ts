import { expect, it } from 'vitest';
import {
  normalizeHex,
  whiteTextOverlay,
  contrastRatio,
  readableAccent,
  readableForeground,
} from './colors';
import {
  appearanceColors,
  themeSurfaces,
} from '@/features/appearance/apply-appearance';
import { defaultAppearance } from '@/database/appearance';
it('normalizes shorthand and rejects non-hex or injectable color values', () => {
  expect(normalizeHex(' #AbC ')).toBe('#aabbcc');
  expect(normalizeHex('#ABCDEF')).toBe('#abcdef');
  for (const value of [
    'red',
    '#abcd',
    '#123456; color:red',
    'url(example)',
    null,
    123,
  ])
    expect(normalizeHex(value)).toBeUndefined();
  expect(contrastRatio('#ffffff', '#000000')).toBe(21);
});
it('chooses readable foregrounds and focus/link colors for extreme custom colors in both themes', () => {
  for (const color of [
    '#000000',
    '#ffffff',
    '#ffff00',
    '#777777',
    '#ff00ff',
    '#00ffff',
    '#0f5030',
  ]) {
    expect(
      contrastRatio(color, readableForeground(color)),
    ).toBeGreaterThanOrEqual(4.5);
    for (const dark of [false, true]) {
      const accent = readableAccent(
        color,
        themeSurfaces[dark ? 'dark' : 'light'],
        dark,
      );
      for (const surface of themeSurfaces[dark ? 'dark' : 'light'])
        expect(contrastRatio(accent, surface)).toBeGreaterThanOrEqual(7);
      const resolved = appearanceColors(
        { ...defaultAppearance, primaryColor: color, secondaryColor: color },
        dark,
      );
      expect(resolved.primary).toBe(color);
      expect(resolved.secondary).toBe(color);
      expect(
        contrastRatio(resolved.primary, resolved.primaryForeground),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(resolved.secondary, resolved.secondaryForeground),
      ).toBeGreaterThanOrEqual(4.5);
    }
  }
});
it('keeps all preset foregrounds and link colors readable in both themes', () => {
  for (const accent of ['forest', 'ocean', 'plum', 'graphite'] as const)
    for (const dark of [false, true]) {
      const colors = appearanceColors({ ...defaultAppearance, accent }, dark);
      expect(
        contrastRatio(colors.primary, colors.primaryForeground),
      ).toBeGreaterThanOrEqual(4.5);
      expect(
        contrastRatio(colors.secondary, colors.secondaryForeground),
      ).toBeGreaterThanOrEqual(4.5);
      for (const surface of themeSurfaces[dark ? 'dark' : 'light'])
        expect(
          contrastRatio(colors.primaryContent, surface),
        ).toBeGreaterThanOrEqual(7);
    }
});
it('dims Home background colors just enough for white text', () => {
  expect(whiteTextOverlay(['#1d3d5c'])).toBe(0);
  const light = whiteTextOverlay(['#ffffff', '#f5e663']);
  expect(light).toBeGreaterThan(0.4);
  expect(light).toBeLessThanOrEqual(0.9);
  const dimmed = Math.round(255 * (1 - light))
    .toString(16)
    .padStart(2, '0');
  expect(
    contrastRatio('#ffffff', `#${dimmed.repeat(3)}`),
  ).toBeGreaterThanOrEqual(4.5);
});
