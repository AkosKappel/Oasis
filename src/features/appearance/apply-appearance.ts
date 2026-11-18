import type { Appearance } from '@/database/appearance';
import { readableAccent, readableForeground } from '@/lib/colors';
const presets = {
  forest: { light: ['#286443', '#e4eee7'], dark: ['#85c9a4', '#273f34'] },
  ocean: { light: ['#225d88', '#e3edf6'], dark: ['#8ebde5', '#263b50'] },
  plum: { light: ['#75457e', '#f1e5f2'], dark: ['#d7a5df', '#44324a'] },
};
export const themeSurfaces = {
  light: ['#f5f9f6', '#ffffff'],
  dark: ['#111b17', '#1c2822'],
};
export function appearanceColors(appearance: Appearance, dark: boolean) {
  const palette = presets[appearance.accent][dark ? 'dark' : 'light'];
  const primary = appearance.primaryColor ?? palette[0]!;
  const secondary = appearance.secondaryColor ?? palette[1]!;
  return {
    primary,
    secondary,
    primaryForeground: readableForeground(primary),
    secondaryForeground: readableForeground(secondary),
    primaryContent: readableAccent(
      primary,
      themeSurfaces[dark ? 'dark' : 'light'],
      dark,
    ),
  };
}
// System font stacks only: nothing is downloaded and every platform has a match.
export const fontStacks = {
  system: 'system-ui, sans-serif',
  serif: "Charter, 'Bitstream Charter', 'Sitka Text', Cambria, Georgia, serif",
  rounded:
    "ui-rounded, 'Hiragino Maru Gothic ProN', Quicksand, Comfortaa, Manjari, 'Arial Rounded MT', system-ui, sans-serif",
  mono: "ui-monospace, 'Cascadia Code', 'Source Code Pro', Menlo, Consolas, monospace",
} as const;
// Percentages keep the browser's own text size as the base.
const textSizes = { small: '87.5%', normal: '', large: '112.5%' } as const;
export function applyAppearance(appearance: Appearance, systemDark: boolean) {
  const dark =
    appearance.theme === 'system' ? systemDark : appearance.theme === 'dark';
  const root = document.documentElement;
  root.dataset.theme = dark ? 'dark' : 'light';
  root.dataset.accent = appearance.accent;
  const colors = appearanceColors(appearance, dark);
  for (const [key, value] of Object.entries({
    '--primary': colors.primary,
    '--primary-foreground': colors.primaryForeground,
    '--primary-content': colors.primaryContent,
    '--secondary': colors.secondary,
    '--secondary-foreground': colors.secondaryForeground,
    '--ring': colors.primaryContent,
  }))
    root.style.setProperty(key, value);
  root.style.fontFamily = fontStacks[appearance.font ?? 'system'];
  root.style.fontSize = textSizes[appearance.textSize ?? 'normal'];
}
