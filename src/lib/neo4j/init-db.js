/* eslint-disable @typescript-eslint/no-require-imports */
console.log('Script starting - Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    FORCE_RESET: process.env.FORCE_RESET,
    CLEAR_DATA: process.env.CLEAR_DATA,
    DEBUG: process.env.DEBUG
});

const neo4j = require('neo4j-driver');
const debug = require('debug');
const { validateSecrets } = require('../../../scripts/validate-secrets');

const log = debug('db:init:main');
const errorLog = debug('db:init:error');

async function validateSetup(session) {
    log('DEBUG - Starting validateSetup...');
    
    // Test basic query functionality
    log('DEBUG - Testing basic query...');
    const result = await session.run('RETURN 1 as test');
    if (result.records[0].get('test').toNumber() !== 1) {
        throw new Error('Basic query test failed');
    }
    log('DEBUG - Basic query test passed');

    // Verify constraints exist
    log('DEBUG - Checking constraints...');
    const constraints = await session.run('SHOW CONSTRAINTS');
    const requiredConstraints = [
        'user_id_unique',
        'image_id_unique',
        'color_name_unique',
        'object_name_unique'
    ];
    log('DEBUG - Found constraints:', constraints.records.map(record => record.get('name')));
    const missingConstraints = requiredConstraints.filter(name => 
        !constraints.records.some(record => record.get('name') === name)
    );
    
    if (missingConstraints.length > 0) {
        log('DEBUG - Missing constraints:', missingConstraints);
        throw new Error(`Missing required constraints: ${missingConstraints.join(', ')}`);
    }
    log('DEBUG - All constraints verified');

    // Verify indexes exist
    log('DEBUG - Checking indexes...');
    const indexes = await session.run('SHOW INDEXES');
    const requiredIndexes = [
        'user_email',
        'user_lastLogin',
        'image_createdAt'
    ];
    log('DEBUG - Found indexes:', indexes.records.map(record => record.get('name')));
    const missingIndexes = requiredIndexes.filter(name => 
        !indexes.records.some(record => record.get('name') === name)
    );

    if (missingIndexes.length > 0) {
        log('DEBUG - Missing indexes:', missingIndexes);
        throw new Error(`Missing required indexes: ${missingIndexes.join(', ')}`);
    }
    log('DEBUG - All indexes verified');

    log('DEBUG - Database setup validation successful');
}

async function initializeDb() {
    let session;
    let driver;
    
    try {
        log('Starting database initialization...');
        log('DEBUG - Environment variables:');
        log('DEBUG - NODE_ENV:', process.env.NODE_ENV);
        log('DEBUG - FORCE_RESET:', process.env.FORCE_RESET);
        log('DEBUG - CLEAR_DATA:', process.env.CLEAR_DATA);
        
        const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';
        const requiredSecrets = ['NEO4J_URI', 'NEO4J_USER', 'NEO4J_PASSWORD'];
        
        // Validate and get secrets
        const { values: secrets } = await validateSecrets(environment, requiredSecrets);
        
        log('DEBUG - NEO4J_URI before driver creation:', secrets.NEO4J_URI);
        log('DEBUG - Expected NEO4J_URI:', 'neo4j+s://aceae2f4.databases.neo4j.io');
        log('DEBUG - URIs match:', secrets.NEO4J_URI === 'neo4j+s://aceae2f4.databases.neo4j.io');
        
        // Create Neo4j driver instance
        driver = neo4j.driver(
            secrets.NEO4J_URI,
            neo4j.auth.basic(secrets.NEO4J_USER, secrets.NEO4J_PASSWORD)
        );

        // Test connection
        try {
            await driver.verifyConnectivity();
            log('Successfully connected to Neo4j');
        } catch (error) {
            throw new Error(`Failed to connect to Neo4j: ${error.message}`);
        }

        session = driver.session();

        // Check if database is already initialized
        const result = await session.run('SHOW CONSTRAINTS');
        const existingConstraints = result.records.map(record => record.get('name'));
        log('DEBUG - Found existing constraints:', existingConstraints);
        log('DEBUG - FORCE_RESET value:', process.env.FORCE_RESET);
        
        // Check FORCE_RESET before validating
        const shouldReset = process.env.FORCE_RESET?.toLowerCase() === 'true';
        log('DEBUG - Should reset database:', shouldReset);

        if (existingConstraints.length > 0) {
            if (shouldReset) {
                log('DEBUG - Dropping existing constraints and indexes...');
                
                // Drop constraints
                for (const name of existingConstraints) {
                    log('DEBUG - Dropping constraint:', name);
                    await session.run(`DROP CONSTRAINT ${name}`);
                }
                
                // Drop indexes
                const indexes = await session.run('SHOW INDEXES');
                log('DEBUG - Found indexes:', indexes.records.map(record => record.get('name')));
                for (const record of indexes.records) {
                    const name = record.get('name');
                    if (name) {
                        log('DEBUG - Dropping index:', name);
                        await session.run(`DROP INDEX ${name}`);
                    }
                }

                // Clear all data if requested
                if (process.env.CLEAR_DATA === 'true') {
                    log('DEBUG - Clearing all nodes and relationships...');
                    await session.run('MATCH (n) DETACH DELETE n');
                }
            } else {
                log('DEBUG - Skipping initialization, constraints exist and FORCE_RESET not set');
                await validateSetup(session);
                return;
            }
        }

        log('DEBUG - Starting to create constraints...');
        // Create constraints
        log('Creating constraints...');
        await session.run(`
            CREATE CONSTRAINT user_id_unique IF NOT EXISTS
            FOR (u:User) REQUIRE u.id IS UNIQUE
        `);
        log('DEBUG - Created user_id_unique constraint');
        
        await session.run(`
            CREATE CONSTRAINT image_id_unique IF NOT EXISTS
            FOR (i:Image) REQUIRE i.id IS UNIQUE
        `);
        log('DEBUG - Created image_id_unique constraint');

        await session.run(`
            CREATE CONSTRAINT color_name_unique IF NOT EXISTS
            FOR (c:Color) REQUIRE c.name IS UNIQUE
        `);
        log('DEBUG - Created color_name_unique constraint');

        await session.run(`
            CREATE CONSTRAINT object_name_unique IF NOT EXISTS
            FOR (o:Object) REQUIRE o.name IS UNIQUE
        `);
        log('DEBUG - Created object_name_unique constraint');

        // Create indexes
        log('DEBUG - Starting to create indexes...');
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

        // Validate the setup
        await validateSetup(session);
        
        log('Database initialization completed successfully');
    } catch (error) {
        errorLog('Error initializing database:', error);
        throw error;
    } finally {
        if (session) {
            await session.close();
        }
        if (driver) {
            await driver.close();
        }
    }
}

// Allow running directly from command line
if (require.main === module) {
    initializeDb()
        .then(() => {
            log('Database initialization process completed');
            process.exit(0);
        })
        .catch(error => {
            errorLog('Failed to initialize database:', error);
            process.exit(1);
        });
}

module.exports = { initializeDb };
