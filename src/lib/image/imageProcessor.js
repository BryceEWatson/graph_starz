import { promises as fs } from 'fs';
import sharp from 'sharp';
import phash from 'sharp-phash';

export async function imageToBase64(buffer) {
  // Convert Buffer to base64 string
  if (!Buffer.isBuffer(buffer)) {
    buffer = Buffer.from(buffer);
  }
  return buffer.toString('base64');
}

/**
 * Process an image from either a file path or buffer
 * @param {string|Buffer|ArrayBuffer} input - File path or buffer containing image data
 * @returns {Promise<Object>} Processed image data
 */
export async function processImage(input) {
  let imageBuffer;
  
  if (typeof input === 'string') {
    // Input is a file path
    imageBuffer = await fs.readFile(input);
  } else if (input instanceof ArrayBuffer) {
    // Convert ArrayBuffer to Buffer
    imageBuffer = Buffer.from(input);
  } else if (Buffer.isBuffer(input)) {
    // Already a Buffer
    imageBuffer = input;
  } else {
    throw new Error('Input must be a file path, Buffer, or ArrayBuffer');
  }

  // Get pHash first for duplicate detection
  const pHash = await phash(imageBuffer);

  // Get image dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const { width, height } = metadata;

  // Process image sizes
  const processedImages = await Promise.all([
    sharp(imageBuffer)
      .resize(100, 100, { fit: 'cover' })
      .webp()
      .toBuffer()
      .then(data => ({ size: 'thumbnail', data: data.toString('base64'), isBase64: true, width: 100, height: 100 })),
    sharp(imageBuffer)
      .resize(800, 800, { fit: 'inside', withoutEnlargement: true })
      .webp()
      .toBuffer()
      .then(async data => {
        const resized = await sharp(data).metadata();
        return { size: 'preview', data: data.toString('base64'), isBase64: true, width: resized.width, height: resized.height };
      }),
    sharp(imageBuffer)
      .webp()
      .toBuffer()
      .then(data => ({ size: 'full', data: data.toString('base64'), isBase64: true, width, height }))
  ]);

  return {
    pHash,
    images: {
      thumbnail: processedImages[0],
      preview: processedImages[1],
      full: processedImages[2]
    }
  };
}
