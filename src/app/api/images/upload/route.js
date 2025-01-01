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
        log('Session data:', {
            session,
            providerId: session?.providerId
        });
        
        // Get user ID from session (Google's sub/providerId)
        const userId = session?.providerId;
        log('Using userId:', userId);
        
        if (!userId) {
            log('No provider ID found in session');
            return NextResponse.json(
                { error: 'Unauthorized: Not authenticated' },
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
            // Process image and get pHash first
            log('Processing image and generating pHash...');
            const processedImage = await processImage(buffer, { contentType });
            const { pHash, width, height, images } = processedImage;
            
            // Check for duplicates before any expensive operations
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

            // Get image analysis before uploading
            log('Analyzing image...')
            const analysis = await analyzeImage(buffer, contentType)
            if (!analysis || !analysis.title) {
                log('Analysis failed or returned no title:', analysis);
                return NextResponse.json({
                    error: 'Analysis failed',
                    message: 'No attributes could be extracted from the image. Please try again or use a different image.',
                    analysis
                }, { status: 422 }); // HTTP 422 Unprocessable Entity
            }

            // Upload full size image
            const fullUpload = await uploadToGCS(
                images.full.data,
                generateImageFilename(analysis.title, 'full'),
                contentType
            );

            // Upload preview size image
            const previewUpload = await uploadToGCS(
                images.preview.data,
                generateImageFilename(analysis.title, 'preview'),
                contentType
            );

            // Upload thumbnail
            const thumbnailUpload = await uploadToGCS(
                images.thumbnail.data,
                generateImageFilename(analysis.title, 'thumbnail'),
                contentType
            );

            // Check for duplicates
            if (!fullUpload.isNew) {
                return NextResponse.json({
                    message: 'This image has already been uploaded.',
                    existingImageId: fullUpload.fullUrl
                }, { status: 409 }); // HTTP 409 Conflict
            }

            // Save image data to Neo4j
            log('Saving image data to Neo4j with userId:', userId);
            const imageData = {
                id: imageId,
                title: analysis.title,
                description: analysis.description,
                tags: analysis.tags,
                width,
                height,
                pHash,
                fullUrl: fullUpload.fullUrl,     // Full size image
                previewUrl: previewUpload.fullUrl,
                thumbnailUrl: thumbnailUpload.fullUrl
            };

            const savedImage = await saveImageData(imageData, analysis, userId);
            log('Image data saved:', savedImage);

            return NextResponse.json({
                message: 'Upload successful',
                image: savedImage
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

function generateImageFilename(title, size) {
    const baseFilename = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    return `${baseFilename}-${size}.webp`;
}
