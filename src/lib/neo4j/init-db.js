/* eslint-disable @typescript-eslint/no-require-imports */
const neo4j = require('neo4j-driver');
const dotenv = require('dotenv');
const debug = require('debug');

const log = debug('db:init');

async function initializeDb() {
    log('Starting database initialization...');
    
    // Connect to Neo4j
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
        throw new Error('Missing Neo4j credentials');
    }

    const driver = neo4j.driver(
        uri,
        neo4j.auth.basic(user, password)
    );

    const session = driver.session();

    try {
        if (process.env.CLEAR_DB === 'true') {
            log('Clearing all data...');
            
            // Clear Neo4j database
            log('Clearing Neo4j database...');
            await session.run('MATCH (n) DETACH DELETE n');
            log('Database cleared successfully');
            
            // Clear GCS bucket
            log('Clearing GCS bucket...');
            const { clearBucket } = await import('../storage/gcs.js');
            await clearBucket();
            log('GCS bucket cleared successfully');
            
            log('All data cleared successfully');
        }

        // Drop existing constraints and indexes
        log('Dropping existing constraints and indexes...');
        await session.run('DROP CONSTRAINT user_id_unique IF EXISTS');
        await session.run('DROP CONSTRAINT image_id_unique IF EXISTS');
        await session.run('DROP INDEX user_lastLogin IF EXISTS');
        await session.run('DROP INDEX user_email IF EXISTS');
        await session.run('DROP INDEX image_createdAt IF EXISTS');

        // Create constraints
        log('Creating constraints...');
        await session.run(`
            CREATE CONSTRAINT user_id_unique IF NOT EXISTS 
            FOR (u:User) REQUIRE u.id IS UNIQUE
        `);
        await session.run(`
            CREATE CONSTRAINT image_id_unique IF NOT EXISTS 
            FOR (i:Image) REQUIRE i.id IS UNIQUE
        `);
        await session.run(`
            CREATE CONSTRAINT color_name_unique IF NOT EXISTS 
            FOR (c:Color) REQUIRE c.name IS UNIQUE
        `);
        await session.run(`
            CREATE CONSTRAINT object_name_unique IF NOT EXISTS 
            FOR (o:Object) REQUIRE o.name IS UNIQUE
        `);

        // Create indexes
        log('Creating indexes...');
        await session.run(`
            CREATE INDEX user_email IF NOT EXISTS 
            FOR (u:User) ON (u.email)
        `);
        await session.run(`
            CREATE INDEX user_lastLogin IF NOT EXISTS 
            FOR (u:User) ON (u.lastLogin)
        `);
        await session.run(`
            CREATE INDEX image_createdAt IF NOT EXISTS 
            FOR (i:Image) ON (i.createdAt)
        `);

        // Create test user
        log('Creating test user...');
        await session.run(`
            MERGE (u:User {id: 'test-user'})
            ON CREATE SET 
                u.name = 'Test User',
                u.email = 'test@example.com',
                u.createdAt = datetime(),
                u.lastLogin = datetime(),
                u.isTest = true
        `);

        log('Database initialization completed successfully');
    } catch (error) {
        log('Error during database initialization:', error);
        throw error;
    } finally {
        await session.close();
        await driver.close();
    }
}

// Load environment variables
dotenv.config();

// Allow running directly from command line
if (require.main === module) {
    initializeDb()
        .then(() => {
            log('Database initialization completed');
            process.exit(0);
        })
        .catch((error) => {
            log('Database initialization failed:', error);
            process.exit(1);
        });
}

// Export the initialization function
module.exports = { initializeDb };
