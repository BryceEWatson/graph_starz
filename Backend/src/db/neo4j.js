const neo4j = require('neo4j-driver');

let driver;

/**
 * Initialize Neo4j connection and verify database health
 * @returns {Promise<void>}
 * @throws {Error} If connection fails or database is not healthy
 */
async function initialize() {
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;
    
    if (!uri || !user || !password) {
        throw new Error('Missing required Neo4j environment variables');
    }
    
    try {
        // Create driver instance
        driver = neo4j.driver(uri, neo4j.auth.basic(user, password), {
            maxTransactionRetryTime: 30000,
            logging: {
                level: 'info',
                logger: (level, message) => console.log(`[Neo4j] ${level}: ${message}`)
            }
        });
        
        // Verify connection
        const session = driver.session();
        try {
            // Test 1: Basic connectivity
            console.log('Testing Neo4j connectivity...');
            await session.run('RETURN 1 as test');
            
            // Test 2: Database access
            console.log('Checking Neo4j version...');
            const dbInfo = await session.run('CALL dbms.components() YIELD name, versions, edition');
            console.log(`Connected to Neo4j ${dbInfo.records[0].get('edition')} Edition v${dbInfo.records[0].get('versions')[0]}`);
            
            // Test 3: Write permissions with explicit transaction
            console.log('Verifying database permissions...');
            const testId = `test_${Date.now()}`;
            const writeTest = await session.executeWrite(async tx => {
                // Create test node
                await tx.run(
                    'CREATE (n:TestNode {id: $testId}) RETURN n',
                    { testId }
                );
                
                // Verify we can read it
                const result = await tx.run(
                    'MATCH (n:TestNode {id: $testId}) RETURN n',
                    { testId }
                );
                
                // Delete it
                await tx.run(
                    'MATCH (n:TestNode {id: $testId}) DELETE n',
                    { testId }
                );
                
                return result.records.length === 1;
            });
            
            if (!writeTest) {
                throw new Error('Write permission test failed - node was not created');
            }
            
            console.log('Successfully validated Neo4j connection and permissions');
        } catch (error) {
            console.error('Error during Neo4j initialization:', error);
            throw error;
        } finally {
            // Extra safety: clean up any test nodes that might have been left behind
            try {
                await session.run('MATCH (n:TestNode) WHERE n.id STARTS WITH "test_" DELETE n');
            } catch (cleanupError) {
                console.warn('Warning: Failed to clean up test nodes:', cleanupError);
            }
            await session.close();
        }
    } catch (error) {
        if (driver) {
            await driver.close();
            driver = null;
        }
        throw new Error(`Failed to initialize Neo4j: ${error.message}`);
    }
}

/**
 * Get the Neo4j driver instance
 * @returns {neo4j.Driver}
 * @throws {Error} If driver is not initialized
 */
function getDriver() {
    if (!driver) {
        throw new Error('Neo4j driver not initialized. Call initialize() first.');
    }
    return driver;
}

/**
 * Close the Neo4j connection
 * @returns {Promise<void>}
 */
async function close() {
    if (driver) {
        await driver.close();
        driver = null;
    }
}

module.exports = {
    initialize,
    getDriver,
    close
};
