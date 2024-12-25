import { NextResponse } from 'next/server';
import { Storage } from '@google-cloud/storage';
import debug from 'debug';

const log = debug('app:health:storage');

// Ensure this runs on Node.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    const startTime = performance.now();
    log('Storage health check started');
    
    try {
        const storage = new Storage();
        const bucketName = process.env.GCS_BUCKET_NAME;
        
        if (!bucketName) {
            throw new Error('GCS_BUCKET_NAME environment variable not set');
        }
        
        // Test bucket access
        const [exists] = await storage.bucket(bucketName).exists();
        if (!exists) {
            throw new Error(`Bucket ${bucketName} does not exist`);
        }
        
        // Get bucket metadata
        const [metadata] = await storage.bucket(bucketName).getMetadata();
        
        return NextResponse.json({
            healthy: true,
            timestamp: new Date().toISOString(),
            details: {
                bucket: bucketName,
                location: metadata.location,
                storageClass: metadata.storageClass,
                iamConfiguration: metadata.iamConfiguration,
                responseTime: Math.round(performance.now() - startTime)
            }
        });
    } catch (error) {
        log('Storage health check failed:', error);
        return NextResponse.json({
            healthy: false,
            timestamp: new Date().toISOString(),
            error: error.message,
            details: {
                responseTime: Math.round(performance.now() - startTime)
            }
        }, {
            status: 500
        });
    }
}
