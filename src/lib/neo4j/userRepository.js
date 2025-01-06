import { getDriver } from './client';
import debug from 'debug';
import { getWhitelistConfig } from '../config/env';

const log = debug('app:neo4j:user');

/**
 * Find a user by their ID
 * @param {string} userId - The user's ID
 * @returns {Promise<Object|null>} The user object or null if not found
 */
export async function findUserById(userId) {
    const driver = await getDriver();
    const session = driver.session();

    try {
        const result = await session.run(
            `
            MATCH (u:User {id: $userId})
            RETURN u
            `,
            { userId }
        );

        if (result.records.length === 0) {
            return null;
        }

        const user = result.records[0].get('u').properties;
        return user;
    } finally {
        await session.close();
    }
}

/**
 * Create a new user
 * @param {Object} userData - User data to create
 * @param {string} userData.id - User's ID
 * @param {string} userData.name - User's name
 * @param {string} userData.email - User's email
 * @param {string} [userData.image] - User's profile image URL
 * @param {boolean} [userData.isTestUser] - Whether this is a test user
 * @param {boolean} [userData.isWhitelisted] - Whether this user is whitelisted
 * @returns {Promise<Object>} The created user object
 */
export async function createUser(userData) {
    const driver = await getDriver();
    const session = driver.session();

    try {
        const result = await session.run(
            `
            CREATE (u:User {
                id: $id,
                name: $name,
                email: $email,
                image: $image,
                isTestUser: $isTestUser,
                createdAt: datetime(),
                isWhitelisted: $isWhitelisted
            })
            RETURN u
            `,
            {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                image: userData.image || null,
                isTestUser: userData.isTestUser || false,
                isWhitelisted: userData.isWhitelisted || false
            }
        );

        const user = result.records[0].get('u').properties;
        return user;
    } finally {
        await session.close();
    }
}

/**
 * Check if an email is whitelisted and update database if auto-whitelisted
 * @param {string} email - The email to check
 * @returns {Promise<boolean|null>} Whether the email is whitelisted, null if user doesn't exist
 */
export async function isEmailWhitelisted(email) {
    log('Checking whitelist status for email:', email);
    
    try {
        // First check if email is in auto-whitelist
        const whitelistConfig = getWhitelistConfig();
        log('Whitelist config:', whitelistConfig);
        
        const { autoWhitelistedEmails = [] } = whitelistConfig;
        const isAutoWhitelisted = autoWhitelistedEmails.includes(email);
        log('Auto-whitelist check:', { email, isAutoWhitelisted, autoWhitelistedEmails });

        const driver = await getDriver();
        const session = driver.session();

        try {
            const query = `
                MATCH (u:User {email: $email})
                ${isAutoWhitelisted ? 
                    `SET u.isWhitelisted = true, 
                         u.whitelistedAt = CASE WHEN u.whitelistedAt IS NULL THEN datetime() ELSE u.whitelistedAt END` 
                    : ''}
                RETURN u.isWhitelisted AS isWhitelisted
            `;
            log('Executing Neo4j query:', { query, params: { email } });

            const result = await session.run(query, { email });
            log('Query result:', { 
                records: result.records.length,
                firstRecord: result.records[0]?.get('isWhitelisted')
            });

            if (result.records.length === 0) {
                log('No user found for email:', email);
                return null; // Return null for non-existent users
            }

            // If auto-whitelisted, we know the database was just updated to true
            if (isAutoWhitelisted) {
                log('User is auto-whitelisted:', email);
                return true;
            }

            const whitelistStatus = result.records[0].get('isWhitelisted') === true;
            log('Final whitelist status:', { email, whitelistStatus });
            return whitelistStatus;

        } catch (dbError) {
            log('Database error in isEmailWhitelisted:', {
                error: dbError.message,
                stack: dbError.stack,
                code: dbError.code
            });
            throw dbError;
        } finally {
            await session.close();
        }
    } catch (error) {
        log('Error in isEmailWhitelisted:', {
            error: error.message,
            stack: error.stack,
            name: error.name
        });
        throw error;
    }
}

/**
 * Request whitelist access for an email
 * @param {Object} userData - User data including email and profile info
 * @param {string} userData.id - User's ID from OAuth
 * @param {string} userData.email - User's email
 * @param {string} userData.name - User's name
 * @param {string} [userData.image] - User's profile image URL
 * @returns {Promise<Object>} The whitelist request status
 */
export async function requestWhitelistAccess(userData) {
    const { autoWhitelistedEmails } = getWhitelistConfig()
    const isAutoWhitelisted = autoWhitelistedEmails.includes(userData.email)
    
    const driver = await getDriver()
    const session = driver.session()

    try {
        // Create or update user with appropriate whitelist status
        log('Creating/updating user %s with whitelist status: %s', userData.email, isAutoWhitelisted)
        const result = await session.run(
            `
            MERGE (u:User {id: $id})
            ON CREATE SET 
                u.email = $email,
                u.name = $name,
                u.image = $image,
                u.isWhitelisted = $isWhitelisted,
                u.whitelistedAt = CASE WHEN $isWhitelisted THEN datetime() ELSE null END,
                u.createdAt = datetime()
            ON MATCH SET
                u.email = $email,
                u.name = $name,
                u.image = $image,
                u.isWhitelisted = CASE 
                    WHEN $isWhitelisted THEN true 
                    WHEN u.isWhitelisted THEN true 
                    ELSE false 
                END,
                u.whitelistedAt = CASE 
                    WHEN $isWhitelisted AND u.whitelistedAt IS NULL THEN datetime()
                    WHEN u.whitelistedAt IS NOT NULL THEN u.whitelistedAt
                    ELSE null 
                END
            RETURN u
            `,
            { 
                ...userData,
                isWhitelisted: isAutoWhitelisted
            }
        )

        const user = result.records[0].get('u').properties
        return {
            isWhitelisted: user.isWhitelisted,
            user
        }
    } finally {
        await session.close()
    }
}
