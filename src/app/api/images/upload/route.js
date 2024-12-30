import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { findUserById } from '@/lib/neo4j/userRepository';
import { findSimilarImage } from '@/lib/neo4j/imageRepository';
import { authOptions } from '../../auth/[...nextauth]/options';
import { uploadToGCS } from '@/lib/storage/gcs';
import { analyzeImage } from '@/lib/image/imageAnalyzer';
import { saveImageData } from '@/lib/neo4j/imageRepository';
import { processImage } from '@/lib/image/imageProcessor';
import debug from 'debug';

const log = debug('app:api:upload');

// Force Node.js runtime
export const runtime = 'nodejs';

export async function POST(request) {
    try {
        // Get user session
        const session = await getServerSession(authOptions);
        log('Session data:', session);
        
        // Get user ID from session
        const userId = session?.providerId || session?.user?.id;
        log('Extracted userId:', userId);
        
        if (!userId) {
            log('No user ID found in session');
            return NextResponse.json(
                { error: 'Unauthorized: Missing user ID' },
                { status: 401 }
            );
        }

        // Verify user exists in database
        const user = await findUserById(userId);
        if (!user) {
            log('User not found in database:', userId);
            return NextResponse.json(
                { error: 'Unauthorized: User not found' },
                { status: 401 }
            );
        }
        log('Found user:', user);

        log('Processing upload for user:', userId);
        
        // Get the file and optional ID from the request
        const formData = await request.formData();
        const file = formData.get('file');
        const imageId = formData.get('id');
        
        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Get content type from file
        const contentType = file.type || 'image/webp';

        // Process image into different sizes and get pHash first
        log('Processing image and generating pHash...');
        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        
        try {
            // Process image and get pHash
            const processedImage = await processImage(buffer, { contentType });
            const { pHash, width, height, images } = processedImage;
            
            // Check for duplicates before proceeding with expensive operations
            log('Checking for duplicates with pHash:', pHash);
            const existingImageId = await findSimilarImage(pHash);
            if (existingImageId) {
                log('Duplicate image detected:', existingImageId);
                return NextResponse.json({
                    error: 'Duplicate image detected',
                    message: 'This image (or a very similar one) has already been uploaded.',
                    existingImageId
                }, { status: 409 }); // HTTP 409 Conflict
            }

            // Analyze image with Anthropic using original buffer
            log('Analyzing image...');
            const analysis = await analyzeImage(buffer, contentType);

            // Generate filenames using provided ID or title
            const baseFilename = imageId || analysis.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
            const thumbnailFilename = `${baseFilename}-thumbnail.webp`;
            const previewFilename = `${baseFilename}-preview.webp`;
            const fullFilename = `${baseFilename}-full.webp`;

            // Upload all sizes to GCS
            log('Uploading images to GCS...');
            const [thumbnailUpload, previewUpload, fullUpload] = await Promise.all([
                uploadToGCS(images.thumbnail.data, thumbnailFilename),
                uploadToGCS(images.preview.data, previewFilename),
                // Convert base64 to buffer for full image
                uploadToGCS(Buffer.from(images.full.data.split(',')[1], 'base64'), fullFilename)
            ]);

            if (!thumbnailUpload.isNew || !previewUpload.isNew || !fullUpload.isNew) {
                return NextResponse.json({
                    error: 'Duplicate image detected',
                    message: 'This image (or a very similar one) has already been uploaded.',
                    existingUrl: fullUpload.url
                }, { status: 409 }); // HTTP 409 Conflict
            }

            // Save to Neo4j with all metadata
            const imageData = {
                url: fullUpload.publicUrl,
                thumbnailUrl: thumbnailUpload.publicUrl,
                previewUrl: previewUpload.publicUrl,
                width,
                height,
                pHash,
                name: analysis.title,
                description: analysis.description,
                originalName: file.name,
                contentType
            };

            // Save to database
            const _savedImage = await saveImageData(imageData, {
                title: analysis.title,
                description: analysis.description,
                colors: analysis.dominantColors,
                objects: analysis.objects,
                styles: analysis.style
            }, userId, imageId);

            // Return success response with image data
            return NextResponse.json({
                metadata: imageData,
                analysis,
                urls: {
                    full: imageData.url,
                    thumbnail: imageData.thumbnailUrl,
                    preview: imageData.previewUrl
                }
            });

        } catch (error) {
            log('Error in upload route:', error);
            return NextResponse.json(
                { error: 'Internal server error', details: error.message },
                { status: 500 }
            );
        }

    } catch (error) {
        log('Error in upload route:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
