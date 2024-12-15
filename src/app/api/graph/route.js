import { NextResponse } from 'next/server';
import { initialize, getDriver } from '../../../lib/neo4j/api-client';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/options';
import debug from 'debug';
import { rateLimit } from '../../../lib/rate-limit';

const log = debug('graph:api');

// Force dynamic route to prevent caching
export const dynamic = 'force-dynamic';

// Configure rate limiting
const limiter = rateLimit({
    interval: 60 * 1000, // 1 minute
    uniqueTokenPerInterval: 500 // Max 500 users per interval
});

// Helper function to convert Neo4j integers to JavaScript numbers
function convertNeo4jIntegers(obj) {
    if (obj === null || obj === undefined) return obj;
    if (typeof obj.toNumber === 'function') return obj.toNumber();
    if (Array.isArray(obj)) return obj.map(convertNeo4jIntegers);
    if (typeof obj === 'object') {
        return Object.fromEntries(
            Object.entries(obj).map(([key, value]) => [key, convertNeo4jIntegers(value)])
        );
    }
    return obj;
}

export async function GET() {
    try {
        // Apply rate limiting
        try {
            await limiter.check(10); // 10 requests per minute
        } catch {
            return NextResponse.json(
                { error: 'Too many requests. Please try again later.' },
                { status: 429 }
            );
        }

        // Check authentication
        const authSession = await getServerSession(authOptions);
        if (!authSession?.user?.email) {
            log('Unauthorized access attempt');
            return NextResponse.json(
                { error: 'Unauthorized: Please sign in to view graph data' },
                { status: 401 }
            );
        }

        log('Initializing Neo4j...');
        // Initialize Neo4j using our shared client
        await initialize();
        const driver = getDriver();

        if (!driver) {
            throw new Error('Failed to get Neo4j driver');
        }

        const dbSession = driver.session();

        try {
            // Verify database connection
            try {
                await dbSession.run('RETURN 1');
            } catch (error) {
                console.error('Failed to connect to Neo4j:', error);
                return NextResponse.json({ error: 'Database connection failed' }, { status: 503 });
            }

            try {
                // First, check if we have any data
                log('Checking for data...');
                const checkResult = await dbSession.run(`
                    MATCH (n)
                    RETURN count(n) as nodeCount
                `);

                const nodeCount = checkResult.records[0].get('nodeCount').toNumber();

                if (nodeCount === 0) {
                    log('No data found in database');
                    return NextResponse.json({
                        nodes: [],
                        links: [],
                        stats: { users: 0, images: 0, colors: 0, objects: 0 }
                    });
                }

                // Get graph data with stats
                log('Fetching graph data...');
                const result = await dbSession.run(`
                    MATCH (n)
                    WITH collect(DISTINCT n) as allNodes
                    // Get relationships
                    OPTIONAL MATCH (n)-[r]->(m)
                    WITH allNodes, collect(DISTINCT r) as allRels

                    // Calculate stats
                    WITH allNodes, allRels,
                         size([n IN allNodes WHERE n:User]) as userCount,
                         size([n IN allNodes WHERE n:Image]) as imageCount,
                         size([n IN allNodes WHERE n:Attribute AND n.name = 'color']) as colorCount,
                         size([n IN allNodes WHERE n:Attribute AND n.name = 'object']) as objectCount,
                         size([n IN allNodes WHERE n:Attribute AND n.name = 'style']) as styleCount,
                         size([n IN allNodes WHERE n:Attribute AND n.name = 'technique']) as techniqueCount,
                         size([n IN allNodes WHERE n:Attribute AND n.name = 'mood']) as moodCount,
                         size([n IN allNodes WHERE n:Attribute AND n.name = 'composition']) as compositionCount

                    // Return final result with layout hints
                    RETURN {
                        nodes: [node in allNodes | {
                            id: toString(id(node)),
                            type: CASE 
                                WHEN node:User THEN 'user'
                                WHEN node:Image THEN 'image'
                                WHEN node:Attribute THEN node.name
                                ELSE toLower(head(labels(node)))
                            END,
                            name: CASE
                                WHEN node:User THEN node.email
                                WHEN node:Image THEN COALESCE(node.title, 'Untitled Image')
                                WHEN node:Attribute THEN node.value
                                ELSE ''
                            END,
                            properties: {
                                id: node.id,
                                email: node.email,
                                title: CASE
                                    WHEN node:Image THEN COALESCE(node.title, 'Untitled Image')
                                    ELSE null
                                END,
                                thumbnailUrl: node.thumbnailUrl,
                                previewUrl: node.previewUrl,
                                fullUrl: node.fullUrl,
                                description: node.description,
                                value: node.value,
                                name: node.name,
                                // Add layout hints
                                size: CASE 
                                    WHEN node:User THEN 80  // Larger user nodes
                                    WHEN node:Image THEN 150  // Medium image nodes
                                    WHEN node:Attribute THEN 50 // Smaller attribute nodes
                                    ELSE 60
                                END,
                                // Color coding by node type
                                color: CASE
                                    WHEN node:User THEN '#4A90E2'  // Blue for users
                                    WHEN node:Image THEN '#50C878'  // Green for images
                                    WHEN node:Attribute AND node.name = 'color' THEN '#FFB6C1'  // Pink for colors
                                    WHEN node:Attribute AND node.name = 'object' THEN '#DEB887'  // Brown for objects
                                    WHEN node:Attribute AND node.name = 'style' THEN '#9370DB'   // Purple for styles
                                    WHEN node:Attribute AND node.name = 'technique' THEN '#20B2AA' // Turquoise for techniques
                                    WHEN node:Attribute AND node.name = 'mood' THEN '#FFD700'    // Gold for moods
                                    WHEN node:Attribute AND node.name = 'composition' THEN '#FF7F50' // Coral for composition
                                    ELSE '#808080'  // Gray for unknown types
                                END
                            }
                        }],
                        relationships: [rel in allRels | {
                            source: toString(id(startNode(rel))),
                            target: toString(id(endNode(rel))),
                            type: type(rel),
                            // Add relationship styling
                            properties: {
                                weight: 1,  // Can be adjusted based on relationship importance
                                distance: CASE
                                    WHEN type(rel) = 'UPLOADED' THEN 100  // Keep users closer to their images
                                    WHEN type(rel) = 'HAS_ATTRIBUTE' THEN 50  // Keep attributes relatively close
                                    ELSE 75
                                END
                            }
                        }],
                        stats: {
                            users: userCount,
                            images: imageCount,
                            colors: colorCount,
                            objects: objectCount,
                            styles: styleCount,
                            techniques: techniqueCount,
                            moods: moodCount,
                            compositions: compositionCount
                        },
                        // Add layout configuration
                        layout: {
                            name: 'force',
                            options: {
                                maxDistance: 300,  // Maximum distance between any two nodes
                                minDistance: 30,   // Minimum distance to prevent overlap
                                gravity: 0.1,      // Global gravity to keep unconnected components from drifting too far
                                springLength: 100, // Default spring length
                                springCoeff: 0.0008, // Spring force coefficient
                                dragCoeff: 0.02,   // Drag force coefficient
                                theta: 0.8        // Barnes Hut theta coefficient
                            }
                        }
                    } as graphData
                `);

                if (!result?.records?.[0]?.get('graphData')) {
                    console.error('Invalid graph data from Neo4j');
                    return NextResponse.json({ error: 'Invalid graph data' }, { status: 500 });
                }

                const graphData = result.records[0].get('graphData');

                // Convert all Neo4j integers to JavaScript numbers
                const convertedData = convertNeo4jIntegers(graphData);

                // Ensure layout configuration is included
                if (!convertedData.layout) {
                    convertedData.layout = {
                        name: 'force',
                        options: {
                            maxDistance: 300,
                            minDistance: 30,
                            gravity: 0.1,
                            springLength: 100,
                            springCoeff: 0.0008,
                            dragCoeff: 0.02,
                            theta: 0.8
                        }
                    };
                }

                return NextResponse.json({
                    nodes: convertedData.nodes || [],
                    links: convertedData.relationships || [],
                    stats: convertedData.stats || { users: 0, images: 0, colors: 0, objects: 0 },
                    layout: convertedData.layout
                });

            } catch (error) {
                console.error('Error executing Neo4j query:', error);
                return NextResponse.json({ error: 'Failed to fetch graph data' }, { status: 500 });
            }
        } finally {
            await dbSession.close();
        }
    } catch (error) {
        log('Error in graph API:', error);
        // Log more details about the error
        console.error('Full error details:', {
            message: error.message,
            stack: error.stack,
            code: error.code,
            name: error.name
        });
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
