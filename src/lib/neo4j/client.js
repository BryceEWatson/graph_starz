'use server';

import { getDbConfig } from '../config/env';
import debug from 'debug';

const log = debug('app:neo4j:client');

// Only import neo4j-driver when actually needed
let neo4j;
let driver = null;

log('Module loaded at:', new Date().toISOString(), 'Environment:', process.env.NODE_ENV);

/**
 * Get the Neo4j driver instance
 * @returns {Promise<object>} The Neo4j driver instance
 */
export const getDriver = async () => {
    if (!driver) {
        await initialize();
    }
    return driver;
};

/**
 * Initialize Neo4j driver with the given configuration
 * @returns {Promise<void>}
 */
export const initialize = async () => {
    try {
        log('Initializing Neo4j driver...');
        
        if (!neo4j) {
            log('Loading neo4j-driver module...');
            neo4j = await import('neo4j-driver');
        }

        log('Getting database configuration...');
        const config = await getDbConfig();
        
        if (!config) {
            throw new Error('Failed to get database configuration - config is null');
        }
        
        // Log config without sensitive data
        log('Database configuration:', {
            uri: config.uri,
            user: config.user,
            hasPassword: !!config.password
        });
        
        if (!config.uri || !config.user || !config.password) {
            const missing = [];
            if (!config.uri) missing.push('uri');
            if (!config.user) missing.push('user');
            if (!config.password) missing.push('password');
            throw new Error(`Missing Neo4j configuration: ${missing.join(', ')}`);
        }

        log('Creating Neo4j driver...');
        driver = neo4j.driver(
            config.uri,
            neo4j.auth.basic(config.user, config.password),
            { 
                disableLosslessIntegers: true,
                logging: {
                    level: 'info',
                    logger: (level, message) => log(`[${level}] ${message}`)
                }
            }
        );

        // Test the connection
        log('Testing connection...');
        await validateConnection();
        log('Neo4j driver initialized successfully');
        
    } catch (error) {
        const errorMessage = error.message || 'Unknown error';
        log('Failed to initialize Neo4j driver:', errorMessage);
        if (error.stack) {
            log('Error stack:', error.stack);
        }
        driver = null;
        throw error;
    }
};

/**
 * Validate Neo4j connection
 * @returns {Promise<boolean>} True if the connection is valid
 */
export const validateConnection = async () => {
    if (!driver) {
        throw new Error('Driver not initialized');
    }

    const session = driver.session();
    try {
        log('Running validation query...');
        await session.run('RETURN 1');
        log('Validation query successful');
        return true;
    } catch (error) {
        log('Validation query failed:', error.message);
        if (error.stack) {
            log('Error stack:', error.stack);
        }
        return false;
    } finally {
        log('Closing validation session...');
        await session.close();
    }
};

/**
 * Get Neo4j connection health status
 * @returns {Promise<object>} The health status of the Neo4j connection
 */
export const healthCheck = async () => {
    try {
        log('Performing health check...');
        const isValid = await validateConnection();
        log('Health check result:', isValid);
        return {
            status: isValid ? 'healthy' : 'unhealthy',
            timestamp: new Date().toISOString(),
            details: {
                connectionValid: isValid,
                driverInitialized: !!driver
            }
        };
    } catch (error) {
        log('Health check failed:', error.message);
        if (error.stack) {
            log('Error stack:', error.stack);
        }
        return {
            status: 'unhealthy',
            timestamp: new Date().toISOString(),
            error: error.message,
            details: {
                connectionValid: false,
                driverInitialized: !!driver
            }
        };
    }
};

/**
 * Close Neo4j connection
 * @returns {Promise<void>}
 */
export const close = async () => {
    if (driver) {
        log('Closing Neo4j driver...');
        await driver.close();
        log('Neo4j driver closed');
        driver = null;
    }
};
