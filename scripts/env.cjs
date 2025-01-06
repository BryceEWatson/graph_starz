const debug = require('debug')
const dotenv = require('dotenv')
const path = require('path')

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
 * Loads secrets from Google Cloud Secret Manager
 * @param {string[]} secretNames - Names of secrets to load
 * @returns {Promise<Object>} Object containing secret values
 * @throws {ConfigurationError} If any secrets cannot be loaded
 */
async function loadGCloudSecrets(secretNames) {
    const { exec } = require('child_process')
    const util = require('util')
    const execAsync = util.promisify(exec)

    const secrets = {}
    for (const name of secretNames) {
        try {
            const { stdout, stderr } = await execAsync(`gcloud secrets versions access latest --secret=${name}`)
            if (stderr) {
                throw new Error(stderr)
            }
            secrets[name] = stdout.trim()
        } catch (error) {
            throw new ConfigurationError(`Failed to load secret ${name}: ${error.message}`, 'secrets')
        }
    }
    return secrets
}

/**
 * Loads environment configuration from appropriate source
 * @returns {Promise<void>}
 */
async function loadEnvironment() {
    const environment = process.env.NODE_ENV || 'development'
    
    if (environment === 'production') {
        // Load from Google Cloud Secret Manager
        const requiredSecrets = [
            'NEO4J_URI',
            'NEO4J_USER',
            'NEO4J_PASSWORD',
            'GOOGLE_CLOUD_PROJECT'
        ]
        
        try {
            const secrets = await loadGCloudSecrets(requiredSecrets)
            // Set secrets in process.env
            Object.entries(secrets).forEach(([key, value]) => {
                process.env[key] = value
            })
        } catch (error) {
            throw new ConfigurationError(`Failed to load production secrets: ${error.message}`, 'env')
        }
    } else {
        // Load from .env file
        const result = dotenv.config()
        if (result.error) {
            throw new ConfigurationError(`Failed to load .env file: ${result.error.message}`, 'env')
        }
    }
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
    if (typeof value !== type) {
        throw new ConfigurationError(`${name} must be a ${type}, got ${typeof value}`, 'type')
    }
    if (format && !format.test(value)) {
        throw new ConfigurationError(`${name} has invalid format`, 'format')
    }
}

/**
 * Required environment variables for each environment
 */
const REQUIRED_ENV_VARS = {
    development: [
        // Database
        { name: 'NEO4J_URI', type: 'string', required: true, format: /^(bolt|neo4j|bolt\+s|neo4j\+s):\/\/.+/ },
        { name: 'NEO4J_USER', type: 'string', required: true },
        { name: 'NEO4J_PASSWORD', type: 'string', required: true },
        
        // Google Cloud
        { name: 'GOOGLE_CLOUD_PROJECT', type: 'string', required: true },
        { name: 'GOOGLE_APPLICATION_CREDENTIALS_PATH', type: 'string', required: true },
        { name: 'GCS_BUCKET_NAME', type: 'string', required: true }
    ],
    production: [
        // Database
        { name: 'NEO4J_URI', type: 'string', required: true, format: /^(bolt|neo4j|bolt\+s|neo4j\+s):\/\/.+/ },
        { name: 'NEO4J_USER', type: 'string', required: true },
        { name: 'NEO4J_PASSWORD', type: 'string', required: true },
        
        // Google Cloud
        { name: 'GOOGLE_CLOUD_PROJECT', type: 'string', required: true },
        { name: 'GOOGLE_APPLICATION_CREDENTIALS_PATH', type: 'string', required: true },
        { name: 'GCS_BUCKET_NAME', type: 'string', required: true }
    ]
}

/**
 * Validates that all required environment variables are present and of the correct type
 * @param {string} env - The current environment (development or production)
 * @throws {ConfigurationError} If any required variables are missing or of wrong type
 */
function validateEnvConfig(env = process.env.NODE_ENV || 'development') {
    if (!['development', 'production'].includes(env)) {
        throw new ConfigurationError(`Invalid environment: ${env}`, 'env')
    }

    const requiredVars = REQUIRED_ENV_VARS[env]
    const missingVars = []

    for (const varConfig of requiredVars) {
        const value = process.env[varConfig.name]
        
        if (!value && varConfig.required) {
            missingVars.push(varConfig.name)
            continue
        }

        if (value) {
            try {
                validateType(value, varConfig.type, varConfig.name, varConfig.format)
            } catch (error) {
                throw new ConfigurationError(
                    `Invalid ${varConfig.name}: ${error.message}`,
                    'validation'
                )
            }
        }
    }

    if (missingVars.length > 0) {
        throw new ConfigurationError(
            `Missing required environment variables: ${missingVars.join(', ')}`,
            'env'
        )
    }
}

/**
 * Gets the database configuration
 * @returns {Object} Database configuration object
 * @throws {ConfigurationError} If any required database variables are missing
 */
function getDbConfig() {
    // Validate environment before getting config
    validateEnvConfig()

    const uri = process.env.NEO4J_URI
    const user = process.env.NEO4J_USER
    const password = process.env.NEO4J_PASSWORD

    if (!uri || !user || !password) {
        throw new ConfigurationError('Missing required database configuration', 'db')
    }

    validateType(uri, 'string', 'NEO4J_URI', /^(bolt|neo4j|bolt\+s|neo4j\+s):\/\/.+/)
    validateType(user, 'string', 'NEO4J_USER')
    validateType(password, 'string', 'NEO4J_PASSWORD')

    return { uri, user, password }
}

/**
 * Gets the storage configuration
 * @returns {Object} Storage configuration object
 * @throws {ConfigurationError} If any required storage variables are missing
 */
function getStorageConfig() {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS_PATH
    const bucketName = process.env.GCS_BUCKET_NAME

    if (!projectId || !credentialsPath || !bucketName) {
        throw new ConfigurationError('Missing required storage configuration', 'storage')
    }

    validateType(projectId, 'string', 'GOOGLE_CLOUD_PROJECT')
    validateType(credentialsPath, 'string', 'GOOGLE_APPLICATION_CREDENTIALS_PATH')
    validateType(bucketName, 'string', 'GCS_BUCKET_NAME')

    // Load credentials from file
    let credentials
    try {
        credentials = require(path.resolve(process.cwd(), credentialsPath))
    } catch (error) {
        throw new ConfigurationError(`Failed to load GCS credentials: ${error.message}`, 'storage')
    }

    return { projectId, credentials, bucketName }
}

/**
 * Gets all configuration for the current environment
 * @returns {Promise<Object>} Complete configuration object
 * @throws {ConfigurationError} If any configuration validation fails
 */
async function getConfig() {
    await loadEnvironment()
    
    const environment = process.env.NODE_ENV || 'development'
    const config = {
        environment,
        isDevelopment: environment === 'development',
        db: getDbConfig(),
        storage: getStorageConfig(),
        whitelist: {
            autoWhitelistedEmails: process.env.AUTO_WHITELISTED_EMAILS?.split(',').map(email => email.trim()) || []
        }
    }

    log('Configuration loaded for environment:', environment)
    return config
}

module.exports = {
    ConfigurationError,
    validateEnvConfig,
    getConfig,
    getDbConfig,
    getStorageConfig
}
