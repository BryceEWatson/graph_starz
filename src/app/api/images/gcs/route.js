import { NextResponse } from 'next/server';
import { uploadToGCS } from '@/lib/storage/gcs';
import { Storage } from '@google-cloud/storage';
import debug from 'debug';

// Force Node.js runtime
export const runtime = 'nodejs';

const log = debug('app:api:gcs');

// Validate GCS environment
const validateGCSEnvironment = () => {
    const requiredVars = ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_APPLICATION_CREDENTIALS', 'GCS_BUCKET_NAME'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
};

// Validate bucket access
const validateBucketAccess = async () => {
    const storage = new Storage();
    const bucketName = process.env.GCS_BUCKET_NAME;
    const bucket = storage.bucket(bucketName);

    const [exists] = await bucket.exists();
    if (!exists) {
        throw new Error(`Bucket ${bucketName} does not exist`);
    }
};

export async function POST(request) {
    try {
        // Validate environment and bucket access
        validateGCSEnvironment();
        await validateBucketAccess();

        const file = await request.blob();
        if (!file) {
            return NextResponse.json(
                { error: 'No file provided' },
                { status: 400 }
            );
        }

        // Validate file size (max 10MB)
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
        if (file.size > MAX_FILE_SIZE) {
            return NextResponse.json(
                { error: 'File too large. Maximum size is 10MB' },
                { status: 400 }
            );
        }

        // Convert blob to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Get and validate the filename
        const filename = request.headers.get('X-File-Name') || 'image.webp';
        if (!/^[a-zA-Z0-9-_]+\.(jpg|jpeg|png|webp)$/i.test(filename)) {
            return NextResponse.json(
                { error: 'Invalid filename. Must be alphanumeric with jpg, jpeg, png, or webp extension' },
                { status: 400 }
            );
        }

        // Get and validate content type
        const contentType = request.headers.get('Content-Type') || 'image/webp';
        if (!contentType.startsWith('image/')) {
            return NextResponse.json(
                { error: 'Invalid content type. Must be an image type' },
                { status: 400 }
            );
        }

        // Upload to GCS
        const result = await uploadToGCS(buffer, filename, contentType);

        // Log upload result
        if (result.isNew) {
            log('Successfully uploaded new image:', filename);
        } else {
            log('Found duplicate image, returning existing URL');
        }

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error uploading to GCS:', error);
        return NextResponse.json(
            { error: 'Failed to upload to GCS', details: error.message },
            { status: 500 }
        );
    }
}
