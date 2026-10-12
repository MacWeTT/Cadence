export interface SquareCrop {
  sx: number;
  sy: number;
  side: number;
}

/** The centred square of a picture: its shorter side, taken from the middle of the longer one. */
export const squareCrop = (width: number, height: number): SquareCrop => {
  const side = Math.min(width, height);

  return { sx: Math.floor((width - side) / 2), sy: Math.floor((height - side) / 2), side };
};

/** Larger squares are scaled down, so a phone's 12-megapixel photo stays a sensible size to store and to show. */
const MAX_SIDE = 2048;

/**
 * Crops a picture to its centred square in the browser, and keeps its kind (a PNG stays a PNG, anything else is saved
 * as a JPEG). There is no cropper yet: a person who wants a different part crops before uploading.
 */
export const cropToSquare = async (file: File): Promise<File> => {
  const bitmap = await createImageBitmap(file);
  const { width, height } = bitmap;
  const { sx, sy, side } = squareCrop(width, height);
  const size = Math.min(side, MAX_SIDE);
  const canvas = new OffscreenCanvas(size, size);
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('No canvas');
  }

  context.drawImage(bitmap, sx, sy, side, side, 0, 0, size, size);
  bitmap.close();

  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await canvas.convertToBlob({ type, quality: 0.9 });

  return new File([blob], file.name, { type });
};
