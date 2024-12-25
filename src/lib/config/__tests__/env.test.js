import { validateEnvConfig, getDbConfig, getStorageConfig, getConfig } from '../env';

describe('Environment Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Clear and reset environment before each test
    process.env = { ...originalEnv };
    process.env.NODE_ENV = 'development';
  });

  afterAll(() => {
    // Restore original environment after all tests
    process.env = originalEnv;
  });

  describe('validateEnvConfig', () => {
    it('should throw error if required env vars are missing', () => {
      delete process.env.NEO4J_URI;
      expect(() => validateEnvConfig('development')).toThrow('Missing required environment variables: NEO4J_URI');
    });

    it('should throw error for invalid environment', () => {
      expect(() => validateEnvConfig('invalid')).toThrow('Invalid environment: invalid');
    });

    it('should not throw error when all required vars are present', () => {
      // Set all required development variables
      process.env.NEO4J_URI = 'neo4j+s://test.databases.neo4j.io';
      process.env.NEO4J_USER = 'neo4j';
      process.env.NEO4J_PASSWORD = 'password';
      process.env.GOOGLE_CLOUD_PROJECT = 'test-project';
      process.env.GOOGLE_APPLICATION_CREDENTIALS = 'path/to/creds.json';
      process.env.GCS_BUCKET_NAME = 'test-bucket';

      expect(() => validateEnvConfig('development')).not.toThrow();
    });
  });

  describe('getDbConfig', () => {
    it('should return development database config', () => {
      process.env.NEO4J_URI = 'neo4j+s://94855e5a.databases.neo4j.io';
      process.env.NEO4J_USER = 'neo4j';
      process.env.NEO4J_PASSWORD = 'test-password';

      const config = getDbConfig();
      expect(config).toEqual({
        uri: 'neo4j+s://94855e5a.databases.neo4j.io',
        user: 'neo4j',
        password: 'test-password',
      });
    });

    it('should return production database config', () => {
      process.env.NODE_ENV = 'production';
      process.env.PROD_NEO4J_URI = 'neo4j+s://prod.databases.neo4j.io';
      process.env.PROD_NEO4J_USER = 'neo4j';
      process.env.PROD_NEO4J_PASSWORD = 'prod-password';

      const config = getDbConfig();
      expect(config).toEqual({
        uri: 'neo4j+s://prod.databases.neo4j.io',
        user: 'neo4j',
        password: 'prod-password',
      });
    });
  });

  describe('getStorageConfig', () => {
    it('should return development storage config', () => {
      process.env.GOOGLE_CLOUD_PROJECT = 'dev-project';
      process.env.GOOGLE_APPLICATION_CREDENTIALS = 'dev-creds.json';
      process.env.GCS_BUCKET_NAME = 'dev-bucket';

      const config = getStorageConfig();
      expect(config).toEqual({
        projectId: 'dev-project',
        credentials: 'dev-creds.json',
        bucketName: 'dev-bucket',
      });
    });

    it('should return production storage config', () => {
      process.env.NODE_ENV = 'production';
      process.env.PROD_GOOGLE_CLOUD_PROJECT = 'prod-project';
      process.env.PROD_GOOGLE_APPLICATION_CREDENTIALS = 'prod-creds.json';
      process.env.PROD_GCS_BUCKET_NAME = 'prod-bucket';

      const config = getStorageConfig();
      expect(config).toEqual({
        projectId: 'prod-project',
        credentials: 'prod-creds.json',
        bucketName: 'prod-bucket',
      });
    });
  });

  describe('getConfig', () => {
    beforeEach(() => {
      // Set up all required environment variables
      process.env.NODE_ENV = 'development';
      process.env.PORT = '3000';
      process.env.NEO4J_URI = 'neo4j+s://94855e5a.databases.neo4j.io';
      process.env.NEO4J_USER = 'neo4j';
      process.env.NEO4J_PASSWORD = 'test-password';
      process.env.GOOGLE_CLOUD_PROJECT = 'dev-project';
      process.env.GOOGLE_APPLICATION_CREDENTIALS = 'dev-creds.json';
      process.env.GCS_BUCKET_NAME = 'dev-bucket';
      process.env.FRONTEND_URL = 'http://localhost:3000';
      process.env.GOOGLE_CLIENT_ID = 'test-client-id';
      process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret';
      process.env.GOOGLE_CALLBACK_URL = 'http://localhost:3000/auth/callback';
      process.env.SKIP_IMAGE_INIT = 'false';

      // Set production variables that should be removed in development
      process.env.PROD_NEO4J_PASSWORD = 'prod-password';
      process.env.PROD_GOOGLE_APPLICATION_CREDENTIALS = 'prod-creds.json';
    });

    it('should return complete configuration', () => {
      const config = getConfig();
      expect(config).toMatchObject({
        env: 'development',
        port: 3000,
        db: {
          uri: 'neo4j+s://94855e5a.databases.neo4j.io',
          user: 'neo4j',
          password: 'test-password',
        },
        storage: {
          projectId: 'dev-project',
          credentials: 'dev-creds.json',
          bucketName: 'dev-bucket',
        },
        frontend: {
          url: 'http://localhost:3000',
        },
        google: {
          clientId: 'test-client-id',
          clientSecret: 'test-client-secret',
          callbackUrl: 'http://localhost:3000/auth/callback',
        },
        app: {
          skipImageInit: false,
        },
      });
    });

    it('should remove production credentials in development mode', () => {
      getConfig();
      expect(process.env.PROD_NEO4J_PASSWORD).toBeUndefined();
      expect(process.env.PROD_GOOGLE_APPLICATION_CREDENTIALS).toBeUndefined();
    });
  });
});
