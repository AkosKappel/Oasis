export const MAX_ICON_CHARACTERS = 32_000;
export const MAX_PREVIEW_CHARACTERS = 400_000;
export const MAX_BOOKMARK_MEDIA_CHARACTERS = 4 * 1024 * 1024;
export function rasterDimensions(
  bytes: Uint8Array,
): { width: number; height: number } | undefined {
  if (
    bytes.length >= 24 &&
    bytes[0] === 137 &&
    bytes[1] === 80 &&
    bytes[2] === 78 &&
    bytes[3] === 71 &&
    bytes[12] === 73 &&
    bytes[13] === 72 &&
    bytes[14] === 68 &&
    bytes[15] === 82
  ) {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    return { width: view.getUint32(16), height: view.getUint32(20) };
  }
  if (bytes[0] !== 255 || bytes[1] !== 216) return;
  let offset = 2;
  while (offset + 4 <= bytes.length) {
    if (bytes[offset++] !== 255) continue;
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 218 || marker === 217) return;
    if (
      marker === 0 ||
      marker === 216 ||
      marker === 1 ||
      (marker !== undefined && marker >= 208 && marker <= 215)
    )
      continue;
    const length = (bytes[offset]! << 8) | bytes[offset + 1]!;
    if (length < 2 || offset + length > bytes.length) return;
    if (
      marker !== undefined &&
      [
        192, 193, 194, 195, 197, 198, 199, 201, 202, 203, 205, 206, 207,
      ].includes(marker) &&
      length >= 7
    )
      return {
        height: (bytes[offset + 3]! << 8) | bytes[offset + 4]!,
        width: (bytes[offset + 5]! << 8) | bytes[offset + 6]!,
      };
    offset += length;
  }
}
export function safeBookmarkMedia(
  value: unknown,
  kind: 'icon' | 'preview',
): string | undefined {
  if (
    typeof value !== 'string' ||
    value.length >
      (kind === 'icon' ? MAX_ICON_CHARACTERS : MAX_PREVIEW_CHARACTERS) ||
    !/^data:image\/(?:png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)
  )
    return;
  try {
    const bytes = Uint8Array.from(
      atob(value.slice(value.indexOf(',') + 1)),
      (character) => character.charCodeAt(0),
    );
    const size = rasterDimensions(bytes),
      limit = kind === 'icon' ? 256 : 1024;
    if (
      size &&
      size.width > 0 &&
      size.height > 0 &&
      size.width <= limit &&
      size.height <= limit &&
      ((value.startsWith('data:image/png;') && bytes[0] === 137) ||
        (value.startsWith('data:image/jpeg;') && bytes[0] === 255))
    )
      return value;
  } catch {
    return;
  }
}
export function validateBookmarkMedia(
  value: unknown,
  kind: 'icon' | 'preview',
): string | undefined {
  if (value === undefined || value === '') return;
  const result = safeBookmarkMedia(value, kind);
  if (!result)
    throw new Error(`Use a small local PNG or JPEG for the saved ${kind}.`);
  return result;
}
type MediaRecord = { favicon?: string; image?: string };
export function bookmarkMediaCharacters(records: MediaRecord[]) {
  return records.reduce(
    (total, record) =>
      total +
      [record.favicon, record.image].reduce(
        (sum, value) => sum + (value?.startsWith('data:') ? value.length : 0),
        0,
      ),
    0,
  );
}
export function assertBookmarkMediaBudget(
  records: MediaRecord[],
  previous: MediaRecord[] = [],
) {
  const total = bookmarkMediaCharacters(records);
  if (
    total > MAX_BOOKMARK_MEDIA_CHARACTERS &&
    total > bookmarkMediaCharacters(previous)
  )
    throw new Error(
      'Saved page images are full in this space. Remove saved images from bookmarks before adding more.',
    );
}
