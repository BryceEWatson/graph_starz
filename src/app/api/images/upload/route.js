import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { analyzeImage } from '../../../../lib/image/imageAnalyzer';
import { saveImageData } from '../../../../lib/neo4j/imageRepository';
import { processImage } from '../../../../lib/image/imageProcessor';
import { findSimilarImage } from '../../../../lib/neo4j/imageRepository';
import { authOptions } from '../../auth/[...nextauth]/options';

// Force Node.js runtime
export const runtime = 'nodejs';

export async function POST(request) {
    try {
        // Get user session
        const session = await getServerSession(authOptions);
        
        // Get user ID from session or test header (in development only)
        const userId = process.env.NODE_ENV === 'development' && request.headers.get('X-Test-User')
            ? request.headers.get('X-Test-User')
            : session?.user?.id;
        
        if (!userId) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        console.log('Processing upload for user:', userId);
        
        // Get the file from the request
        const formData = await request.formData();
        const file = formData.get('file');
        
        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Process image into different sizes and get pHash first
        console.log('Processing image and generating pHash...');
        const buffer = await file.arrayBuffer();
        
        try {
            // Get pHash for duplicate detection
            const { pHash, images } = await processImage(buffer);
            
            // Check for duplicates before proceeding with expensive operations
            console.log('Checking for duplicates with pHash:', pHash);
            const existingImageId = await findSimilarImage(pHash);
            if (existingImageId) {
                console.log('Duplicate image detected:', existingImageId);
                return NextResponse.json({
                    error: 'Duplicate image detected',
                    message: 'This image (or a very similar one) has already been uploaded.',
                    existingImageId
                }, { status: 409 }); // HTTP 409 Conflict
            }

            // If no duplicate, proceed with full processing and analysis
            const base64Image = images.full.data;

            // Analyze image with Anthropic
            console.log('Analyzing image...');
            const analysis = await analyzeImage(base64Image);

            // Save to Google Cloud Storage
            console.log('Uploading to GCS...');
            const gcsResponse = await fetch(new URL('/api/images/gcs', request.url), {
                method: 'POST',
                body: file,
                headers: {
                    'Content-Type': file.type,
                    'X-File-Name': file.name.replace(/[^a-zA-Z0-9-_\.]|\.(?!(jpg|jpeg|png|webp)$)/gi, '_')
                }
            });

            if (!gcsResponse.ok) {
                const error = await gcsResponse.json();
                throw new Error(`Failed to upload to GCS: ${error.details || error.error || 'Unknown error'}`);
            }

            const { url, isNew } = await gcsResponse.json();
            if (!isNew) {
                return NextResponse.json({
                    error: 'Duplicate image detected',
                    message: 'This image (or a very similar one) has already been uploaded.',
                    existingUrl: url
                }, { status: 409 }); // HTTP 409 Conflict
            }

            // Save to Neo4j with all metadata
            const imageData = {
                metadata: {
                    pHash,
                    title: analysis.title,
                    description: analysis.description,
                    originalName: file.name,
                    width: images.full.width,
                    height: images.full.height,
                    uploadedAt: new Date().toISOString()
                },
                urls: {
                    thumbnail: url.replace('/full/', '/thumbnail/'),
                    preview: url.replace('/full/', '/preview/'),
                    full: url
                }
            };

            const savedImage = await saveImageData(imageData, analysis, userId);

            return NextResponse.json({
                id: savedImage.id,
                isNew: true,
                title: analysis.title
            });

        } catch (error) {
            console.error('Error uploading image:', error);
            return NextResponse.json(
                { error: 'Failed to upload image', details: error.message },
                { status: 500 }
            );
        }

    } catch (error) {
        console.error('Error uploading image:', error);
        return NextResponse.json(
            { error: 'Failed to upload image', details: error.message },
            { status: 500 }
        );
    }
}
