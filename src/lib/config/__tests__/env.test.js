import { validateEnvConfig, getDbConfig, getStorageConfig, getAuthConfig, getAIConfig, getConfig, ConfigurationError } from '../env'

describe('Environment Configuration', () => {
    const originalEnv = process.env

    beforeEach(() => {
        // Clear and reset environment before each test
        process.env = { ...originalEnv }
        process.env.NODE_ENV = 'development'
        
        // Set up all required environment variables
        process.env.NEO4J_URI = 'neo4j+s://test.databases.neo4j.io'
        process.env.NEO4J_USER = 'neo4j'
        process.env.NEO4J_PASSWORD = 'password'
        process.env.GOOGLE_CLOUD_PROJECT = 'test-project'
        process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/creds.json'
        process.env.GCS_BUCKET_NAME = 'test-bucket'
        process.env.GOOGLE_CLIENT_ID = 'test-client-id'
        process.env.GOOGLE_CLIENT_SECRET = 'test-client-secret'
        process.env.NEXTAUTH_SECRET = 'test-secret'
        process.env.NEXTAUTH_URL = 'http://localhost:3000'
        process.env.ANTHROPIC_API_KEY = 'test-key'
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
            process.env = {
                NODE_ENV: 'development',
                NEO4J_URI: 'bolt://localhost:7687',
                NEO4J_USER: 'neo4j',
                NEO4J_PASSWORD: 'password',
                GOOGLE_CLOUD_PROJECT: 'test-project',
                GOOGLE_APPLICATION_CREDENTIALS: '/path/to/creds.json',
                GCS_BUCKET_NAME: 'test-bucket',
                GOOGLE_CLIENT_ID: 'client-id',
                GOOGLE_CLIENT_SECRET: 'client-secret',
                NEXTAUTH_SECRET: 'secret',
                NEXTAUTH_URL: 'http://localhost:3000',
                ANTHROPIC_API_KEY: 'test-key',
            }
            expect(() => validateEnvConfig('development')).not.toThrow()
        })

        it('should validate production environment', () => {
            process.env = {
                NODE_ENV: 'production',
                NEO4J_URI: 'bolt+s://db.example.com:7687',
                NEO4J_USER: 'neo4j',
                NEO4J_PASSWORD: 'password',
                GOOGLE_CLOUD_PROJECT: 'test-project',
                GOOGLE_APPLICATION_CREDENTIALS: '{"type":"service_account","project_id":"test"}',
                GCS_BUCKET_NAME: 'test-bucket',
                GOOGLE_CLIENT_ID: 'client-id',
                GOOGLE_CLIENT_SECRET: 'client-secret',
                NEXTAUTH_SECRET: 'secret',
                NEXTAUTH_URL: 'https://app.example.com',
                ANTHROPIC_API_KEY: 'test-key',
            }
            expect(() => validateEnvConfig('production')).not.toThrow()
        })

        it('should require HTTPS for NEXTAUTH_URL in production', () => {
            process.env = {
                NODE_ENV: 'production',
                NEO4J_URI: 'bolt+s://db.example.com:7687',
                NEO4J_USER: 'neo4j',
                NEO4J_PASSWORD: 'password',
                GOOGLE_CLOUD_PROJECT: 'test-project',
                GOOGLE_APPLICATION_CREDENTIALS: '{"type":"service_account","project_id":"test"}',
                GCS_BUCKET_NAME: 'test-bucket',
                GOOGLE_CLIENT_ID: 'client-id',
                GOOGLE_CLIENT_SECRET: 'client-secret',
                NEXTAUTH_SECRET: 'secret',
                NEXTAUTH_URL: 'http://app.example.com', // Not HTTPS
                ANTHROPIC_API_KEY: 'test-key',
            }
            expect(() => validateEnvConfig('production')).toThrow(ConfigurationError)
        })

        it('should validate GCS credentials format in development', () => {
            process.env.NODE_ENV = 'development'
            process.env.GOOGLE_APPLICATION_CREDENTIALS = '/invalid/path'
            expect(() => validateEnvConfig('development')).toThrow(ConfigurationError)
        })

        it('should validate GCS credentials format in production', () => {
            process.env.NODE_ENV = 'production'
            process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/file.json'
            expect(() => validateEnvConfig('production')).toThrow(ConfigurationError)
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
            expect(() => getDbConfig())
                .toThrow('Database configuration error')
        })
    })

    describe('getStorageConfig', () => {
        describe('development environment', () => {
            beforeEach(() => {
                process.env.NODE_ENV = 'development'
                process.env.GOOGLE_CLOUD_PROJECT = 'test-project'
                process.env.GCS_BUCKET_NAME = 'test-bucket'
            })

            it('should return storage config with keyfile credentials', () => {
                process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/creds.json'
                const config = getStorageConfig()
                expect(config).toEqual({
                    projectId: 'test-project',
                    credentials: { keyFilename: '/path/to/creds.json' },
                    bucketName: 'test-bucket',
                })
            })

            it('should accept key file path', () => {
                process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/creds.key'
                const config = getStorageConfig()
                expect(config.credentials).toEqual({ keyFilename: '/path/to/creds.key' })
            })

            it('should reject invalid file paths', () => {
                process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/creds.txt'
                expect(() => getStorageConfig()).toThrow(ConfigurationError)
            })
        })

        describe('production environment', () => {
            beforeEach(() => {
                process.env.NODE_ENV = 'production'
                process.env.GOOGLE_CLOUD_PROJECT = 'test-project'
                process.env.GCS_BUCKET_NAME = 'test-bucket'
                process.env.NEXTAUTH_URL = 'https://app.example.com'
            })

            it('should accept valid JSON string', () => {
                process.env.GOOGLE_APPLICATION_CREDENTIALS = '{"type":"service_account","project_id":"test"}'
                const config = getStorageConfig()
                expect(config.credentials).toEqual({
                    type: 'service_account',
                    project_id: 'test'
                })
            })

            it('should reject file paths in production', () => {
                process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/creds.json'
                expect(() => getStorageConfig()).toThrow(ConfigurationError)
            })

            it('should reject invalid JSON', () => {
                process.env.GOOGLE_APPLICATION_CREDENTIALS = '{invalid json}'
                expect(() => getStorageConfig()).toThrow(ConfigurationError)
            })

            it('should reject JSON missing required fields', () => {
                process.env.GOOGLE_APPLICATION_CREDENTIALS = '{"project_id":"test"}'
                expect(() => getStorageConfig()).toThrow(ConfigurationError)
            })

            it('should reject JSON string in development', () => {
                process.env.NODE_ENV = 'development'
                process.env.GOOGLE_APPLICATION_CREDENTIALS = '{"type":"service_account","project_id":"test"}'
                expect(() => getStorageConfig()).toThrow(ConfigurationError)
            })
        })
    })

    describe('getAuthConfig', () => {
        it('should return auth config with development cookie settings', () => {
            process.env.NODE_ENV = 'development'
            const config = getAuthConfig()
            expect(config).toEqual({
                google: {
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret',
                },
                nextAuth: {
                    secret: 'test-secret',
                    url: 'http://localhost:3000',
                },
                cookies: {
                    sessionToken: {
                        name: 'next-auth.session-token',
                        options: {
                            httpOnly: true,
                            sameSite: 'lax',
                            path: '/',
                            secure: false
                        }
                    }
                }
            })
        })

        it('should return auth config with production cookie settings', () => {
            process.env.NODE_ENV = 'production'
            process.env.NEXTAUTH_URL = 'https://app.example.com'
            const config = getAuthConfig()
            expect(config).toEqual({
                google: {
                    clientId: 'test-client-id',
                    clientSecret: 'test-client-secret',
                },
                nextAuth: {
                    secret: 'test-secret',
                    url: 'https://app.example.com',
                },
                cookies: {
                    sessionToken: {
                        name: '__Secure-next-auth.session-token',
                        options: {
                            httpOnly: true,
                            sameSite: 'lax',
                            path: '/',
                            secure: true
                        }
                    }
                }
            })
        })

        it('should throw ConfigurationError if auth config is invalid', () => {
            delete process.env.GOOGLE_CLIENT_ID
            expect(() => getAuthConfig())
                .toThrow(ConfigurationError)
            expect(() => getAuthConfig())
                .toThrow('Authentication configuration error')
        })
    })

    describe('getAIConfig', () => {
        it('should return AI config', () => {
            const config = getAIConfig()
            expect(config).toEqual({
                anthropic: {
                    apiKey: 'test-key'
                }
            })
        })

        it('should throw ConfigurationError if AI config is invalid', () => {
            delete process.env.ANTHROPIC_API_KEY
            expect(() => getAIConfig())
                .toThrow(ConfigurationError)
            expect(() => getAIConfig())
                .toThrow('AI services configuration error')
        })
    })

    describe('getConfig', () => {
        it('should return complete config', () => {
            const config = getConfig()
            expect(config).toEqual({
                environment: 'development',
                debug: '',
                db: {
                    uri: 'neo4j+s://test.databases.neo4j.io',
                    user: 'neo4j',
                    password: 'password',
                },
                storage: {
                    projectId: 'test-project',
                    credentials: { keyFilename: '/path/to/creds.json' },
                    bucketName: 'test-bucket',
                },
                auth: {
                    google: {
                        clientId: 'test-client-id',
                        clientSecret: 'test-client-secret',
                    },
                    nextAuth: {
                        secret: 'test-secret',
                        url: 'http://localhost:3000',
                    },
                    cookies: {
                        sessionToken: {
                            name: 'next-auth.session-token',
                            options: {
                                httpOnly: true,
                                sameSite: 'lax',
                                path: '/',
                                secure: false
                            }
                        }
                    }
                },
                ai: {
                    anthropic: {
                        apiKey: 'test-key'
                    }
                },
                isDevelopment: true,
            })
        })

        it('should throw ConfigurationError if any config is invalid', () => {
            delete process.env.NEO4J_URI
            expect(() => getConfig())
                .toThrow(ConfigurationError)
            expect(() => getConfig())
                .toThrow('Configuration error')
        })
    })
})
