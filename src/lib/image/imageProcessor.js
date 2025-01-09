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
 * @param {Object} options - Processing options
 * @param {string} options.filename - Original filename
 * @param {string} options.contentType - Content type of the image
 * @returns {Promise<Object>} Processed image data
 */
export async function processImage(input, { _filename = 'image.webp', _contentType = 'image/webp' } = {}) {
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
  // Convert pHash to string if it's an object
  const pHashString = typeof pHash === 'object' ? pHash.toString() : pHash;

  // Get image dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const { width, height } = metadata;

  // Process image sizes
  const processedImages = await Promise.all([
    // Graph view size (160px width)
    sharp(imageBuffer)
      .resize(160, null, { fit: 'inside', withoutEnlargement: true })
      .webp()
      .toBuffer(),
    // Preview size (400px width)
    sharp(imageBuffer)
      .resize(400, null, { fit: 'inside', withoutEnlargement: true })
      .webp()
      .toBuffer(),
    // Full size (2048px width max)
    sharp(imageBuffer)
      .resize(2048, null, { fit: 'inside', withoutEnlargement: true })
      .webp()
      .toBuffer()
  ]);

  const [graphBuffer, previewBuffer, fullBuffer] = processedImages;

  // Convert full size to base64 for AI analysis
  const fullBase64 = `data:image/webp;base64,${fullBuffer.toString('base64')}`;

  return {
    pHash: pHashString,
    width,
    height,
    images: {
      graphUrl: {
        data: graphBuffer,
        width: 160,
        height: Math.round(height * (160 / width))
      },
      preview: {
        data: previewBuffer,
        width: 400,
        height: Math.round(height * (400 / width))
      },
      full: {
        data: fullBase64,
        width,
        height
      }
    },
    contentType: 'image/webp'
  };
}
