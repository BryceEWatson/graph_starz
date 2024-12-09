'use server';

// Only import neo4j-driver when actually needed
let neo4j;
let driver = null;

console.log('[NEO4J] Module loaded at:', new Date().toISOString(), 'Environment:', process.env.NODE_ENV);

/**
 * Get the Neo4j driver instance
 * @returns {Promise<object>} The Neo4j driver instance
 */
export const getDriver = async () => {
    if (!driver) {
        await initialize();
    }
    return driver;
};

/**
 * Initialize Neo4j driver with the given configuration
 * @returns {Promise<void>}
 */
export const initialize = async () => {
    if (!neo4j) {
        neo4j = await import('neo4j-driver');
    }

    if (!process.env.NEO4J_URI || !process.env.NEO4J_USER || !process.env.NEO4J_PASSWORD) {
        throw new Error('Missing Neo4j environment variables');
    }

    if (driver) {
        return;
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

        // Test the connection
        await validateConnection();
    } catch (error) {
        console.error('Failed to create Neo4j driver:', error);
        throw error;
    }
};

/**
 * Validate Neo4j connection
 * @returns {Promise<boolean>} True if the connection is valid
 */
export const validateConnection = async () => {
    if (!driver) {
        throw new Error('Driver not initialized');
    }

    const session = driver.session();
    try {
        await session.run('RETURN 1');
        return true;
    } finally {
        await session.close();
    }
};

/**
 * Get Neo4j connection health status
 * @returns {Promise<object>} The health status of the Neo4j connection
 */
export const healthCheck = async () => {
    try {
        const isValid = await validateConnection();
        return {
            status: isValid ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            details: {
                connectionValid: isValid,
                driverInitialized: !!driver
            }
        };
    } catch (error) {
        return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
            details: {
                connectionValid: false,
                driverInitialized: !!driver
            }
        };
    }
};

/**
 * Close Neo4j connection
 * @returns {Promise<void>}
 */
export const close = async () => {
    if (driver) {
        await driver.close();
        driver = null;
    }
};
