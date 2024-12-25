import debug from 'debug';

const log = debug('app:init:auth');

// Mock Google OAuth user data for development testing
const TEST_USER = {
  id: 'test-user-1',
  name: 'Test User',
  email: 'test@example.com',
  image: 'https://example.com/test-avatar.jpg'
};

/**
 * Validate the authentication configuration and test basic auth functionality
 * @returns {Promise<{success: boolean, errors: string[], testUser?: Object}>}
 */
export async function initializeAuth() {
  log('Starting auth initialization check...');
  let success = true;
  let errors = [];

  try {
    // Add debug logging for environment variables
    log('Checking auth environment variables:');
    log('NEXTAUTH_URL:', process.env.NEXTAUTH_URL || 'not set');
    log('NEXTAUTH_SECRET length:', process.env.NEXTAUTH_SECRET ? process.env.NEXTAUTH_SECRET.length : 'not set');
    log('GOOGLE_CLIENT_ID length:', process.env.GOOGLE_CLIENT_ID ? process.env.GOOGLE_CLIENT_ID.length : 'not set');
    log('GOOGLE_CLIENT_SECRET length:', process.env.GOOGLE_CLIENT_SECRET ? process.env.GOOGLE_CLIENT_SECRET.length : 'not set');

    // Validate critical auth configuration
    const requiredConfig = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
      GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
      GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
    };

    // Validate presence and format of configuration
    for (const [key, value] of Object.entries(requiredConfig)) {
      if (!value) {
        log(`Missing ${key}`);
        errors.push(`Missing ${key}`);
        success = false;
        continue;
      }

      // Validate URL format
      if (key === 'NEXTAUTH_URL') {
        try {
          new URL(value);
          log(`Valid ${key} URL: ${value}`);
        } catch (_urlError) {
          const error = `Invalid ${key} URL format: ${value}`;
          log(error);
          errors.push(error);
          success = false;
        }
      }

      // Validate secret length
      if (key === 'NEXTAUTH_SECRET' && value.length < 32) {
        const error = `${key} is too short (min 32 characters)`;
        log(error);
        errors.push(error);
        success = false;
      }

      // Validate Google client ID format (should be a long string ending with .apps.googleusercontent.com)
      if (key === 'GOOGLE_CLIENT_ID' && !value.endsWith('.apps.googleusercontent.com')) {
        const error = `${key} appears invalid (should end with .apps.googleusercontent.com)`;
        log(error);
        errors.push(error);
        success = false;
      }

      log(`Found ${key}`);
    }

    if (!success) {
      throw new Error(`Auth configuration validation failed: ${errors.join(', ')}`);
    }
    log('Auth configuration validated');

    // Always return test user for initialization
    if (!TEST_USER?.id) {
      const error = 'TEST_USER is missing required id field';
      log(error);
      errors.push(error);
      success = false;
      throw new Error(error);
    }
    log(`Using test user with id: ${TEST_USER.id}`);
    return { success, errors, testUser: TEST_USER };

  } catch (error) {
    success = false;
    errors.push(error.message);
    log('Auth initialization failed:', error);
    throw new Error(`Auth initialization failed: ${error.message}`);
  }
}
