import debug from 'debug';

const log = debug('app:init:auth');

// Mock Google OAuth user data
const TEST_USER = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@example.com',
  image: 'https://example.com/test-avatar.jpg'
};

/**
 * Test the authentication flow without actually contacting Google
 */
export async function initializeAuth() {
  log('Starting auth initialization check...');
  let success = true;
  let errors = [];

  try {
    // Test user creation/lookup endpoint
    log('Testing user creation endpoint...');
    const response = await fetch('http://localhost:3000/api/auth/user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Test-Mode': 'true'
      },
      body: JSON.stringify(TEST_USER)
    });

    if (!response.ok) {
      throw new Error(`Failed to create test user: ${response.status}`);
    }

    const result = await response.json();
    log('Test user created/verified:', result.id);

    // Test session handling
    log('Testing session handling...');
    const sessionResponse = await fetch('http://localhost:3000/api/auth/session', {
      headers: {
        'X-Test-Mode': 'true',
        'X-Test-User': TEST_USER.id
      }
    });

    if (!sessionResponse.ok) {
      throw new Error(`Failed to verify session: ${sessionResponse.status}`);
    }

    // Just verify we can parse the response
    await sessionResponse.json();
    log('Session verified for test user');

  } catch (error) {
    success = false;
    errors.push(error.message);
    log('Auth initialization failed:', error);
  }

  return {
    success,
    errors,
    testUser: TEST_USER
  };
}
