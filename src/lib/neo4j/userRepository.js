import { getDriver } from './client';

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
 * Check if an email is whitelisted
 * @param {string} email - The email to check
 * @returns {Promise<boolean|null>} Whether the email is whitelisted, null if user doesn't exist
 */
export async function isEmailWhitelisted(email) {
    const driver = await getDriver();
    const session = driver.session();

    try {
        const result = await session.run(
            `
            MATCH (u:User {email: $email})
            RETURN u.isWhitelisted AS isWhitelisted
            `,
            { email }
        );

        if (result.records.length === 0) {
            return null; // Return null for non-existent users
        }

        return result.records[0].get('isWhitelisted') === true;
    } finally {
        await session.close();
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
    const driver = await getDriver();
    const session = driver.session();

    try {
        // First check if user exists and is already whitelisted
        const checkResult = await session.run(
            `
            MATCH (u:User {email: $email})
            RETURN u.isWhitelisted as isWhitelisted
            `,
            { email: userData.email }
        );

        // If user exists and is whitelisted, return current status
        if (checkResult.records.length > 0 && checkResult.records[0].get('isWhitelisted') === true) {
            return { isWhitelisted: true };
        }

        // Create or update user with full profile data
        const result = await session.run(
            `
            MERGE (u:User {email: $email})
            ON CREATE SET 
                u.id = $id,
                u.name = $name,
                u.image = $image,
                u.isWhitelisted = false,
                u.createdAt = datetime()
            ON MATCH SET
                u.name = $name,
                u.image = $image
                ${userData.id ? ', u.id = $id' : ''}
            RETURN u
            `,
            {
                id: userData.id || null,
                email: userData.email,
                name: userData.name,
                image: userData.image || null
            }
        );

        const user = result.records[0].get('u').properties;
        return {
            isWhitelisted: user.isWhitelisted || false,
            user
        };
    } finally {
        await session.close();
    }
}
