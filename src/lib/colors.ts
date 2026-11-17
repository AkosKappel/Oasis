export function normalizeHex(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  const input = value.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(input)) return input;
  if (/^#[0-9a-f]{3}$/.test(input))
    return `#${[...input.slice(1)].map((part) => part + part).join('')}`;
}
function channels(color: string) {
  return [1, 3, 5].map((index) => parseInt(color.slice(index, index + 2), 16));
}
export function luminance(color: string): number {
  const linear = channels(color).map((value) => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return linear[0]! * 0.2126 + linear[1]! * 0.7152 + linear[2]! * 0.0722;
}
export function contrastRatio(first: string, second: string): number {
  const a = luminance(first);
  const b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function readableForeground(color: string): string {
  return contrastRatio(color, '#000000') >= contrastRatio(color, '#ffffff')
    ? '#000000'
    : '#ffffff';
}
export function readableAccent(
  color: string,
  backgrounds: string[],
  dark: boolean,
): string {
  const rgb = channels(color);
  const target = dark ? 255 : 0;
  for (let step = 0; step <= 100; step++) {
    const candidate = `#${rgb
      .map((value) =>
        Math.round(value + ((target - value) * step) / 100)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')}`;
    if (
      backgrounds.every(
        (background) => contrastRatio(candidate, background) >= 7,
      )
    )
      return candidate;
  }
  return dark ? '#ffffff' : '#000000';
}

/**
 * Smallest black overlay (0 to 0.9) that keeps white text at 4.5:1 on every color,
 * so a custom Home background can reuse the light-on-photo text style.
 */
export function whiteTextOverlay(colors: string[]): number {
  for (let step = 0; step <= 18; step++) {
    const alpha = step / 20;
    if (
      colors.every((color) => {
        const dimmed = `#${channels(color)
          .map((value) =>
            Math.round(value * (1 - alpha))
              .toString(16)
              .padStart(2, '0'),
          )
          .join('')}`;
        return contrastRatio('#ffffff', dimmed) >= 4.5;
      })
    )
      return alpha;
  }
  return 0.9;
}
