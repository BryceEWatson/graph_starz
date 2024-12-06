import { NextResponse } from 'next/server';
import { initialize, getDriver } from '../../../lib/neo4j/api-client';
import { getServerSession } from 'next-auth';
import debug from 'debug';

const log = debug('graph:api');

// Force dynamic route to prevent caching
export const dynamic = 'force-dynamic';

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
        // Check authentication
        const authSession = await getServerSession();
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

        log('Creating session...');
        const dbSession = driver.session();
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
OPTIONAL MATCH (n)-[r]->(m)
WITH collect(DISTINCT n) as nodes, collect(DISTINCT r) as rels
MATCH (u:User) WITH nodes, rels, count(u) as userCount
MATCH (i:Image) WITH nodes, rels, userCount, count(i) as imageCount
MATCH (c:Color) WITH nodes, rels, userCount, imageCount, count(c) as colorCount
MATCH (o:Object) WITH nodes, rels, userCount, imageCount, colorCount, count(o) as objectCount
RETURN {
    nodes: [node in nodes | {
        id: toString(id(node)),
        email: node.email,
        name: node.name,
        title: node.title,
        type: toLower(labels(node)[0]),
        properties: properties(node)
    }],
    relationships: [rel in rels | {
        source: toString(id(startNode(rel))),
        target: toString(id(endNode(rel))),
        type: type(rel)
    }],
    stats: {
        users: userCount,
        images: imageCount,
        colors: colorCount,
        objects: objectCount
    }
} as graphData
`);

            const graphData = result.records[0].get('graphData');

            // Convert all Neo4j integers to JavaScript numbers
            const convertedData = convertNeo4jIntegers(graphData);

            return NextResponse.json({
                nodes: convertedData.nodes,
                links: convertedData.relationships,
                stats: convertedData.stats
            });

        } finally {
            await dbSession.close();
        }
    } catch (error) {
        log('Error in graph API:', error);
        return NextResponse.json(
            { error: 'Internal server error', details: error.message },
            { status: 500 }
        );
    }
}
