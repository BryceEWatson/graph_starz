import { NextResponse } from 'next/server';
import { getDriver } from '@/lib/neo4j/client';
import debug from 'debug';

const log = debug('app:health:db');

// Ensure this runs on Node.js
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
    const startTime = performance.now();
    log('Database health check started');
    
    try {
        const driver = await getDriver();
        const session = driver.session();
        
        try {
            // Test basic query
            const result = await session.run('RETURN 1 as n');
            const queryTime = performance.now() - startTime;
            
            // Get connection pool info
            const connectionInfo = {
                maxConnectionPoolSize: driver.config.maxConnectionPoolSize,
                connectionAcquisitionTimeout: driver.config.connectionAcquisitionTimeout
            };
            
            // Verify query result
            const testValue = result.records[0].get('n').toNumber();
            const success = testValue === 1;
            
            return NextResponse.json({
                healthy: success,
                timestamp: new Date().toISOString(),
                details: {
                    validation: {
                        responseTime: Math.round(queryTime),
                        testValue,
                        success
                    },
                    totalResponseTime: Math.round(performance.now() - startTime),
                    connectionInfo
                }
            });
        } finally {
            await session.close();
        }
    } catch (error) {
        log('Database health check failed:', error);
        return NextResponse.json({
            healthy: false,
            timestamp: new Date().toISOString(),
            error: error.message,
            details: {
                totalResponseTime: Math.round(performance.now() - startTime)
            }
        }, {
            status: 500
        });
    }
}
