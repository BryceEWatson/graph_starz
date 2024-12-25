'use server';

import debug from 'debug';

const log = debug('app:config:gcs');

/**
 * Get GCS credentials based on the environment
 * @returns {Promise<Object>} GCS credentials object
 */
export async function getGCSCredentials() {
  const credentialsValue = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialsValue) {
    throw new Error('GOOGLE_APPLICATION_CREDENTIALS is required');
  }

  try {
    // Production: handle both JSON string and direct credentials object
    if (process.env.NODE_ENV === 'production') {
      let credentials;
      try {
        // First try parsing as JSON string
        credentials = JSON.parse(credentialsValue);
        log('Successfully parsed GCS credentials from JSON string');
      } catch (parseError) {
        log('Failed to parse credentials as JSON:', parseError);
        throw new Error(`Invalid GCS credentials format: ${parseError.message}`);
      }

      // Validate required fields
      if (!credentials || typeof credentials !== 'object') {
        throw new Error('Invalid GCS credentials: must be a valid JSON object');
      }

      if (!credentials.project_id || !credentials.private_key || !credentials.client_email) {
        throw new Error('Invalid GCS credentials: missing required fields (project_id, private_key, client_email)');
      }

      return {
        projectId: process.env.GOOGLE_CLOUD_PROJECT || credentials.project_id,
        credentials: credentials
      };
    }
    
    // Development: use credentials file path
    return {
      projectId: process.env.GOOGLE_CLOUD_PROJECT,
      keyFilename: credentialsValue
    };
  } catch (error) {
    log('Failed to initialize GCS credentials:', error);
    throw new Error('Failed to initialize GCS credentials: ' + error.message);
  }
}
