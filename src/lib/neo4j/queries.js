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
