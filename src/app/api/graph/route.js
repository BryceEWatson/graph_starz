import { NextResponse } from 'next/server';
import { initialize, getDriver } from '../../../lib/neo4j/api-client';
import debug from 'debug';

const log = debug('graph:api');

// Force dynamic route to prevent caching
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        log('Initializing Neo4j...');
        // Initialize Neo4j using our shared client
        await initialize();
        const driver = getDriver();
        
        if (!driver) {
            throw new Error('Failed to get Neo4j driver');
        }
        
        log('Creating session...');
        const session = driver.session();
        try {
            // First, check if we have any data
            log('Checking for data...');
            const checkResult = await session.run(`
                MATCH (n)
                RETURN count(n) as nodeCount
            `);
            
            const nodeCount = checkResult.records[0].get('nodeCount').toNumber();
            log('Found %d nodes in total', nodeCount);
            
            if (nodeCount === 0) {
                throw new Error('No data found in the database. Please run the database initialization script.');
            }
            
            // Now check for our specific data structure
            log('Checking graph structure...');
            const structureResult = await session.run(`
                MATCH (u:User)
                OPTIONAL MATCH (u)-[:UPLOADED]->(i:Image)
                OPTIONAL MATCH (i)-[:HAS_ATTRIBUTE]->(a:Attribute)
                RETURN 
                    count(DISTINCT u) as users,
                    count(DISTINCT i) as images,
                    count(DISTINCT a) as attributes
            `);
            
            const stats = structureResult.records[0];
            log('Graph stats: %d users, %d images, %d attributes', 
                stats.get('users').toNumber(),
                stats.get('images').toNumber(),
                stats.get('attributes').toNumber()
            );
            
            // Now fetch the actual graph data
            log('Fetching graph data...');
            const result = await session.run(`
                MATCH (u:User)
                OPTIONAL MATCH (u)-[up:UPLOADED]->(i:Image)
                OPTIONAL MATCH (i)-[ha:HAS_ATTRIBUTE]->(a:Attribute)
                RETURN 
                    u.userId as userId,
                    i.imageId as imageId,
                    i.url as imageUrl,
                    a.type as attrType,
                    a.value as attrValue,
                    a.attributeId as attrId
                LIMIT 100
            `);
            
            log('Processing %d records...', result.records.length);
            // Transform data into nodes and links format for D3
            const nodes = new Map();
            const links = [];
            
            result.records.forEach((record, index) => {
                log('Processing record %d...', index + 1);
                
                const userId = record.get('userId');
                if (userId) {
                    // Add user node if not exists
                    if (!nodes.has(userId)) {
                        nodes.set(userId, {
                            id: userId,
                            type: 'user',
                            label: userId
                        });
                    }
                    
                    const imageId = record.get('imageId');
                    if (imageId) {
                        // Add image node if not exists
                        if (!nodes.has(imageId)) {
                            nodes.set(imageId, {
                                id: imageId,
                                type: 'image',
                                label: imageId,
                                url: record.get('imageUrl')
                            });
                        }
                        
                        // Add user->image link
                        links.push({
                            source: userId,
                            target: imageId,
                            type: 'UPLOADED'
                        });
                        
                        const attrId = record.get('attrId');
                        if (attrId) {
                            // Add attribute node if not exists
                            if (!nodes.has(attrId)) {
                                const attrType = record.get('attrType');
                                const attrValue = record.get('attrValue');
                                nodes.set(attrId, {
                                    id: attrId,
                                    type: 'attribute',
                                    label: `${attrType}: ${attrValue}`
                                });
                            }
                            
                            // Add image->attribute link
                            links.push({
                                source: imageId,
                                target: attrId,
                                type: 'HAS_ATTRIBUTE'
                            });
                        }
                    }
                }
            });
            
            if (nodes.size === 0) {
                throw new Error('No valid graph data found. Please check the database content.');
            }
            
            log('Returning data with %d nodes and %d links', nodes.size, links.length);
            return NextResponse.json({
                nodes: Array.from(nodes.values()),
                links,
                stats: {
                    users: stats.get('users').toNumber(),
                    images: stats.get('images').toNumber(),
                    attributes: stats.get('attributes').toNumber()
                }
            });
        } finally {
            log('Closing session...');
            await session.close();
        }
    } catch (error) {
        log('Error: %O', error);
        return NextResponse.json({
            error: 'Failed to fetch graph data',
            details: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }, { status: 500 });
    }
}
