/* eslint-disable @typescript-eslint/no-require-imports */
const neo4j = require('neo4j-driver');
const dotenv = require('dotenv');
const debug = require('debug');

const log = debug('db:init');

async function initializeDb() {
    log('Starting database initialization...');
    
    // Connect to Neo4j
    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    if (!uri || !user || !password) {
        throw new Error('Missing Neo4j credentials');
    }

    const driver = neo4j.driver(
        uri,
        neo4j.auth.basic(user, password)
    );

    const session = driver.session();

    try {
        // Create constraints
        log('Creating constraints...');
        await session.run(`
            CREATE CONSTRAINT user_id_unique IF NOT EXISTS 
            FOR (u:User) REQUIRE u.userId IS UNIQUE
        `);
        await session.run(`
            CREATE CONSTRAINT image_id_unique IF NOT EXISTS 
            FOR (i:Image) REQUIRE i.imageId IS UNIQUE
        `);
        await session.run(`
            CREATE CONSTRAINT attribute_id_unique IF NOT EXISTS 
            FOR (a:Attribute) REQUIRE a.attributeId IS UNIQUE
        `);

        // Create indexes
        log('Creating indexes...');
        await session.run(`
            CREATE INDEX user_lastLogin IF NOT EXISTS 
            FOR (u:User) ON (u.lastLogin)
        `);
        await session.run(`
            CREATE INDEX image_uploadedAt IF NOT EXISTS 
            FOR (i:Image) ON (i.uploadedAt)
        `);
        await session.run(`
            CREATE INDEX attribute_type_value IF NOT EXISTS 
            FOR (a:Attribute) ON (a.type, a.value)
        `);

        // Clear existing sample data
        log('Clearing existing sample data...');
        await session.run(`
            MATCH (n)
            WHERE n.isSample = true
            DETACH DELETE n
        `);

        // Create sample users
        log('Creating sample users...');
        await session.run(`
            CREATE (u1:User {
                userId: 'sample-user-1',
                name: 'Alice Smith',
                email: 'alice@example.com',
                createdAt: datetime(),
                lastLogin: datetime(),
                isSample: true
            })
            CREATE (u2:User {
                userId: 'sample-user-2',
                name: 'Bob Johnson',
                email: 'bob@example.com',
                createdAt: datetime(),
                lastLogin: datetime(),
                isSample: true
            })
        `);

        // Create sample images
        log('Creating sample images...');
        await session.run(`
            MATCH (u1:User {userId: 'sample-user-1'})
            MATCH (u2:User {userId: 'sample-user-2'})
            
            CREATE (i1:Image {
                imageId: 'sample-image-1',
                url: 'https://storage.googleapis.com/sample/mountain.jpg',
                title: 'Mountain Sunset',
                description: 'A beautiful sunset over the mountains',
                createdAt: datetime(),
                uploadedAt: datetime(),
                width: 1920,
                height: 1080,
                status: 'active',
                isSample: true
            })
            CREATE (i2:Image {
                imageId: 'sample-image-2',
                url: 'https://storage.googleapis.com/sample/beach.jpg',
                title: 'Peaceful Beach',
                description: 'Waves crashing on a sandy beach',
                createdAt: datetime(),
                uploadedAt: datetime(),
                width: 1920,
                height: 1080,
                status: 'active',
                isSample: true
            })
            
            // Create relationships between users and images
            CREATE (u1)-[:UPLOADED {timestamp: datetime()}]->(i1)
            CREATE (u2)-[:UPLOADED {timestamp: datetime()}]->(i2)
        `);

        // Create sample attributes
        log('Creating sample attributes...');
        await session.run(`
            MATCH (i1:Image {imageId: 'sample-image-1'})
            MATCH (i2:Image {imageId: 'sample-image-2'})
            
            // Create style attributes
            CREATE (a1:Attribute {
                attributeId: 'sample-attr-landscape',
                type: 'style',
                value: 'landscape',
                confidence: 0.95,
                isSample: true
            })
            CREATE (a2:Attribute {
                attributeId: 'sample-attr-nature',
                type: 'style',
                value: 'nature',
                confidence: 0.90,
                isSample: true
            })
            
            // Create color attributes
            CREATE (a3:Attribute {
                attributeId: 'sample-attr-blue',
                type: 'color',
                value: 'blue',
                confidence: 0.85,
                isSample: true
            })
            CREATE (a4:Attribute {
                attributeId: 'sample-attr-orange',
                type: 'color',
                value: 'orange',
                confidence: 0.80,
                isSample: true
            })
            
            // Create mood attributes
            CREATE (a5:Attribute {
                attributeId: 'sample-attr-peaceful',
                type: 'mood',
                value: 'peaceful',
                confidence: 0.75,
                isSample: true
            })
            
            // Create object attributes
            CREATE (a6:Attribute {
                attributeId: 'sample-attr-mountain',
                type: 'object',
                value: 'mountain',
                confidence: 0.95,
                isSample: true
            })
            CREATE (a7:Attribute {
                attributeId: 'sample-attr-beach',
                type: 'object',
                value: 'beach',
                confidence: 0.95,
                isSample: true
            })
            
            // Connect images to attributes
            CREATE (i1)-[:HAS_ATTRIBUTE {confidence: 0.95, timestamp: datetime()}]->(a1)
            CREATE (i1)-[:HAS_ATTRIBUTE {confidence: 0.90, timestamp: datetime()}]->(a2)
            CREATE (i1)-[:HAS_ATTRIBUTE {confidence: 0.85, timestamp: datetime()}]->(a4)
            CREATE (i1)-[:HAS_ATTRIBUTE {confidence: 0.95, timestamp: datetime()}]->(a6)
            
            CREATE (i2)-[:HAS_ATTRIBUTE {confidence: 0.90, timestamp: datetime()}]->(a2)
            CREATE (i2)-[:HAS_ATTRIBUTE {confidence: 0.85, timestamp: datetime()}]->(a3)
            CREATE (i2)-[:HAS_ATTRIBUTE {confidence: 0.75, timestamp: datetime()}]->(a5)
            CREATE (i2)-[:HAS_ATTRIBUTE {confidence: 0.95, timestamp: datetime()}]->(a7)
        `);

        log('Database initialization completed successfully');
    } catch (error) {
        log.error('Error initializing database:', error);
        throw error;
    } finally {
        await session.close();
        await driver.close();
    }
}

// Load environment variables
dotenv.config();

// Allow running directly from command line
if (require.main === module) {
    initializeDb()
        .then(() => process.exit(0))
        .catch(error => {
            console.error('[DB-INIT] Failed:', error);
            process.exit(1);
        });
}

module.exports = initializeDb;
