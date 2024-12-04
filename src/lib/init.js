import neo4jClient from './neo4j';

/**
 * Initialize all server-side services
 */
async function initializeServices() {
    try {
        // Initialize Neo4j connection
        await neo4jClient.initialize();
        return true;
    } catch (error) {
        console.error('Failed to initialize services:', error);
        throw error;
    }
}

export { initializeServices };
