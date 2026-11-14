import { validateImage, type PreparedImage } from '@/database/albums';

export async function prepareImage(file: File): Promise<PreparedImage> {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 20 * 1024 * 1024
  )
    throw new Error('Choose JPEG, PNG or WebP files smaller than 20 MB.');
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width * bitmap.height > 40_000_000)
      throw new Error('Choose images smaller than 40 megapixels.');
    const scale = Math.min(1, 2560 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Images cannot be prepared in this browser.');
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    return validateImage({
      name: file.name.slice(0, 120) || 'Image',
      dataUrl: canvas.toDataURL('image/jpeg', 0.85),
      width: canvas.width,
      height: canvas.height,
    });
  } finally {
    bitmap.close();
  }
}
export async function verifyArchivedImages(images: PreparedImage[]) {
  for (const image of images) {
    validateImage(image);
    const blob = await (await fetch(image.dataUrl)).blob();
    const bitmap = await createImageBitmap(blob);
    try {
      if (bitmap.width !== image.width || bitmap.height !== image.height)
        throw new Error('An image in this backup has invalid dimensions.');
    } finally {
      bitmap.close();
    }
  }
}
