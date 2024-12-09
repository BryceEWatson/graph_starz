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
                createdAt: datetime()
            })
            RETURN u
            `,
            {
                id: userData.id,
                name: userData.name,
                email: userData.email,
                image: userData.image || null,
                isTestUser: userData.isTestUser || false
            }
        );

        const user = result.records[0].get('u').properties;
        return user;
    } finally {
        await session.close();
    }
}
