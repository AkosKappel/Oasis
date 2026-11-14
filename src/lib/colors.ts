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
