import sharp from 'sharp';
import { NextResponse } from 'next/server';

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

    const buffer = Buffer.from(await file.arrayBuffer());
    const metadata = await sharp(buffer).metadata();

    // Convert to WebP and create different sizes
    const sizes = ['full', 'medium', 'thumbnail'];
    const processedImages = await Promise.all(
      sizes.map(async (size) => {
        let width;
        switch (size) {
          case 'medium':
            width = 800;
            break;
          case 'thumbnail':
            width = 200;
            break;
          default:
            width = metadata.width;
        }

        const processedBuffer = await sharp(buffer)
          .resize(width, null, {
            fit: 'inside',
            withoutEnlargement: true
          })
          .webp({ quality: 80 })
          .toBuffer();

        return {
          size,
          data: processedBuffer.toString('base64'),
          isBase64: true,
          metadata: {
            width: width,
            height: Math.round(width * (metadata.height / metadata.width)),
            format: 'webp'
          }
        };
      })
    );

    return NextResponse.json({
      images: processedImages,
      metadata: {
        originalName: file.name,
        width: metadata.width,
        height: metadata.height,
        format: metadata.format
      }
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 }
    );
  }
}
