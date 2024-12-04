import neo4j from 'neo4j-driver';

let driver = null;

export function getDriver() {
    return driver;
}

async function getDbStats() {
    const session = driver.session();
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

async function getAttributeDistribution() {
    const session = driver.session();
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

export async function initialize() {
    console.log('[API-CLIENT] Initialize called');
    
    if (driver) {
        console.log('[API-CLIENT] Driver already initialized');
        return {
            initialized: true,
            status: 'reused'
        };
    }

    const uri = process.env.NEO4J_URI;
    const user = process.env.NEO4J_USER;
    const password = process.env.NEO4J_PASSWORD;

    console.log('[API-CLIENT] Checking environment variables...');
    const envStatus = {
        uri: !!uri,
        user: !!user,
        password: !!password
    };

    if (!uri || !user || !password) {
        const missing = [
            !uri && 'NEO4J_URI',
            !user && 'NEO4J_USER',
            !password && 'NEO4J_PASSWORD'
        ].filter(Boolean).join(', ');
        throw new Error(`Missing required Neo4j environment variables: ${missing}`);
    }

    try {
        console.log('[API-CLIENT] Creating Neo4j driver...');
        driver = neo4j.driver(
            uri, 
            neo4j.auth.basic(user, password),
            {
                maxConnectionPoolSize: 50,
                connectionAcquisitionTimeout: 2000
            }
        );
        
        console.log('[API-CLIENT] Validating connection...');
        const validationResult = await validateConnection();
        console.log('[API-CLIENT] Connection validated successfully');
        
        return {
            initialized: true,
            status: 'new',
            envStatus,
            validation: validationResult
        };
    } catch (error) {
        console.error('[API-CLIENT] Initialization failed:', error);
        driver = null;
        throw error;
    }
}

export async function validateConnection() {
    if (!driver) {
        throw new Error('Neo4j driver not initialized');
    }

    const session = driver.session();
    try {
        console.log('[API-CLIENT] Running test query...');
        const startTime = Date.now();
        const result = await session.run('RETURN 1 as num');
        const endTime = Date.now();
        
        const validation = {
            responseTime: endTime - startTime,
            testValue: result.records[0].get('num').toNumber(),
            success: result.records[0].get('num').toNumber() === 1
        };

        if (!validation.success) {
            throw new Error('Unexpected response from Neo4j');
        }

        return validation;
    } finally {
        await session.close();
    }
}

export async function healthCheck() {
    console.log('[API-CLIENT] Health check started');
    try {
        if (!driver) {
            console.log('[API-CLIENT] No driver initialized');
            return { 
                healthy: false, 
                error: 'Neo4j driver not initialized',
                timestamp: new Date().toISOString()
            };
        }

        const startTime = Date.now();
        const [validation, dbStats, attrDist] = await Promise.all([
            validateConnection(),
            getDbStats(),
            getAttributeDistribution()
        ]);
        const endTime = Date.now();

        console.log('[API-CLIENT] Health check successful');
        
        return { 
            healthy: true,
            timestamp: new Date().toISOString(),
            details: {
                validation,
                totalResponseTime: endTime - startTime,
                connectionInfo: {
                    maxConnectionPoolSize: driver._config.maxConnectionPoolSize,
                    connectionAcquisitionTimeout: driver._config.connectionAcquisitionTimeout
                },
                database: {
                    nodeStats: dbStats,
                    attributeDistribution: attrDist
                }
            }
        };
    } catch (error) {
        console.error('[API-CLIENT] Health check failed:', error);
        return { 
            healthy: false, 
            error: error.message,
            timestamp: new Date().toISOString()
        };
    }
}

export async function close() {
    if (driver) {
        await driver.close();
        driver = null;
    }
}
