'use server';

import { initialize } from './client';

let driver = null;

async function getDriver() {
    if (!driver) {
        await initialize();
        const neo4j = (await import('neo4j-driver')).default;
        driver = neo4j.driver(
            process.env.NEO4J_URI,
            neo4j.auth.basic(process.env.NEO4J_USER, process.env.NEO4J_PASSWORD)
        );
    }
    return driver;
}

/**
 * Get basic database statistics
 */
export async function getDbStats() {
    const session = (await getDriver()).session();
    
    try {
        const result = await session.run(`
            MATCH (n)
            WITH labels(n) as label, count(n) as count
            RETURN label, count
            ORDER BY count DESC
        `);
        
        return result.records.map(record => ({
            label: record.get('label'),
            count: record.get('count').toNumber()
        }));
    } finally {
        await session.close();
    }
}

/**
 * Get attribute distribution
 */
export async function getAttributeDistribution() {
    const session = (await getDriver()).session();
    
    try {
        const result = await session.run(`
            MATCH (a:Attribute)
            WITH a.type as type, count(a) as count
            RETURN type, count
            ORDER BY count DESC
        `);
        
        return result.records.map(record => ({
            type: record.get('type'),
            count: record.get('count').toNumber()
        }));
    } finally {
        await session.close();
    }
}

/**
 * Get graph data including nodes (users, images, attributes) and their relationships
 */
export async function getGraphData() {
    const session = (await getDriver()).session();
    
    try {
        const result = await session.run(`
            // Get all nodes and their properties
            MATCH (n)
            WITH collect({
                id: toString(id(n)),
                labels: labels(n),
                properties: properties(n)
            }) as nodes
            
            // Get all relationships
            MATCH (source)-[r]->(target)
            WITH nodes, collect({
                source: toString(id(source)),
                target: toString(id(target)),
                type: type(r),
                properties: properties(r)
            }) as relationships
            
            RETURN {
                nodes: nodes,
                relationships: relationships
            } as graphData
        `);
        
        const graphData = result.records[0].get('graphData');
        
        // Transform nodes into the expected format
        const nodes = graphData.nodes.map(node => ({
            id: node.id,
            type: node.labels[0].toLowerCase(),
            ...node.properties
        }));
        
        // Transform relationships into the expected format
        const links = graphData.relationships.map(rel => ({
            source: rel.source,
            target: rel.target,
            type: rel.type.toLowerCase(),
            ...rel.properties
        }));

        return {
            nodes,
            links,
            stats: {
                nodeCount: nodes.length,
                edgeCount: links.length,
                users: nodes.filter(n => n.type === 'user').length,
                images: nodes.filter(n => n.type === 'image').length,
                attributes: nodes.filter(n => n.type === 'attribute').length
            }
        };
    } finally {
        await session.close();
    }
}
