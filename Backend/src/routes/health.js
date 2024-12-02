const express = require('express');
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
            version: process.env.npm_package_version || '1.0.0'
        };
        
        res.json(status);
    } catch (error) {
        res.status(500).json({
            status: 'error',
            message: 'Health check failed',
            error: error.message
        });
    }
});

module.exports = router;
