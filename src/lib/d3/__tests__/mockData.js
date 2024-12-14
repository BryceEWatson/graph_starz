/**
 * Mock data for D3 graph tests
 */

export const mockGraphData = {
    nodes: [
        {
            id: '1',
            type: 'user',
            name: 'Test User',
            properties: {
                email: 'test@example.com',
                size: 40,
                color: '#4A90E2'
            }
        },
        {
            id: '2',
            type: 'image',
            name: 'Test Image',
            properties: {
                title: 'Test Image Title',
                size: 35,
                color: '#50C878',
                url: 'https://example.com/test-image.jpg'
            }
        },
        {
            id: '3',
            type: 'color',
            name: 'Red',
            properties: {
                value: '#FF0000',
                size: 30,
                color: '#FF0000'
            }
        },
        {
            id: '4',
            type: 'attribute',
            name: 'Test Attribute',
            properties: {
                value: 'test',
                size: 30,
                color: '#E67E22'
            }
        },
        {
            id: '5',
            type: 'tag',
            name: 'Test Tag',
            properties: {
                value: 'test-tag',
                size: 25,
                color: '#9B59B6'
            }
        }
    ],
    links: [
        {
            source: '1',
            target: '2',
            type: 'UPLOADED',
            properties: {
                timestamp: '2024-12-11T12:00:00Z'
            }
        },
        {
            source: '2',
            target: '3',
            type: 'HAS_COLOR',
            properties: {
                confidence: 0.95
            }
        },
        {
            source: '2',
            target: '4',
            type: 'HAS_ATTRIBUTE',
            properties: {
                confidence: 0.85
            }
        },
        {
            source: '2',
            target: '5',
            type: 'TAGGED_WITH',
            properties: {
                timestamp: '2024-12-11T12:01:00Z'
            }
        }
    ]
};

// Add basic validation tests
describe('Mock Data Validation', () => {
    test('mockGraphData should have nodes and links arrays', () => {
        expect(Array.isArray(mockGraphData.nodes)).toBe(true);
        expect(Array.isArray(mockGraphData.links)).toBe(true);
    });

    test('nodes should have required properties', () => {
        mockGraphData.nodes.forEach(node => {
            expect(node).toHaveProperty('id');
            expect(node).toHaveProperty('type');
            expect(node).toHaveProperty('properties');
        });
    });

    test('links should have required properties', () => {
        mockGraphData.links.forEach(link => {
            expect(link).toHaveProperty('source');
            expect(link).toHaveProperty('target');
            expect(link).toHaveProperty('type');
        });
    });
});
