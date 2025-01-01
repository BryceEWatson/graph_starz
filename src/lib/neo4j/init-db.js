/* eslint-disable @typescript-eslint/no-require-imports */
const neo4j = require('neo4j-driver')
const debug = require('debug')
const { Storage } = require('@google-cloud/storage')
const { getConfig } = require('../config/env')

const log = debug('db:init:main')
const errorLog = debug('db:init:error')

/**
 * Clear all files from the GCS bucket
 * @returns {Promise<void>}
 */
async function clearBucket() {
    const config = getConfig()
    const { projectId, credentials, bucketName } = config.storage

    const storage = new Storage({
        projectId,
        ...credentials
    })

    const bucket = storage.bucket(bucketName)
    const [files] = await bucket.getFiles()
    log(`Clearing ${files.length} files from bucket ${bucketName}...`)
    await Promise.all(files.map(file => file.delete()))
    log('Bucket cleared successfully')
}

/**
 * Initialize database with fresh schema
 * @returns {Promise<void>}
 */
async function initializeDb() {
    let session
    let driver
    
    try {
        log('Starting database initialization...')
        const config = getConfig()
        log('Environment:', config.environment)

        // Clear GCS bucket
        log('Clearing GCS bucket...')
        await clearBucket()
        
        // Initialize Neo4j driver
        const { uri, user, password } = config.db
        driver = neo4j.driver(uri, neo4j.auth.basic(user, password))

        // Test connection
        await driver.verifyConnectivity()
        log('Successfully connected to Neo4j')

        session = driver.session()

        // Drop all existing constraints and indexes
        log('Dropping existing constraints...')
        const constraints = await session.run('SHOW CONSTRAINTS')
        for (const record of constraints.records) {
            const name = record.get('name')
            if (name) {
                await session.run(`DROP CONSTRAINT ${name}`)
            }
        }

        log('Dropping existing indexes...')
        const indexes = await session.run('SHOW INDEXES')
        for (const record of indexes.records) {
            const name = record.get('name')
            if (name) {
                await session.run(`DROP INDEX ${name}`)
            }
        }

        // Create constraints
        log('Creating constraints...')
        await session.run('CREATE CONSTRAINT user_id IF NOT EXISTS FOR (u:User) REQUIRE u.id IS UNIQUE')
        await session.run('CREATE CONSTRAINT image_id IF NOT EXISTS FOR (i:Image) REQUIRE i.id IS UNIQUE')
        await session.run('CREATE CONSTRAINT tag_id IF NOT EXISTS FOR (t:Tag) REQUIRE t.id IS UNIQUE')

        log('Database initialization completed successfully')
    } catch (error) {
        errorLog('Error during database initialization:', error)
        throw error
    } finally {
        if (session) {
            await session.close()
        }
        if (driver) {
            await driver.close()
        }
    }
}

// Allow running directly from command line
if (require.main === module) {
    initializeDb()
        .then(() => {
            log('Database initialization completed')
            process.exit(0)
        })
        .catch(error => {
            errorLog('Failed to initialize database:', error)
            process.exit(1)
        })
}
