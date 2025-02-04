import { GraphDataManager } from '../GraphDataManager'
import { GraphData } from '../types'

const mockGraphData: GraphData = {
    nodes: [
        {
            id: 'user1',
            type: 'user',
            name: 'Test User',
            properties: {
                id: 'user1',
                email: 'test@example.com',
                size: 80,  
                color: '#4A90E2'  
            }
        },
        {
            id: 'img1',
            type: 'image',
            name: 'Test Image',
            properties: {
                id: 'img1',
                title: 'Test Image',
                graphUrl: 'test-graph.webp',
                previewUrl: 'test-preview.webp',
                fullUrl: 'test-full.webp',
                description: 'A test image',
                size: 200,  
                color: '#50C878'  
            }
        },
        {
            id: 'attr1',
            type: 'attribute',
            name: 'Red',
            properties: {
                id: 'attr1',
                category: 'color',
                value: 'red',
                context: 'Dominant color in the image',
                prominence: 0.8,
                reasoning: 'Large red area in center of image',
                size: 40,  
                color: '#FFB6C1'  
            }
        },
        {
            id: 'attr2',
            type: 'attribute',
            name: 'Portrait',
            properties: {
                id: 'attr2',
                category: 'composition',
                value: 'portrait',
                context: 'Image composition style',
                prominence: 0.9,
                reasoning: 'Subject centered in frame',
                size: 40,
                color: '#FF7F50'  
            }
        }
    ],
    links: [
        {
            source: 'user1',
            target: 'img1',
            type: 'UPLOADED',
            properties: {
                prominence: 1
            }
        },
        {
            source: 'img1',
            target: 'attr1',
            type: 'HAS_ATTRIBUTE',
            properties: {
                prominence: 0.8,
                context: 'Color analysis',
                reasoning: 'Detected through image processing'
            }
        },
        {
            source: 'img1',
            target: 'attr2',
            type: 'HAS_ATTRIBUTE',
            properties: {
                prominence: 0.9,
                context: 'Composition analysis',
                reasoning: 'Detected through ML model'
            }
        }
    ],
    stats: {
        users: 1,
        images: 1,
        attributes: 2,
        categories: { 
            color: 1,
            composition: 1
        }
    },
    layout: {
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
    }
}

describe('GraphDataManager', () => {
    let manager: GraphDataManager

    beforeEach(() => {
        manager = new GraphDataManager()
        global.fetch = jest.fn()
    })

    afterEach(() => {
        jest.resetAllMocks()
    })

    describe('initialization', () => {
        test('successfully fetches and processes graph data', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockGraphData)
            })

            await manager.initialize()
            const subgraphs = manager.getUserSubgraphs()
            
            expect(subgraphs.size).toBe(1)
            expect(subgraphs.get('user1')).toBeDefined()
            expect(subgraphs.get('user1')?.images).toHaveLength(1)
            expect(subgraphs.get('user1')?.attributes).toHaveLength(2)
        })

        test('handles API error responses', async () => {
            global.fetch.mockResolvedValueOnce({
                ok: false,
                status: 403
            })

            await expect(manager.initialize()).rejects
                .toThrow('Unauthorized: Early access not yet granted')
        })
    })

    describe('data access', () => {
        beforeEach(async () => {
            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockGraphData)
            })
            await manager.initialize()
        })

        test('getAttributeNodes returns only attribute nodes', () => {
            const attributes = manager.getAttributeNodes()
            expect(attributes).toHaveLength(2)
            expect(attributes[0].type).toBe('attribute')
            expect(attributes[0].id).toBe('attr1')
            expect(attributes[1].type).toBe('attribute')
            expect(attributes[1].id).toBe('attr2')
        })

        test('getUserSubgraphs returns complete user subgraphs', () => {
            const subgraphs = manager.getUserSubgraphs()
            const userSubgraph = subgraphs.get('user1')

            expect(userSubgraph).toBeDefined()
            expect(userSubgraph?.user.id).toBe('user1')
            expect(userSubgraph?.images[0].id).toBe('img1')
            expect(userSubgraph?.attributes[0].id).toBe('attr1')
            expect(userSubgraph?.attributes[1].id).toBe('attr2')
        })
    })

    describe('subscriptions', () => {
        test('subscribers are notified of data updates', async () => {
            const mockCallback = jest.fn()
            manager.subscribeToUpdates(mockCallback)

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockGraphData)
            })

            await manager.initialize()
            expect(mockCallback).toHaveBeenCalledWith(mockGraphData)
        })

        test('unsubscribe removes callback', async () => {
            const mockCallback = jest.fn()
            const unsubscribe = manager.subscribeToUpdates(mockCallback)

            unsubscribe()

            global.fetch.mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve(mockGraphData)
            })

            await manager.initialize()
            expect(mockCallback).not.toHaveBeenCalled()
        })
    })

    describe('Data Validation', () => {
        test('validates complete valid graph data', () => {
            const manager = new GraphDataManager()
            expect(() => manager.initialize(mockGraphData)).not.toThrow()
        })

        test('rejects data with missing graphUrl', () => {
            const manager = new GraphDataManager()
            const invalidData = {
                ...mockGraphData,
                nodes: mockGraphData.nodes.map(node => 
                    node.type === 'image' 
                        ? { ...node, properties: { ...node.properties, graphUrl: undefined } }
                        : node
                )
            }
            expect(() => manager.initialize(invalidData))
                .toThrow('Image node at index 1 missing required graphUrl')
        })

        test('rejects data with invalid attribute category', () => {
            const manager = new GraphDataManager()
            const invalidData = {
                ...mockGraphData,
                nodes: mockGraphData.nodes.map(node => 
                    node.type === 'attribute'
                        ? { ...node, properties: { ...node.properties, category: 'invalid' } }
                        : node
                )
            }
            expect(() => manager.initialize(invalidData))
                .toThrow('Invalid category "invalid" at index 2')
        })

        test('rejects data with invalid link references', () => {
            const manager = new GraphDataManager()
            const invalidData = {
                ...mockGraphData,
                links: [
                    {
                        source: 'nonexistent',
                        target: 'img1',
                        type: 'UPLOADED',
                        properties: {}
                    }
                ]
            }
            expect(() => manager.initialize(invalidData))
                .toThrow('Link at index 0 references non-existent source node: nonexistent')
        })

        test('rejects data with missing required user fields', () => {
            const manager = new GraphDataManager()
            const invalidData = {
                ...mockGraphData,
                nodes: mockGraphData.nodes.map(node => 
                    node.type === 'user'
                        ? { ...node, properties: { ...node.properties, email: undefined } }
                        : node
                )
            }
            expect(() => manager.initialize(invalidData))
                .toThrow('User node at index 0 missing required email')
        })
    })
})
