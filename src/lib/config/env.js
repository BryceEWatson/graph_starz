'use server'

import debug from 'debug'
import dotenv from 'dotenv'
import path from 'path'
import fs from 'fs'

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
 * FRONTEND_URL=http://localhost:3000
 * 
 * # AI Services
 * ANTHROPIC_API_KEY=key
 * 
 * # Whitelist
 * AUTO_WHITELISTED_EMAILS=email1@example.com,email2@example.com
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
        { name: 'FRONTEND_URL', type: 'string', required: true, format: /^https?:\/\/.+/ },
        
        // AI Services
        { name: 'ANTHROPIC_API_KEY', type: 'string', required: true },

        // Whitelist
        { name: 'AUTO_WHITELISTED_EMAILS', type: 'string', required: false },

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
        { name: 'GOOGLE_APPLICATION_CREDENTIALS', type: 'string', required: false }, // JSON string validation handled in getStorageConfig
        { name: 'GCS_BUCKET_NAME', type: 'string', required: true },
        
        // Authentication
        { name: 'GOOGLE_CLIENT_ID', type: 'string', required: true },
        { name: 'GOOGLE_CLIENT_SECRET', type: 'string', required: true },
        { name: 'NEXTAUTH_SECRET', type: 'string', required: true },
        { name: 'NEXTAUTH_URL', type: 'string', required: true, format: /^https:\/\/.+/ }, // Require HTTPS in production
        { name: 'FRONTEND_URL', type: 'string', required: true, format: /^https:\/\/.+/ }, // Require HTTPS in production
        
        // AI Services
        { name: 'ANTHROPIC_API_KEY', type: 'string', required: true },

        // Whitelist
        { name: 'AUTO_WHITELISTED_EMAILS', type: 'string', required: false },

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
 * Environment-Specific Credential Handling
 * ----------------------------------------
 * - Development: Requires local credentials file at config/storage-credentials.json
 * - Production: Loads credentials from file mounted via Google Secret Manager
 * - Test: Uses mocked credentials without filesystem checks
 * @see {@link file://./scripts/prod-deploy-cloud-run.ps1} for deployment configuration
 */
async function getStorageConfig() {
    const projectId = process.env.GOOGLE_CLOUD_PROJECT
    const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS
    const bucketName = process.env.GCS_BUCKET_NAME

    if (!projectId) {
        throw new ConfigurationError('Missing GOOGLE_CLOUD_PROJECT', 'storage')
    }

    if (!bucketName) {
        throw new ConfigurationError('Missing GCS_BUCKET_NAME', 'storage')
    }

    let parsedCredentials;
    
    if (process.env.NODE_ENV === 'development') {
        const credsPath = path.resolve(credentialsPath);
        if (!fs.existsSync(credsPath)) {
            throw new ConfigurationError('Credentials file not found in development mode', 'storage');
        }
        parsedCredentials = await import(credsPath);
    } else if (process.env.NODE_ENV === 'production') {
        try {
            parsedCredentials = await import(path.resolve(credentialsPath));
        } catch (_error) {
            throw new ConfigurationError('Invalid credential format', 'storage');
        }
    } else if (process.env.NODE_ENV === 'test') {
        parsedCredentials = await import(credentialsPath);
    }

    return {
        projectId,
        credentials: parsedCredentials,
        bucketName
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
    const googleClientId = process.env.GOOGLE_CLIENT_ID
    const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET
    const nextAuthSecret = process.env.NEXTAUTH_SECRET
    const nextAuthUrl = process.env.NEXTAUTH_URL
    const frontendUrl = process.env.FRONTEND_URL

    if (!googleClientId) {
        throw new ConfigurationError('Missing GOOGLE_CLIENT_ID', 'auth')
    }
    if (!googleClientSecret) {
        throw new ConfigurationError('Missing GOOGLE_CLIENT_SECRET', 'auth')
    }
    if (!nextAuthSecret) {
        throw new ConfigurationError('Missing NEXTAUTH_SECRET', 'auth')
    }
    if (!nextAuthUrl) {
        throw new ConfigurationError('Missing NEXTAUTH_URL', 'auth')
    }
    if (!frontendUrl) {
        throw new ConfigurationError('Missing FRONTEND_URL', 'auth')
    }

    // Validate URL formats
    const urlRegex = process.env.NODE_ENV === 'production'
        ? /^https:\/\/.+/
        : /^https?:\/\/.+/

    if (!urlRegex.test(nextAuthUrl)) {
        throw new ConfigurationError(
            `Invalid NEXTAUTH_URL format. Must be ${process.env.NODE_ENV === 'production' ? 'HTTPS' : 'HTTP(S)'}`,
            'auth'
        )
    }
    if (!urlRegex.test(frontendUrl)) {
        throw new ConfigurationError(
            `Invalid FRONTEND_URL format. Must be ${process.env.NODE_ENV === 'production' ? 'HTTPS' : 'HTTP(S)'}`,
            'auth'
        )
    }

    // Configure secure cookie settings based on environment
    const isSecure = process.env.NODE_ENV === 'production'
    const cookiePrefix = isSecure ? '__Secure-' : ''
    const cookieOptions = {
        httpOnly: true,
        secure: isSecure,
        sameSite: 'lax',
        path: '/'
    }

    return {
        google: {
            clientId: googleClientId,
            clientSecret: googleClientSecret
        },
        nextAuth: {
            secret: nextAuthSecret,
            url: nextAuthUrl
        },
        frontend: {
            url: frontendUrl
        },
        cookies: {
            prefix: cookiePrefix,
            options: cookieOptions
        }
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
 * Gets the whitelist configuration
 * @returns {Object} Whitelist configuration object
 * @property {string[]} autoWhitelistedEmails - List of automatically whitelisted emails
 */
function getWhitelistConfig() {
    const rawEmails = process.env.AUTO_WHITELISTED_EMAILS
    log('Raw AUTO_WHITELISTED_EMAILS value: %s', rawEmails)
    log('Environment:', {
        NODE_ENV: process.env.NODE_ENV,
        hasAutoWhitelistEnv: !!process.env.AUTO_WHITELISTED_EMAILS,
        rawEmailsType: typeof rawEmails
    })
    
    const emailList = rawEmails?.split(',').map(email => email.trim()) || []
    log('Parsed email list: %o', emailList)
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const validEmails = emailList.filter(email => {
        const isValid = emailRegex.test(email)
        if (!isValid && email) {
            log('Warning: Invalid email format in AUTO_WHITELISTED_EMAILS: %s', email)
        }
        return isValid
    })
    log('Valid emails: %o', validEmails)

    return { autoWhitelistedEmails: validEmails }
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
 * @property {Object} whitelist - Whitelist configuration
 * @property {boolean} isDevelopment - Whether running in development mode
 * @throws {ConfigurationError} If any configuration validation fails
 */
function getConfig() {
    try {
        // For testing purposes, treat 'test' environment as 'development'
        // This allows Jest tests to run with development configuration
        const envFromProcess = process.env.NODE_ENV || 'development'
        const currentEnv = envFromProcess === 'test' ? 'development' : envFromProcess

        // Validate environment configuration
        validateEnvConfig(currentEnv)

        // Get configuration components
        const db = getDbConfig()
        const storage = getStorageConfig()
        const auth = getAuthConfig()
        const ai = getAIConfig()
        const whitelist = getWhitelistConfig()

        return {
            environment: currentEnv,
            debug: process.env.DEBUG || '',
            db,
            storage,
            auth,
            ai,
            whitelist,
            isDevelopment: currentEnv === 'development'
        }
    } catch (error) {
        if (error instanceof ConfigurationError) {
            throw error
        }
        throw new ConfigurationError(`Configuration error: ${error.message}`, 'general')
    }
}

export {
    ConfigurationError,
    validateEnvConfig,
    getDbConfig,
    getStorageConfig,
    getAuthConfig,
    getAIConfig,
    getWhitelistConfig,
    getConfig,
}
