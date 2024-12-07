import { NextResponse } from 'next/server';
import sharp from 'sharp';
import { uploadToGCS, generateImageFilename } from '../../../../lib/storage/gcs';
import sharpPhash from 'sharp-phash';
import { formatHash } from '../../../../lib/utils/imageHash.js';

// Force Node.js runtime
export const runtime = 'nodejs';

const SIZES = {
  thumbnail: 100,
  preview: 400,
  full: 2048
};

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());
    
    // Get original metadata and perceptual hash
    const metadata = await sharp(buffer).metadata();
    const originalName = file.name;
    const binaryHash = await sharpPhash(buffer);
    const pHash = formatHash(binaryHash);

    // Process image in different sizes and upload to GCS
    const processedImages = await Promise.all(
      Object.entries(SIZES).map(async ([size, width]) => {
        // Process image
        const processedBuffer = await sharp(buffer)
          .resize({
            width,
            withoutEnlargement: true,
            fit: 'inside'
          })
          .webp({ quality: 80 })
          .toBuffer();

        // Generate filename using the original name for now (will be updated with AI title later)
        const filename = generateImageFilename(
          originalName.replace(/\.[^/.]+$/, ''), // Remove extension
          size
        );

        // Upload to GCS and get URL
        const { url: publicUrl, isNew } = await uploadToGCS(processedBuffer, filename);

        return {
          size,
          data: processedBuffer.toString('base64'),
          isBase64: true,
          metadata: {
            width: width,
            height: Math.round(width * (metadata.height / metadata.width)),
            format: 'webp',
            isNewUpload: isNew
          },
          publicUrl
        };
      })
    );

    return NextResponse.json({
      images: processedImages,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        originalName,
        pHash
      }
    });

  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image', details: error.message },
      { status: 500 }
    );
  }
}
