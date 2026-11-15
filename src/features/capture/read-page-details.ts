export interface PageDetails {
  url: string;
  description: string;
  favicon?: string;
  image?: string;
}
// Chrome serializes this function into the active tab, so every runtime helper must stay inside it.
export async function readPageDetails(): Promise<PageDetails> {
  const pageUrl = location.href,
    origin = location.origin;
  const description = (
    document.querySelector<HTMLMetaElement>('meta[name="description" i]')
      ?.content ??
    document.querySelector<HTMLMetaElement>('meta[property="og:description" i]')
      ?.content ??
    ''
  )
    .trim()
    .slice(0, 2000);
  function dimensions(
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
      const view = new DataView(
        bytes.buffer,
        bytes.byteOffset,
        bytes.byteLength,
      );
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
  function bounded(bytes: Uint8Array): boolean {
    const size = dimensions(bytes);
    if (size)
      return (
        size.width > 0 &&
        size.height > 0 &&
        size.width <= 2048 &&
        size.height <= 2048
      );
    if (
      bytes.length < 22 ||
      bytes[0] !== 0 ||
      bytes[1] !== 0 ||
      bytes[2] !== 1 ||
      bytes[3] !== 0
    )
      return false;
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength),
      count = view.getUint16(4, true);
    if (count < 1 || count > 20 || 6 + count * 16 > bytes.length) return false;
    for (let index = 0; index < count; index++) {
      const entry = 6 + index * 16,
        length = view.getUint32(entry + 8, true),
        start = view.getUint32(entry + 12, true);
      if (
        start < 6 + count * 16 ||
        length < 24 ||
        start + length > bytes.length
      )
        return false;
      const png = dimensions(bytes.subarray(start, start + length));
      if (png) {
        if (
          png.width < 1 ||
          png.height < 1 ||
          png.width > 256 ||
          png.height > 256
        )
          return false;
      } else {
        if (length < 40) return false;
        const width = view.getInt32(start + 4, true),
          height = view.getInt32(start + 8, true);
        if (width < 1 || width > 256 || height < 1 || height > 512)
          return false;
      }
    }
    return true;
  }
  async function image(
    raw: string | undefined,
    kind: 'icon' | 'preview',
  ): Promise<string | undefined> {
    if (!raw) return;
    let url: URL;
    try {
      url = new URL(raw, document.baseURI);
    } catch {
      return;
    }
    if (
      !['http:', 'https:'].includes(url.protocol) ||
      url.origin !== origin ||
      url.username ||
      url.password
    )
      return;
    const controller = new AbortController(),
      timer = setTimeout(() => controller.abort(), 3000);
    let bitmap: ImageBitmap | undefined;
    try {
      const response = await fetch(url.href, {
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        redirect: 'error',
        signal: controller.signal,
      });
      if (
        !response.ok ||
        Number(response.headers.get('content-length')) > 2 * 1024 * 1024 ||
        !response.body
      )
        return;
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let length = 0;
      while (true) {
        const part = await reader.read();
        if (part.done) break;
        length += part.value.byteLength;
        if (length > 2 * 1024 * 1024) {
          await reader.cancel();
          return;
        }
        chunks.push(part.value);
      }
      const bytes = new Uint8Array(length);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
      }
      if (!bounded(bytes)) return;
      const type =
        bytes[0] === 137
          ? 'image/png'
          : bytes[0] === 255
            ? 'image/jpeg'
            : 'image/x-icon';
      bitmap = await createImageBitmap(new Blob([bytes], { type }));
      if (
        !bitmap.width ||
        !bitmap.height ||
        bitmap.width > 2048 ||
        bitmap.height > 2048
      )
        return;
      const limit = kind === 'icon' ? 64 : 640,
        ratio = Math.min(1, limit / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio));
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio));
      const context = canvas.getContext('2d');
      if (!context) return;
      if (kind === 'preview') {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const result = canvas.toDataURL(
        kind === 'icon' ? 'image/png' : 'image/jpeg',
        0.7,
      );
      return result.length <= (kind === 'icon' ? 32_000 : 400_000)
        ? result
        : undefined;
    } catch {
      return;
    } finally {
      bitmap?.close();
      clearTimeout(timer);
    }
  }
  const favicon = await image(
    document.querySelector<HTMLLinkElement>('link[rel~="icon" i]')?.href ??
      document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon" i]')
        ?.href ??
      new URL('/favicon.ico', pageUrl).href,
    'icon',
  );
  const preview =
    document.querySelector<HTMLMetaElement>('meta[property="og:image" i]')
      ?.content ??
    document.querySelector<HTMLMetaElement>('meta[name="twitter:image" i]')
      ?.content;
  const savedImage = await image(preview, 'preview');
  if (location.href !== pageUrl) return { url: location.href, description: '' };
  return { url: pageUrl, description, favicon, image: savedImage };
}
