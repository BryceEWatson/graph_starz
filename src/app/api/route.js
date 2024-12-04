import { NextResponse } from 'next/server';
import { initialize, healthCheck } from '../../lib/neo4j/api-client';

console.log('[HEALTH] Route module loaded at:', new Date().toISOString());

// Force dynamic route to prevent caching
export const dynamic = 'force-dynamic';

export async function GET() {
    const startTime = new Date().toISOString();
    console.log('[API] Health check started at:', startTime);
    
    try {
        console.log('[API] Attempting to initialize Neo4j...');
        const initResult = await initialize();
        console.log('[API] Neo4j initialized successfully:', initResult);
        
        console.log('[API] Running health check...');
        const health = await healthCheck();
        console.log('[API] Health check completed:', health);
        
        return NextResponse.json({
            status: health.healthy ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            startTime,
            initialization: initResult,
            neo4j: health
        });
    } catch (error) {
        console.error('[API] Health check failed:', error);
        return NextResponse.json({
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            startTime,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
