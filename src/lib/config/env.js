'use server';

import debug from 'debug';

const log = debug('app:config:env');

/**
 * Required environment variables for each environment
 */
const REQUIRED_ENV_VARS = {
  development: [
    'NEO4J_URI',
    'NEO4J_USER',
    'NEO4J_PASSWORD',
    'GOOGLE_CLOUD_PROJECT',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GCS_BUCKET_NAME',
  ],
  production: [
    'NEO4J_URI',
    'NEO4J_USER', 
    'NEO4J_PASSWORD',
    'GOOGLE_CLOUD_PROJECT',
    'GOOGLE_APPLICATION_CREDENTIALS',
    'GCS_BUCKET_NAME',
  ],
};

/**
 * Validates that all required environment variables are present
 * @param {string} env - The current environment (development or production)
 * @throws {Error} If any required variables are missing
 */
export async function validateEnvConfig(env = process.env.NODE_ENV) {
  log(`Validating ${env} environment configuration...`);
  
  const requiredVars = REQUIRED_ENV_VARS[env];
  if (!requiredVars) {
    throw new Error(`Invalid environment: ${env}`);
  }

  const missingVars = requiredVars.filter(varName => {
    // In production, check both prefixed and unprefixed
    if (env === 'production') {
      return !process.env[varName] && !process.env[`PROD_${varName}`];
    }
    return !process.env[varName];
  });

  if (missingVars.length > 0) {
    log('Missing environment variables:', missingVars);
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  log('Environment validation successful');
}

/**
 * Gets the database configuration for the current environment
 * @returns {Object} Database configuration
 */
export async function getDbConfig() {
  const env = process.env.NODE_ENV;
  log(`Getting database config for ${env} environment...`);

  let uri, user, password;

  if (env === 'production') {
    // Try prefixed first, fall back to unprefixed
    uri = process.env.PROD_NEO4J_URI || process.env.NEO4J_URI;
    user = process.env.PROD_NEO4J_USER || process.env.NEO4J_USER;
    password = process.env.PROD_NEO4J_PASSWORD || process.env.NEO4J_PASSWORD;
  } else {
    uri = process.env.NEO4J_URI;
    user = process.env.NEO4J_USER;
    password = process.env.NEO4J_PASSWORD;
  }

  if (!uri || !user || !password) {
    log('Missing Neo4j configuration:', { 
      hasUri: !!uri, 
      hasUser: !!user, 
      hasPassword: !!password 
    });
    throw new Error('Missing Neo4j configuration: uri, user, password');
  }

  return { uri, user, password };
}

/**
 * Gets the storage configuration for the current environment
 * @returns {Object} Storage configuration
 */
export async function getStorageConfig() {
  const env = process.env.NODE_ENV;
  log(`Getting storage config for ${env} environment...`);

  let projectId, credentials, bucketName;

  if (env === 'production') {
    // Try prefixed first, fall back to unprefixed
    projectId = process.env.PROD_GOOGLE_CLOUD_PROJECT || process.env.GOOGLE_CLOUD_PROJECT;
    credentials = process.env.PROD_GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS;
    bucketName = process.env.PROD_GCS_BUCKET_NAME || process.env.GCS_BUCKET_NAME;
  } else {
    projectId = process.env.GOOGLE_CLOUD_PROJECT;
    credentials = process.env.GOOGLE_APPLICATION_CREDENTIALS;
    bucketName = process.env.GCS_BUCKET_NAME;
  }

  if (!projectId || !credentials || !bucketName) {
    log('Missing storage configuration:', {
      hasProjectId: !!projectId,
      hasCredentials: !!credentials,
      hasBucketName: !!bucketName
    });
    throw new Error('Missing storage configuration: projectId, credentials, bucketName');
  }

  return { projectId, credentials, bucketName };
}

/**
 * Gets all configuration for the current environment
 * @returns {Object} All configuration
 */
export async function getConfig() {
  const env = process.env.NODE_ENV;
  log(`Getting all config for ${env} environment...`);

  await validateEnvConfig(env);
  
  const [dbConfig, storageConfig] = await Promise.all([
    getDbConfig(),
    getStorageConfig()
  ]);

  return {
    env,
    port: process.env.PORT || 3000,
    db: dbConfig,
    storage: storageConfig,
    frontend: {
      url: process.env.FRONTEND_URL,
    },
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackUrl: process.env.GOOGLE_CALLBACK_URL,
    },
    app: {
      skipImageInit: process.env.SKIP_IMAGE_INIT === 'true',
    },
  };
}
