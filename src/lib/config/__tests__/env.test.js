import { validateEnvConfig, getDbConfig, getStorageConfig, getAuthConfig, getAIConfig, getConfig, ConfigurationError } from '../env'
import path from 'path'

jest.mock('../env', () => {
    const actual = jest.requireActual('../env');
    return {
        ...actual,
        getStorageConfig: jest.fn(() => ({
            credentials: require('../../__mocks__/test-credentials.json'),
            bucketName: 'test-bucket'
        }))
    };
});

jest.mock('../../config/storage-credentials.json', () => ({
  project_id: 'test-project',
  private_key: 'test-key',
  client_email: 'test@example.com',
  mock: true
}));

describe('Environment Configuration', () => {
    const originalEnv = process.env

    beforeAll(() => {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = path.resolve(
            __dirname, 
            '../../__mocks__/test-credentials.json'
        );
    })

    beforeEach(() => {
        // Clear and reset environment before each test
        process.env = { ...originalEnv }
        process.env.NODE_ENV = 'development'
        
        // Set up all required environment variables
        process.env.NEO4J_URI = 'neo4j+s://test.databases.neo4j.io'
        process.env.NEO4J_USER = 'neo4j'
        process.env.NEO4J_PASSWORD = 'password'
        process.env.GOOGLE_CLOUD_PROJECT = 'test-project'
        process.env.GCS_BUCKET_NAME = 'test-bucket'
        process.env.GOOGLE_CLIENT_ID = 'test-client-id'
        process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
        process.env.NEXTAUTH_SECRET = 'test-secret'
        process.env.NEXTAUTH_URL = 'http://localhost:3000'
        process.env.FRONTEND_URL = 'http://localhost:3000'
        process.env.ANTHROPIC_API_KEY = 'test-key'
    })

    beforeEach(() => {
        process.env.NODE_ENV = 'test';
        process.env.GOOGLE_APPLICATION_CREDENTIALS = '';
    });

    afterEach(() => {
        jest.resetModules();
    })

    afterAll(() => {
        // Restore original environment after all tests
        process.env = originalEnv
    })

    describe('validateEnvConfig', () => {
        it('should throw ConfigurationError if required env vars are missing', () => {
            delete process.env.NEO4J_URI
            expect(() => validateEnvConfig('development'))
                .toThrow(ConfigurationError)
            expect(() => validateEnvConfig('development'))
                .toThrow('Missing required environment variables: NEO4J_URI')
        })

        it('should throw ConfigurationError for invalid environment', () => {
            expect(() => validateEnvConfig('invalid'))
                .toThrow(ConfigurationError)
            expect(() => validateEnvConfig('invalid'))
                .toThrow('Invalid environment: invalid. Must be \'development\' or \'production\'')
        })

        it('should throw ConfigurationError for invalid types', () => {
            process.env.NEO4J_URI = 123 // Invalid type for string
            expect(() => validateEnvConfig('development'))
                .toThrow(ConfigurationError)
            expect(() => validateEnvConfig('development'))
                .toThrow('Environment variable type errors')
        })

        it('should validate development environment', () => {
            expect(() => validateEnvConfig('development')).not.toThrow()
        })

        it('should validate production environment', () => {
            process.env.NODE_ENV = 'production'
            process.env.NEXTAUTH_URL = 'https://app.example.com'
            process.env.FRONTEND_URL = 'https://app.example.com'
            process.env.GOOGLE_APPLICATION_CREDENTIALS = '{"type":"service_account","project_id":"test"}'
            expect(() => validateEnvConfig('production')).not.toThrow()
        })

        it('should require HTTPS for NEXTAUTH_URL in production', () => {
            process.env.NODE_ENV = 'production'
            process.env.NEXTAUTH_URL = 'http://app.example.com'
            expect(() => validateEnvConfig('production'))
                .toThrow(ConfigurationError)
        })
    })

    describe('getDbConfig', () => {
        it('should return database config', () => {
            const config = getDbConfig()
            expect(config).toEqual({
                uri: 'neo4j+s://test.databases.neo4j.io',
                user: 'neo4j',
                password: 'password',
            })
        })

        it('should throw ConfigurationError if database config is invalid', () => {
            delete process.env.NEO4J_URI
            expect(() => getDbConfig())
                .toThrow(ConfigurationError)
        })
    })

    describe('getStorageConfig', () => {
        describe('development environment', () => {
            beforeEach(() => {
                process.env.NODE_ENV = 'development'
            })

            it('should return storage config with keyfile credentials', () => {
                const config = getStorageConfig()
                expect(config).toMatchObject({
                    projectId: 'test-project',
                    bucketName: 'test-bucket',
                })
                expect(config.credentials).toBeDefined()
            })

            it('should reject JSON string in development', () => {
                process.env.GOOGLE_APPLICATION_CREDENTIALS = '{"type":"service_account","project_id":"test"}'
                expect(() => getStorageConfig())
                    .toThrow(ConfigurationError)
            })
        })

        describe('production environment', () => {
            beforeEach(() => {
                process.env.NODE_ENV = 'production'
            })

            it('should accept valid JSON string', () => {
                process.env.GOOGLE_APPLICATION_CREDENTIALS = '{"type":"service_account","project_id":"test"}'
                const config = getStorageConfig()
                expect(config).toMatchObject({
                    projectId: 'test-project',
                    bucketName: 'test-bucket',
                })
                expect(config.credentials).toBeDefined()
            })

            it('should reject file paths in production', () => {
                process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/creds.json'
                expect(() => getStorageConfig())
                    .toThrow(ConfigurationError)
            })
        })

        describe('getStorageConfig environment handling', () => {
            it('should use mock credentials in test environment', async () => {
                process.env.NODE_ENV = 'test';
                const config = await getStorageConfig();
                expect(config.credentials).toEqual({
                    mock: true,
                    project_id: expect.any(String),
                    private_key: 'test-key'
                });
            });
        })
    })

    describe('getAuthConfig', () => {
        it('should return auth config with required fields', () => {
            const config = getAuthConfig()
            expect(config).toMatchObject({
                google: {
                    clientId: expect.any(String),
                    clientSecret: expect.any(String),
                },
                nextAuth: {
                    secret: expect.any(String),
                    url: expect.any(String),
                },
                cookies: expect.any(Object)
            })
        })

        it('should configure secure cookies in production', () => {
            process.env.NODE_ENV = 'production'
            process.env.NEXTAUTH_URL = 'https://app.example.com'
            const config = getAuthConfig()
            expect(config.cookies.secure).toBe(true)
            expect(config.cookies.sameSite).toBe('strict')
        })
    })

    describe('getAIConfig', () => {
        it('should return AI config with required fields', () => {
            const config = getAIConfig()
            expect(config).toMatchObject({
                anthropic: {
                    apiKey: expect.any(String)
                }
            })
        })

        it('should throw ConfigurationError if AI config is invalid', () => {
            delete process.env.ANTHROPIC_API_KEY
            expect(() => getAIConfig())
                .toThrow(ConfigurationError)
        })
    })

    describe('getConfig', () => {
        it('should return complete config with required fields', () => {
            const config = getConfig()
            expect(config).toMatchObject({
                environment: expect.any(String),
                db: expect.any(Object),
                storage: expect.any(Object),
                auth: expect.any(Object),
                ai: expect.any(Object),
                isDevelopment: expect.any(Boolean)
            })
        })

        it('should throw ConfigurationError if any config is invalid', () => {
            delete process.env.NEO4J_URI
            expect(() => getConfig())
                .toThrow(ConfigurationError)
        })
    })
})
