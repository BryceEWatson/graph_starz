'use server'

import debug from 'debug'
import dotenv from 'dotenv'
import path from 'path'

const log = debug('app:config:env')

/**
 * Custom error for configuration-related issues
 */
class ConfigurationError extends Error {
    constructor(message, category = 'general') {
        super(message)
        this.name = 'ConfigurationError'
        this.category = category
    }
}

/**
 * Environment configuration module that manages all application configuration.
 * 
 * Required .env file format:
 * ```
 * # Database
 * NEO4J_URI=bolt://localhost:7687
 * NEO4J_USER=neo4j
 * NEO4J_PASSWORD=password
 * 
 * # Google Cloud
 * GOOGLE_CLOUD_PROJECT=project-id
 * GOOGLE_APPLICATION_CREDENTIALS=path/to/credentials.json
 * GCS_BUCKET_NAME=bucket-name
 * 
 * # Authentication
 * GOOGLE_CLIENT_ID=client-id
 * GOOGLE_CLIENT_SECRET=client-secret
 * NEXTAUTH_SECRET=secret
 * NEXTAUTH_URL=http://localhost:3000
 * 
 * # AI Services
 * ANTHROPIC_API_KEY=key
 * 
 * # Application
 * DEBUG=app:*,-app:verbose:*
 * NODE_ENV=development
 * ```
 */

// Load environment variables from .env file in development
if (process.env.NODE_ENV !== 'production') {
    const envPath = path.join(process.cwd(), '.env')
    log('Loading environment from:', envPath)
    dotenv.config({ path: envPath })
}

/**
 * Required environment variables for each environment
 * @type {Object.<string, { name: string, type: string, required: boolean, format?: RegExp }[]>}
 */
const REQUIRED_ENV_VARS = {
    development: [
        // Database
        { name: 'NEO4J_URI', type: 'string', required: true, format: /^(bolt|neo4j|bolt\+s|neo4j\+s):\/\/.+/ },
        { name: 'NEO4J_USER', type: 'string', required: true },
        { name: 'NEO4J_PASSWORD', type: 'string', required: true },
        
        // Google Cloud
        { name: 'GOOGLE_CLOUD_PROJECT', type: 'string', required: true },
        { name: 'GOOGLE_APPLICATION_CREDENTIALS', type: 'string', required: true, format: /\.(json|key)$/ }, // Must be path to JSON file
        { name: 'GCS_BUCKET_NAME', type: 'string', required: true },
        
        // Authentication
        { name: 'GOOGLE_CLIENT_ID', type: 'string', required: true },
        { name: 'GOOGLE_CLIENT_SECRET', type: 'string', required: true },
        { name: 'NEXTAUTH_SECRET', type: 'string', required: true },
        { name: 'NEXTAUTH_URL', type: 'string', required: true, format: /^https?:\/\/.+/ },
        
        // AI Services
        { name: 'ANTHROPIC_API_KEY', type: 'string', required: true },

        // Application
        { name: 'DEBUG', type: 'string', required: false },
        { name: 'NODE_ENV', type: 'string', required: false, format: /^(development|production)$/ },
    ],
    production: [
        // Database
        { name: 'NEO4J_URI', type: 'string', required: true, format: /^(bolt|neo4j|bolt\+s|neo4j\+s):\/\/.+/ },
        { name: 'NEO4J_USER', type: 'string', required: true },
        { name: 'NEO4J_PASSWORD', type: 'string', required: true },
        
        // Google Cloud
        { name: 'GOOGLE_CLOUD_PROJECT', type: 'string', required: true },
        { name: 'GOOGLE_APPLICATION_CREDENTIALS', type: 'string', required: true }, // JSON string validation handled in getStorageConfig
        { name: 'GCS_BUCKET_NAME', type: 'string', required: true },
        
        // Authentication
        { name: 'GOOGLE_CLIENT_ID', type: 'string', required: true },
        { name: 'GOOGLE_CLIENT_SECRET', type: 'string', required: true },
        { name: 'NEXTAUTH_SECRET', type: 'string', required: true },
        { name: 'NEXTAUTH_URL', type: 'string', required: true, format: /^https:\/\/.+/ }, // Require HTTPS in production
        
        // AI Services
        { name: 'ANTHROPIC_API_KEY', type: 'string', required: true },

        // Application
        { name: 'DEBUG', type: 'string', required: false },
        { name: 'NODE_ENV', type: 'string', required: false, format: /^production$/ },
    ],
}

/**
 * Validates the type and format of an environment variable
 * @param {string} value - The value to validate
 * @param {string} type - The expected type
 * @param {string} name - The name of the variable (for error messages)
 * @param {RegExp} [format] - Optional regex pattern for format validation
 * @throws {ConfigurationError} If the value is not of the expected type or format
 */
function validateType(value, type, name, format) {
    switch (type) {
        case 'string':
            if (typeof value !== 'string') {
                throw new ConfigurationError(
                    `Environment variable ${name} must be a string, got ${typeof value}`,
                    'type'
                )
            }
            if (format && !format.test(value)) {
                throw new ConfigurationError(
                    `Environment variable ${name} has invalid format`,
                    'format'
                )
            }
            break
        case 'number':
            if (isNaN(Number(value))) {
                throw new ConfigurationError(
                    `Environment variable ${name} must be a number, got ${typeof value}`,
                    'type'
                )
            }
            break
        case 'boolean':
            if (value !== 'true' && value !== 'false') {
                throw new ConfigurationError(
                    `Environment variable ${name} must be a boolean (true/false), got ${value}`,
                    'type'
                )
            }
            break
        default:
            throw new ConfigurationError(`Unknown type ${type} for environment variable ${name}`, 'type')
    }
}

/**
 * Validates that all required environment variables are present and of the correct type
 * @param {string} env - The current environment (development or production)
 * @throws {ConfigurationError} If any required variables are missing or of wrong type
 */
function validateEnvConfig(env = process.env.NODE_ENV || 'development') {
    log('Validating environment configuration for:', env)
    
    // Validate environment name
    if (!['development', 'production'].includes(env)) {
        throw new ConfigurationError(
            `Invalid environment: ${env}. Must be 'development' or 'production'`,
            'environment'
        )
    }

    const requiredVars = REQUIRED_ENV_VARS[env]
    if (!requiredVars) {
        throw new ConfigurationError(`Invalid environment: ${env}`, 'environment')
    }

    const missing = []
    const typeErrors = []
    const formatErrors = []

    for (const { name, type, required, format } of requiredVars) {
        const value = process.env[name]
        
        if (!value && required) {
            missing.push(name)
            continue
        }

        if (value) {
            try {
                validateType(value, type, name, format)
            } catch (error) {
                if (error instanceof ConfigurationError) {
                    if (error.category === 'format') {
                        formatErrors.push(error.message)
                    } else {
                        typeErrors.push(error.message)
                    }
                } else {
                    throw error
                }
            }
        }
    }

    if (missing.length > 0) {
        throw new ConfigurationError(
            `Missing required environment variables: ${missing.join(', ')}`,
            'missing'
        )
    }

    if (typeErrors.length > 0) {
        throw new ConfigurationError(
            `Environment variable type errors:\n${typeErrors.join('\n')}`,
            'type'
        )
    }

    if (formatErrors.length > 0) {
        throw new ConfigurationError(
            `Environment variable format errors:\n${formatErrors.join('\n')}`,
            'format'
        )
    }
}

/**
 * Gets the database configuration
 * @returns {Object} Database configuration object
 * @property {string} uri - Neo4j connection URI
 * @property {string} user - Neo4j username
 * @property {string} password - Neo4j password
 * @throws {ConfigurationError} If any required database variables are missing
 */
function getDbConfig() {
    try {
        validateEnvConfig()
        
        return {
            uri: process.env.NEO4J_URI,
            user: process.env.NEO4J_USER,
            password: process.env.NEO4J_PASSWORD,
        }
    } catch (error) {
        throw new ConfigurationError(
            `Database configuration error: ${error.message}`,
            'database'
        )
    }
}

/**
 * Gets the storage configuration
 * @returns {Object} Storage configuration object
 * @property {string} projectId - Google Cloud project ID
 * @property {Object} credentials - GCS credentials object
 * @property {string} bucketName - GCS bucket name
 * @throws {ConfigurationError} If any required storage variables are missing
 */
function getStorageConfig() {
    try {
        validateEnvConfig()

        const credentialsValue = process.env.GOOGLE_APPLICATION_CREDENTIALS
        const isDevelopment = process.env.NODE_ENV === 'development'
        let credentials

        try {
            if (isDevelopment) {
                // In development, expect path to credentials file
                if (!credentialsValue.endsWith('.json') && !credentialsValue.endsWith('.key')) {
                    throw new Error('Development credentials must be a path to a .json or .key file')
                }
                credentials = { keyFilename: credentialsValue }
            } else {
                // In production, expect JSON string
                if (!credentialsValue.startsWith('{')) {
                    throw new Error('Production credentials must be a JSON string')
                }
                try {
                    const parsedCreds = JSON.parse(credentialsValue)
                    if (!parsedCreds.type) {
                        throw new Error('Invalid GCS credentials format - missing required field: type')
                    }
                    credentials = parsedCreds
                } catch (jsonError) {
                    throw new Error(`Invalid GCS credentials JSON: ${jsonError.message}`)
                }
            }
        } catch (error) {
            throw new ConfigurationError(
                `Invalid GCS credentials format: ${error.message}`,
                'storage'
            )
        }

        return {
            projectId: process.env.GOOGLE_CLOUD_PROJECT,
            credentials,
            bucketName: process.env.GCS_BUCKET_NAME,
        }
    } catch (error) {
        throw new ConfigurationError(
            `Storage configuration error: ${error.message}`,
            'storage'
        )
    }
}

/**
 * Gets the authentication configuration
 * @returns {Object} Authentication configuration object
 * @property {Object} google - Google OAuth configuration
 * @property {Object} nextAuth - NextAuth.js configuration
 * @property {Object} cookies - Cookie configuration based on environment
 * @throws {ConfigurationError} If any required auth variables are missing
 */
function getAuthConfig() {
    try {
        validateEnvConfig()
        
        const isDevelopment = process.env.NODE_ENV === 'development'
        
        return {
            google: {
                clientId: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            },
            nextAuth: {
                secret: process.env.NEXTAUTH_SECRET,
                url: process.env.NEXTAUTH_URL,
            },
            cookies: {
                sessionToken: {
                    name: isDevelopment ? 'next-auth.session-token' : '__Secure-next-auth.session-token',
                    options: {
                        httpOnly: true,
                        sameSite: 'lax',
                        path: '/',
                        secure: !isDevelopment
                    }
                }
            }
        }
    } catch (error) {
        throw new ConfigurationError(
            `Authentication configuration error: ${error.message}`,
            'auth'
        )
    }
}

/**
 * Gets the AI services configuration
 * @returns {Object} AI services configuration object
 * @property {Object} anthropic - Anthropic AI configuration
 * @throws {ConfigurationError} If any required AI service variables are missing
 */
function getAIConfig() {
    try {
        validateEnvConfig()
        
        return {
            anthropic: {
                apiKey: process.env.ANTHROPIC_API_KEY,
            }
        }
    } catch (error) {
        throw new ConfigurationError(
            `AI services configuration error: ${error.message}`,
            'ai'
        )
    }
}

/**
 * Gets all configuration for the current environment
 * @returns {Object} Complete configuration object
 * @property {string} environment - Current environment (development/production)
 * @property {string} debug - Debug configuration
 * @property {Object} db - Database configuration
 * @property {Object} storage - Storage configuration
 * @property {Object} auth - Authentication configuration
 * @property {Object} ai - AI services configuration
 * @property {boolean} isDevelopment - Whether running in development mode
 * @throws {ConfigurationError} If any configuration validation fails
 */
function getConfig() {
    try {
        validateEnvConfig()
        
        return {
            environment: process.env.NODE_ENV || 'development',
            debug: process.env.DEBUG || '',
            db: getDbConfig(),
            storage: getStorageConfig(),
            auth: getAuthConfig(),
            ai: getAIConfig(),
            isDevelopment: process.env.NODE_ENV === 'development',
        }
    } catch (error) {
        throw new ConfigurationError(
            `Configuration error: ${error.message}`,
            'general'
        )
    }
}

export {
    ConfigurationError,
    validateEnvConfig,
    getDbConfig,
    getStorageConfig,
    getAuthConfig,
    getAIConfig,
    getConfig,
}
