import debug from 'debug'
import { initialize as initializeNeo4j } from './neo4jInit.js'
import { initializeAuth } from './authInit.js'
import { getInitializationState } from './initCache.js'
import { initializeStorage } from '../storage/gcs.js'

const log = debug('app:init')

/**
 * Initialize all application components
 * @returns {Promise<Object>} Initialization results
 */
export async function initializeApplication() {
    // Check if already initialized or in progress
    const state = getInitializationState()
    if (state.initialized && state.result) {
        log('Already initialized, returning cached result')
        return state.result
    }

    log('Starting application initialization...')
    
    try {
        // Initialize GCS using the client's own checks
        log('Initializing GCS...')
        const { storage, bucket } = await initializeStorage()
        if (!storage || !bucket) {
            throw new Error('GCS initialization failed: storage or bucket not available')
        }
        log('GCS initialized successfully')

        // Initialize Neo4j
        log('Initializing Neo4j...')
        const neo4jResult = await initializeNeo4j()
        if (!neo4jResult.success) {
            throw new Error(`Neo4j initialization failed: ${neo4jResult.error}`)
        }

        // Initialize Auth
        log('Initializing Auth...')
        const authResult = await initializeAuth()
        if (!authResult.success) {
            throw new Error(`Auth initialization failed: ${authResult.errors.join(', ')}`)
        }

        log('All components initialized successfully')
        return {
            success: true,
            message: 'Application initialized successfully',
            components: {
                gcs: { success: true, message: 'GCS initialized successfully' },
                neo4j: neo4jResult,
                auth: authResult
            }
        }
    } catch (error) {
        log('Initialization failed:', error)
        throw error
    }
}
