/**
 * Google Cloud Storage configuration module
 * @module config/gcs
 */

import { getStorageConfig } from './env.js'

/**
 * Gets the GCS credentials and configuration
 * @returns {Promise<Object>} GCS configuration object
 */
async function getGCSCredentials() {
    const config = getStorageConfig()
    return {
        projectId: config.projectId,
        ...config.credentials
    }
}

export {
    getGCSCredentials
}
