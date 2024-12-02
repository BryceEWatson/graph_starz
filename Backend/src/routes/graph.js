const express = require('express');
const router = express.Router();

/**
 * @route GET /graph
 * @description Get the complete graph data for visualization, including users, images, and attributes
 * @access Private
 */
router.get('/', async (req, res) => {
    try {
        // Placeholder response matching graph_structure.json format
        res.json({
            users: [
                {
                    userId: 'sample_user_1',
                    createdAt: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    images: [
                        {
                            imageId: 'sample_image_1',
                            uploadedAt: new Date().toISOString(),
                            url: 'https://storage.googleapis.com/sample/image1.jpg',
                            status: 'processed',
                            attributes: [
                                {
                                    type: 'object',
                                    value: 'mountain'
                                },
                                {
                                    type: 'technique',
                                    value: 'oil_painting'
                                },
                                {
                                    type: 'composition',
                                    value: 'rule_of_thirds'
                                }
                            ]
                        }
                    ]
                }
            ],
            root: 'root'
        });
    } catch (error) {
        res.status(500).json({
            error: 'Failed to retrieve graph data',
            message: error.message
        });
    }
});

module.exports = router;
