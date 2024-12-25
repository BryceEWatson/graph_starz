import { NextResponse } from 'next/server';
import { initialize, healthCheck } from '../../../lib/neo4j/api-client';

console.log('[HEALTH] Route module loaded at:', new Date().toISOString());

// Ensure this runs on Node.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Track application start time
const APP_START_TIME = new Date();
const STARTUP_GRACE_PERIOD = 30000; // 30 seconds

export async function GET(_request) {
    console.log("[HEALTH] Route module loaded at:", new Date().toISOString());
    
    // Debug environment variables
    console.log("Environment Variables Debug:");
    console.log("NEXTAUTH_SECRET length:", process.env.NEXTAUTH_SECRET?.length || 0);
    console.log("NEXTAUTH_SECRET first 5 chars:", process.env.NEXTAUTH_SECRET?.substring(0, 5) || 'null');
    console.log("NEXTAUTH_URL:", process.env.NEXTAUTH_URL);
    console.log("NODE_ENV:", process.env.NODE_ENV);
    
    // Log all environment variables for debugging
    console.log("All environment variables:");
    Object.keys(process.env).forEach(key => {
        if (key.includes('SECRET') || key.includes('KEY') || key.includes('PASSWORD')) {
            console.log(`${key}: [length: ${process.env[key]?.length || 0}]`);
        } else {
            console.log(`${key}: ${process.env[key]}`);
        }
    });

    const startTime = new Date().toISOString();
    console.log('[HEALTH] Health check started at:', startTime);
    
    // During startup grace period, return 200 OK
    const uptime = new Date().getTime() - APP_START_TIME.getTime();
    const inStartupPeriod = uptime < STARTUP_GRACE_PERIOD;
    
    if (inStartupPeriod) {
        console.log(`[HEALTH] In startup grace period (${Math.round(uptime/1000)}s/${STARTUP_GRACE_PERIOD/1000}s)`);
        return NextResponse.json({
            status: 'starting',
            uptime,
            timestamp: new Date().toISOString(),
            message: 'Application is starting up'
        }, { status: 200 });
    }
    
    try {
        // Log environment state early
        console.log('[HEALTH] Environment check started');
        console.log('[HEALTH] NODE_ENV:', process.env.NODE_ENV);
        console.log('[HEALTH] NEXTAUTH_SECRET length:', process.env.NEXTAUTH_SECRET ? process.env.NEXTAUTH_SECRET.length : 0);
        console.log('[HEALTH] NEXTAUTH_SECRET first char:', process.env.NEXTAUTH_SECRET ? process.env.NEXTAUTH_SECRET[0] : 'undefined');
        
        // Validate critical auth configuration
        const authConfig = {
            nextAuthSecret: process.env.NEXTAUTH_SECRET,
            googleClientId: process.env.GOOGLE_CLIENT_ID,
            googleClientSecret: process.env.GOOGLE_CLIENT_SECRET
        };

        const missingAuth = Object.entries(authConfig)
            .filter(([key, value]) => {
                const missing = !value;
                if (missing) {
                    console.log(`[HEALTH] Missing auth config: ${key}`);
                }
                return missing;
            })
            .map(([key]) => key);

        if (missingAuth.length > 0) {
            throw new Error(`Missing required auth configuration: ${missingAuth.join(', ')}`);
        }

        console.log('[HEALTH] Auth configuration validated');
        
        console.log('[HEALTH] Attempting to initialize Neo4j...');
        const initResult = await initialize();
        console.log('[HEALTH] Neo4j initialized successfully:', initResult);
        
        console.log('[HEALTH] Running health check...');
        const health = await healthCheck();
        console.log('[HEALTH] Health check completed:', health);

        const requiredSecrets = [
            'NEO4J_URI',
            'NEO4J_USER',
            'NEO4J_PASSWORD',
            'GOOGLE_CLIENT_ID',
            'GOOGLE_CLIENT_SECRET',
            'ANTHROPIC_API_KEY',
            'GCS_BUCKET_NAME',
            'FRONTEND_URL',
            'NEXTAUTH_SECRET'
        ];

        const hasAllSecrets = requiredSecrets.every(secret => !!process.env[secret]);

        // Additional validation for NextAuth secret in production
        const isProd = process.env.NODE_ENV === 'production';
        const hasValidNextAuthSecret = !isProd || (isProd && !!process.env.NEXTAUTH_SECRET);

        // Create auth status from actual validation
        const authStatus = {
            healthy: missingAuth.length === 0 && hasValidNextAuthSecret,
            configPresent: missingAuth.length === 0,
            secrets: {
                ...Object.fromEntries(
                    Object.entries(authConfig).map(([key]) => [key, !!authConfig[key]])
                ),
                nextAuthSecretValid: hasValidNextAuthSecret
            }
        };

        return NextResponse.json({
            status: health.healthy && authStatus.healthy && hasAllSecrets ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            startTime,
            uptime,
            initialization: initResult,
            auth: authStatus,
            neo4j: health,
            secrets: {
                allPresent: hasAllSecrets,
                missing: []
            }
        });
    } catch (error) {
        console.error('[HEALTH] Health check failed:', error);
        
        // After grace period but before 2 minutes, return 200 but indicate not ready
        const stillStarting = uptime < 120000; // 2 minutes
        return NextResponse.json({
            status: stillStarting ? 'starting' : 'unhealthy',
            timestamp: new Date().toISOString(),
            startTime,
            uptime,
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: stillStarting ? 200 : 500 });
    }
}
