import { GraphSetup } from '../../core/GraphSetup'
import { NodeInteractionManager } from '../../interactions/NodeInteractionManager'
import { LinkInteractionManager } from '../../interactions/LinkInteractionManager'
import * as d3 from 'd3'

// Mock d3 and interaction managers
jest.mock('d3')
jest.mock('../../interactions/NodeInteractionManager')
jest.mock('../../interactions/LinkInteractionManager')

describe('GraphSetup', () => {
    let validConfig
    let mockSvg
    let mockContainer
    let mockBackground

    beforeEach(() => {
        // Setup valid configuration
        validConfig = {
            forceConfig: {
                link: {
                    distance: {
                        image: 200,
                        user: 150,
                        attribute: 100,
                        variations: { min: 0.8, max: 1.2 }
                    }
                },
                charge: {
                    image: -800,
                    user: -400,
                    attribute: -200,
                    distanceMax: 800,
                    distanceMin: 100
                },
                collide: {
                    radius: {
                        image: 120,
                        user: 50,
                        attribute: 30
                    },
                    strength: 0.8,
                    iterations: 3
                }
            },
            theme: {
                colors: {
                    nodeFill: '#374151',
                    nodeStroke: '#4B5563',
                    linkStroke: '#6B7280',
                    textFill: '#F9FAFB',
                    userNode: '#60A5FA',
                    attributeNode: '#9CA3AF',
                    defaultNode: '#374151',
                    nodeBorder: '#4B5563'
                }
            },
            nodeSizes: {
                user: 60,
                image: { width: 160 },
                attribute: 30
            }
        }

        // Mock D3 selections
        mockContainer = {
            append: jest.fn().mockReturnThis(),
            attr: jest.fn().mockReturnThis(),
            style: jest.fn().mockReturnThis()
        }

        mockBackground = {
            append: jest.fn().mockReturnThis(),
            attr: jest.fn().mockReturnThis()
        }

        mockSvg = {
            append: jest.fn().mockReturnValue(mockContainer)
        }

        // Mock d3.select
        d3.select.mockImplementation(() => mockSvg)
    })

    describe('Constructor', () => {
        test('initializes with valid config', () => {
            const setup = new GraphSetup(validConfig)
            expect(setup).toBeTruthy()
            expect(NodeInteractionManager).toHaveBeenCalled()
            expect(LinkInteractionManager).toHaveBeenCalled()
        })

        test('throws on missing config', () => {
            expect(() => new GraphSetup()).toThrow('Configuration is required')
        })

        test('throws on invalid force config', () => {
            const invalidConfig = { ...validConfig }
            delete invalidConfig.forceConfig.link
            expect(() => new GraphSetup(invalidConfig))
                .toThrow('Missing link distance configuration')
        })

        test('throws on missing theme colors', () => {
            const invalidConfig = { ...validConfig }
            delete invalidConfig.theme.colors
            expect(() => new GraphSetup(invalidConfig))
                .toThrow('Theme colors are required')
        })

        test('throws on missing node sizes', () => {
            const invalidConfig = { ...validConfig }
            delete invalidConfig.nodeSizes
            expect(() => new GraphSetup(invalidConfig))
                .toThrow('Node sizes configuration is required')
        })
    })

    describe('Container Setup', () => {
        let setup

        beforeEach(() => {
            setup = new GraphSetup(validConfig)
        })

        test('creates container with valid parameters', () => {
            const result = setup.setupContainer(mockSvg, 800, 600)
            expect(result).toHaveProperty('container')
            expect(result).toHaveProperty('background')
            expect(mockSvg.append).toHaveBeenCalled()
        })

        test('throws on missing parameters', () => {
            expect(() => setup.setupContainer()).toThrow('Invalid container parameters')
            expect(() => setup.setupContainer(mockSvg)).toThrow('Invalid container parameters')
            expect(() => setup.setupContainer(mockSvg, 800)).toThrow('Invalid container parameters')
        })

        test('creates drop shadow filter', () => {
            setup.setupContainer(mockSvg, 800, 600)
            expect(mockSvg.append).toHaveBeenCalledWith('defs')
        })
    })

    describe('Graph Element Creation', () => {
        let setup
        let mockData

        beforeEach(() => {
            setup = new GraphSetup(validConfig)
            mockData = {
                nodes: [
                    { id: 1, type: 'user', name: 'User 1' },
                    { id: 2, type: 'image', name: 'Image 1' },
                    { id: 3, type: 'attribute', name: 'Attribute 1' }
                ],
                links: [
                    { source: 1, target: 2, type: 'UPLOADED' },
                    { source: 2, target: 3, type: 'HAS_ATTRIBUTE' }
                ]
            }
        })

        test('creates nodes and links with valid data', () => {
            const container = {
                append: jest.fn().mockReturnThis(),
                selectAll: jest.fn().mockReturnThis(),
                data: jest.fn().mockReturnThis(),
                join: jest.fn().mockReturnThis(),
                attr: jest.fn().mockReturnThis()
            }

            const result = setup.createGraphElements(container, mockData)
            expect(result).toHaveProperty('nodes')
            expect(result).toHaveProperty('links')
        })

        test('throws on invalid data', () => {
            expect(() => setup.createGraphElements(mockContainer, {}))
                .toThrow('Invalid graph data')
            expect(() => setup.createGraphElements(mockContainer, { nodes: [] }))
                .toThrow('Invalid graph data')
            expect(() => setup.createGraphElements(mockContainer, { links: [] }))
                .toThrow('Invalid graph data')
        })

        test('creates fallback node on error', () => {
            const mockNode = {
                append: jest.fn().mockReturnThis(),
                attr: jest.fn().mockReturnThis(),
                style: jest.fn().mockReturnThis()
            }

            setup.createFallbackNode(mockNode)
            expect(mockNode.append).toHaveBeenCalledWith('circle')
            expect(mockNode.append).toHaveBeenCalledWith('text')
        })
    })

    describe('Resource Cleanup', () => {
        test('calls cleanup on managers', () => {
            const setup = new GraphSetup(validConfig)
            setup.cleanup()
            expect(setup.nodeManager.cleanup).toHaveBeenCalled()
            expect(setup.linkManager.cleanup).toHaveBeenCalled()
        })

        test('handles cleanup errors gracefully', () => {
            const setup = new GraphSetup(validConfig)
            setup.nodeManager.cleanup.mockImplementation(() => {
                throw new Error('Cleanup failed')
            })
            expect(() => setup.cleanup()).not.toThrow()
        })
    })
})
