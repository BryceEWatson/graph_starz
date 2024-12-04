import { NextResponse } from 'next/server';
import { initialize, healthCheck } from '../../../lib/neo4j/api-client';

console.log('[HEALTH] Route module loaded at:', new Date().toISOString());

// Ensure this runs on Node.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    const startTime = new Date().toISOString();
    console.log('[HEALTH] Health check started at:', startTime);
    
    try {
        console.log('[HEALTH] Attempting to initialize Neo4j...');
        const initResult = await initialize();
        console.log('[HEALTH] Neo4j initialized successfully:', initResult);
        
        console.log('[HEALTH] Running health check...');
        const health = await healthCheck();
        console.log('[HEALTH] Health check completed:', health);
        
        return NextResponse.json({
            status: health.healthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            startTime,
            initialization: initResult,
            neo4j: health
        });
    } catch (error) {
        console.error('[HEALTH] Health check failed:', error);
        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            startTime,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
