'use server';

import neo4jClient from '../lib/neo4j';

export async function initializeNeo4j() {
    console.log('[SERVER-ACTION] Initializing Neo4j');
    try {
        await neo4jClient.initialize();
        return { success: true };
    } catch (error) {
        console.error('[SERVER-ACTION] Neo4j initialization failed:', error);
        return { success: false, error: error.message };
    }
}
