import debug from 'debug';
import { initialize as initializeGCS } from './gcsInit.js';
import { initialize as initializeNeo4j } from './neo4jInit.js';
import { initializeImages } from './imageInit.js';
import { initializeAuth } from './authInit.js';
import { getInitializationState } from './initCache.js';

const log = debug('app:init');

/**
 * Initialize all application components
 * @returns {Promise<Object>} Initialization results
 */
export async function initializeApplication() {
    // Check if already initialized or in progress
    const state = getInitializationState();
    if (state.initialized && state.result) {
        log('Already initialized, returning cached result');
        return state.result;
    }

    log('Starting application initialization...');
    
    try {
        // Initialize GCS first
        log('Initializing GCS...');
        const gcsResult = await initializeGCS();
        if (!gcsResult.success) {
            throw new Error(`GCS initialization failed: ${gcsResult.error}`);
        }

        // Initialize Neo4j
        log('Initializing Neo4j...');
        const neo4jResult = await initializeNeo4j();
        if (!neo4jResult.success) {
            throw new Error(`Neo4j initialization failed: ${neo4jResult.error}`);
        }

        // Initialize auth first to get test user
        log('Initializing auth...');
        const authResult = await initializeAuth();
        if (!authResult.success) {
            throw new Error(`Auth initialization failed: ${authResult.error}`);
        }

        // Initialize images with test user ID
        log('Initializing image processing...');
        const imageResult = await initializeImages(authResult.testUser.id);
        if (!imageResult.success) {
            throw new Error(`Image initialization failed: ${imageResult.error}`);
        }

        const result = {
            success: true,
            gcs: gcsResult,
            neo4j: neo4jResult,
            images: imageResult,
            auth: authResult,
            timestamp: new Date().toISOString()
        };

        return result;

    } catch (error) {
        log('Initialization failed:', error);
        throw error;
    }
}
