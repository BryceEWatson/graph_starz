import debug from 'debug';
import { getDriver } from '../neo4j/client';

const log = debug('app:init:neo4j');

/**
 * Initialize Neo4j connection and verify it works
 */
export const initialize = async () => {
    log('Starting Neo4j initialization check...');
    let success = true;
    let errors = [];

    try {
        // Initialize driver and verify connection
        log('Getting Neo4j driver...');
        const driver = await getDriver();
        
        if (!driver) {
            throw new Error('Failed to get Neo4j driver - driver is null');
        }

        log('Opening Neo4j session...');
        const session = driver.session();

        try {
            // Test the connection
            log('Testing Neo4j connection...');
            const result = await session.run('RETURN 1 as n');
            if (!result || !result.records || !result.records[0]) {
                throw new Error('Neo4j connection test returned invalid result');
            }
            
            const testValue = result.records[0].get('n');
            // Handle both integer and number types
            const numericValue = typeof testValue === 'object' && 'toNumber' in testValue ? 
                testValue.toNumber() : 
                Number(testValue);
                
            if (typeof numericValue !== 'number' || numericValue !== 1) {
                throw new Error(`Neo4j connection test failed: unexpected value (${typeof testValue}): ${testValue}`);
            }
            log('Neo4j connection verified');

            // Create indexes if they don't exist
            log('Creating/verifying constraints and indexes...');
            await session.run(`
                CREATE CONSTRAINT user_id IF NOT EXISTS
                FOR (u:User) REQUIRE u.id IS UNIQUE
            `);
            log('User ID constraint created/verified');

            await session.run(`
                CREATE INDEX image_phash IF NOT EXISTS
                FOR (i:Image) ON (i.pHash)
            `);
            log('Image pHash index created/verified');

        } catch (sessionError) {
            const errorMessage = sessionError.message || 'Unknown session error';
            log('Neo4j session error:', errorMessage);
            if (sessionError.stack) {
                log('Session error stack:', sessionError.stack);
            }
            throw new Error(`Neo4j session error: ${errorMessage}`);
        } finally {
            await session.close();
            log('Neo4j session closed');
        }

    } catch (error) {
        success = false;
        const errorMessage = error.message || 'Unknown error';
        errors.push(errorMessage);
        log('Neo4j initialization failed:', errorMessage);
        if (error.stack) {
            log('Error stack:', error.stack);
        }
    }

    log(`Neo4j initialization ${success ? 'succeeded' : 'failed'}`, errors.length ? `with errors: ${errors.join(', ')}` : '');
    return {
        success,
        error: errors.length ? errors[0] : undefined,
        errors,
    };
};
