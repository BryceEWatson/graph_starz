/* eslint-disable @typescript-eslint/no-require-imports */
const neo4j = require('neo4j-driver');
const debug = require('debug');
const path = require('path');
const dotenv = require('dotenv');
const fs = require('fs');

const log = debug('db:init:main');
const errorLog = debug('db:init:error');

log('Script starting - Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    FORCE_RESET: process.env.FORCE_RESET,
    CLEAR_DATA: process.env.CLEAR_DATA,
    DEBUG: process.env.DEBUG
});

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
    const envPath = path.join(process.cwd(), '.env');
    log('Loading environment from:', envPath);
    dotenv.config({ path: envPath });
}

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

async function getSecrets(environment) {
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);

    const requiredSecrets = [
        'NEO4J_URI',
        'NEO4J_USER',
        'NEO4J_PASSWORD',
        'GOOGLE_APPLICATION_CREDENTIALS'
    ];

    if (environment === 'production') {
        // In production, get secrets from Secret Manager
        log('Getting secrets from Google Cloud Secret Manager');
        try {
            // First, verify all secrets exist
            const { stdout } = await execAsync('gcloud secrets list --format="value(name)"');
            const availableSecrets = stdout.split('\n').map(s => s.trim());
            const missingSecrets = requiredSecrets.filter(secret => !availableSecrets.includes(secret));

            if (missingSecrets.length > 0) {
                throw new Error(`Missing required secrets in Secret Manager: ${missingSecrets.join(', ')}`);
            }

            // Get all secrets
            const secrets = {};
            for (const secretName of requiredSecrets) {
                const { stdout: value } = await execAsync(`gcloud secrets versions access latest --secret=${secretName}`);
                secrets[secretName] = value.trim();
            }

            // Parse and validate GCS credentials
            try {
                const gcsCredentials = JSON.parse(secrets.GOOGLE_APPLICATION_CREDENTIALS);
                if (!gcsCredentials.type || !gcsCredentials.project_id) {
                    throw new Error('Invalid GCS credentials format');
                }
                // Store parsed credentials for use
                secrets.GOOGLE_APPLICATION_CREDENTIALS = gcsCredentials;
            } catch (error) {
                throw new Error(`Failed to parse GCS credentials: ${error.message}`);
            }

            return secrets;
        } catch (error) {
            throw new Error(`Failed to get secrets from Secret Manager: ${error.message}`);
        }
    } else {
        // In development, use environment variables and local file
        try {
            const secrets = {
                NEO4J_URI: process.env.NEO4J_URI,
                NEO4J_USER: process.env.NEO4J_USER,
                NEO4J_PASSWORD: process.env.NEO4J_PASSWORD
            };

            // Read GCS credentials from local file
            const credentialsPath = path.join(process.cwd(), 'gcs-credentials.json');
            const gcsCredentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
            secrets.GOOGLE_APPLICATION_CREDENTIALS = gcsCredentials;

            return secrets;
        } catch (error) {
            throw new Error(`Failed to get development secrets: ${error.message}`);
        }
    }
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
        
        // Get all secrets including GCS credentials
        const secrets = await getSecrets(environment);
        
        // Set GCS credentials in environment as JSON string
        process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON = JSON.stringify(secrets.GOOGLE_APPLICATION_CREDENTIALS);
        
        if (!secrets.NEO4J_URI || !secrets.NEO4J_USER || !secrets.NEO4J_PASSWORD) {
            throw new Error('Missing required Neo4j credentials');
        }
        
        log('DEBUG - NEO4J_URI before driver creation:', secrets.NEO4J_URI);
        
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

        // Create test user if it doesn't exist
        log('DEBUG - Creating test user...');
        await session.run(`
            MERGE (u:User {id: 'test-user-1'})
            ON CREATE SET
                u.email = 'test@example.com',
                u.name = 'Test User',
                u.createdAt = datetime(),
                u.lastLogin = datetime()
            ON MATCH SET
                u.lastLogin = datetime()
        `);
        log('DEBUG - Test user created/updated');

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
            console.log('Database initialization completed successfully');
            process.exit(0);
        })
        .catch(error => {
            console.error('Failed to initialize database:', error);
            process.exit(1);
        });
}

module.exports = { initializeDb };
