'use server';

// Only import neo4j-driver when actually needed
let neo4j;
let driver = null;

console.log('[NEO4J] Module loaded at:', new Date().toISOString(), 'Environment:', process.env.NODE_ENV);

/**
 * Get the Neo4j driver instance
 */
export async function getDriver() {
    if (!driver) {
        await initialize();
    }
    return driver;
}

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
        return driver;
    }

    if (!process.env.NEO4J_URI || !process.env.NEO4J_USER || !process.env.NEO4J_PASSWORD) {
        throw new Error('Missing required Neo4j environment variables');
    }

    try {
        driver = neo4j.driver(
            process.env.NEO4J_URI,
            neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD),
            {
                maxConnectionPoolSize: 50,
                connectionAcquisitionTimeout: 2000,
            }
        );
        console.log('[NEO4J] Driver initialized successfully');
        
        // Verify connectivity
        await validateConnection();
        
        return driver;
    } catch (error) {
        console.error('[NEO4J] Failed to initialize driver:', error);
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

    try {
        const serverInfo = await driver.verifyConnectivity();
        console.log('[NEO4J] Connection verified:', serverInfo);
        return true;
    } catch (error) {
        console.error('[NEO4J] Connection verification failed:', error);
        throw error;
    }
}

/**
 * Get Neo4j connection health status
 */
export async function healthCheck() {
    if (!driver) {
        return { status: 'error', message: 'Driver not initialized' };
    }

    try {
        await driver.verifyConnectivity();
        return { status: 'healthy' };
    } catch (error) {
        return {
            status: 'error',
            message: error.message,
            code: error.code
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
        console.log('[NEO4J] Driver closed');
    }
}
