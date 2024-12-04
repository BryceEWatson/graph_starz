'use server';

// Only import neo4j-driver when actually needed
let neo4j;
let driver = null;

console.log('[NEO4J] Module loaded at:', new Date().toISOString(), 'Environment:', process.env.NODE_ENV);

/**
 * Initialize Neo4j driver with the given configuration
 */
export async function initialize() {
    console.log('[NEO4J] Initialize called at:', new Date().toISOString());
    
    // Only import neo4j-driver when we actually need it
    if (!neo4j) {
        neo4j = (await import('neo4j-driver')).default;
    }
    
    if (driver) {
        console.log('[NEO4J] Driver already initialized');
        return true;
    }

    // Skip initialization during build
    if (process.env.NODE_ENV === 'development' && process.env.NEXT_PHASE === 'phase-production-build') {
        console.log('[NEO4J] Skipping initialization during build');
        return true;
    }

    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    console.log('[NEO4J] Environment variables check:');
    console.log('- URI present:', !!uri);
    console.log('- User present:', !!user);
    console.log('- Password present:', !!password);

    if (!uri || !user || !password) {
        const missing = [
            !uri && 'NEO4J_URI',
            !user && 'NEO4J_USER',
            !password && 'NEO4J_PASSWORD'
        ].filter(Boolean).join(', ');
        throw new Error(`Missing required Neo4j environment variables: ${missing}`);
    }

    try {
        console.log('[NEO4J] Creating driver...');
        driver = neo4j.driver(
            uri, 
            neo4j.auth.basic(user, password),
            {
                maxConnectionPoolSize: 50,
                connectionAcquisitionTimeout: 2000
            }
        );
        console.log('[NEO4J] Driver created');
        
        await validateConnection();
        console.log('[NEO4J] Connection validated');
        
        return true;
    } catch (error) {
        console.error('[NEO4J] Initialization failed:', error);
        driver = null;
        throw error;
    }
}

/**
 * Validate Neo4j connection
 */
export async function validateConnection() {
    if (!driver) {
        throw new Error('Neo4j driver not initialized');
    }

    const session = driver.session();
    try {
        const result = await session.run('RETURN 1 as num');
        if (result.records[0].get('num').toNumber() !== 1) {
            throw new Error('Unexpected response from Neo4j');
        }
    } finally {
        await session.close();
    }
}

/**
 * Get Neo4j connection health status
 */
export async function healthCheck() {
    try {
        if (!driver) {
            return { 
                healthy: false, 
                error: 'Neo4j driver not initialized',
                timestamp: new Date().toISOString()
            };
        }

        await validateConnection();
        
        return { 
            healthy: true,
            timestamp: new Date().toISOString()
        };
    } catch (error) {
        return { 
            healthy: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

/**
 * Close Neo4j connection
 */
export async function close() {
    if (driver) {
        await driver.close();
        driver = null;
    }
}
