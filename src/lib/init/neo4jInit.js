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
        const driver = await getDriver();
        const session = driver.session();

        try {
            // Test the connection
            const result = await session.run('RETURN 1 as n');
            if (result.records[0].get('n').toNumber() !== 1) {
                throw new Error('Neo4j connection test failed');
            }
            log('Neo4j connection verified');

            // Create indexes if they don't exist
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

        } finally {
            await session.close();
        }

    } catch (error) {
        success = false;
        errors.push(error.message);
        log('Neo4j initialization failed:', error);
    }

    return {
        success,
        errors
    };
}
