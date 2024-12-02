const express = require('express');
const neo4j = require('../db/neo4j');
const router = express.Router();

/**
 * @route GET /health
 * @description Check the health status of the API and its dependencies
 * @access Public
 */
router.get('/', async (req, res) => {
    try {
        const status = {
            status: 'healthy',
            timestamp: new Date().toISOString(),
            environment: process.env.NODE_ENV,
            version: process.env.npm_package_version || '1.0.0',
            dependencies: {
                neo4j: 'unknown'
            }
        };
        
        // Check Neo4j connection
        try {
            const driver = neo4j.getDriver();
            const session = driver.session();
            try {
                await session.run('RETURN 1 as test');
                status.dependencies.neo4j = 'connected';
            } finally {
                await session.close();
            }
        } catch (dbError) {
            status.dependencies.neo4j = 'disconnected';
            status.status = 'degraded';
        }
        
        // Send appropriate status code
        const statusCode = status.status === 'healthy' ? 200 : 503;
        res.status(statusCode).json(status);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Health check failed',
            error: error.message
        });
    }
});

module.exports = router;
