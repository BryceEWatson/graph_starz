import { GraphSetup } from '../../core/GraphSetup'
import { NodeInteractionManager } from '../../interactions/NodeInteractionManager'
import { LinkInteractionManager } from '../../interactions/LinkInteractionManager'
import * as d3 from 'd3'

// Mock d3 and interaction managers
const mockSelection = {
    append: jest.fn().mockReturnThis(),
    attr: jest.fn().mockReturnThis(), 
    style: jest.fn().mockReturnThis(),
    text: jest.fn().mockReturnThis(),
    each: jest.fn(),
    remove: jest.fn(),
    call: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis()
}

jest.mock('d3', () => ({
    select: jest.fn(() => mockSelection),
    forceSimulation: jest.fn(() => ({
        force: jest.fn().mockReturnThis(),
        nodes: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis()
    })),
    forceManyBody: jest.fn(),
    forceCollide: jest.fn(),
    forceCenter: jest.fn(),
    easeCubicInOut: () => t => t
}))

const mockNodeManager = {
    cleanup: jest.fn(),
    setupNodes: jest.fn(),
    attachEventHandlers: jest.fn()
}

const mockLinkManager = {
    cleanup: jest.fn(),
    setupLinks: jest.fn(),
    attachEventHandlers: jest.fn()
}

jest.mock('../../interactions/NodeInteractionManager', () => ({
    NodeInteractionManager: jest.fn().mockImplementation(() => mockNodeManager)
}))

jest.mock('../../interactions/LinkInteractionManager', () => ({
    LinkInteractionManager: jest.fn().mockImplementation(() => mockLinkManager)
}))

describe('GraphSetup', () => {
    let validConfig
    let mockSvg
    let mockContainer
    let mockBackground

    beforeEach(() => {
        validConfig = {
            container: {
                width: 800,
                height: 600,
                containerId: 'graph-container'
            },
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

        // Reset all mocks
        jest.clearAllMocks()
        
        // Setup d3.select mock for container
        d3.select.mockImplementation(() => ({
            ...mockSelection,
            node: () => document.createElement('div')
        }))

        // Mock D3 selections
        const mockD3Selection = {
            append: jest.fn().mockReturnThis(),
            attr: jest.fn().mockReturnThis(),
            selectAll: jest.fn().mockReturnThis(),
            data: jest.fn().mockReturnThis(),
            join: jest.fn().mockReturnThis(),
            text: jest.fn().mockReturnThis(),
            each: jest.fn().mockReturnThis(),
            call: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis()
        }

        mockContainer = {
            append: jest.fn().mockReturnValue(mockD3Selection),
            attr: jest.fn().mockReturnThis(),
            selectAll: jest.fn().mockReturnThis(),
            each: jest.fn().mockReturnThis()
        }

        mockBackground = {
            append: jest.fn().mockReturnThis(),
            attr: jest.fn().mockReturnThis()
        }

        mockSvg = {
            append: jest.fn().mockReturnValue(mockContainer)
        }

        d3.select = jest.fn().mockReturnValue(mockD3Selection)
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
            delete invalidConfig.forceConfig.link.distance
            expect(() => new GraphSetup(invalidConfig))
                .toThrow('Missing link distance configuration')
        })

        test('throws on missing theme colors', () => {
            const invalidConfig = { ...validConfig }
            delete invalidConfig.theme.colors.nodeFill
            expect(() => new GraphSetup(invalidConfig))
                .toThrow('Missing required theme color: nodeFill')
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
        let graphSetup
        let mockD3Selection
        let mockContainer
        const validData = {
            nodes: [{ id: 1 }, { id: 2 }],
            links: [{ source: 1, target: 2 }]
        }

        beforeEach(() => {
            // Mock D3 selections
            mockD3Selection = {
                append: jest.fn().mockReturnThis(),
                attr: jest.fn().mockReturnThis(),
                selectAll: jest.fn().mockReturnThis(),
                data: jest.fn().mockReturnThis(),
                join: jest.fn().mockReturnThis(),
                text: jest.fn().mockReturnThis(),
                each: jest.fn().mockReturnThis(),
                call: jest.fn().mockReturnThis(),
                on: jest.fn().mockReturnThis()
            }

            mockContainer = {
                append: jest.fn().mockReturnValue(mockD3Selection),
                attr: jest.fn().mockReturnThis(),
                selectAll: jest.fn().mockReturnThis(),
                each: jest.fn().mockReturnThis()
            }

            // Mock D3 methods
            d3.select = jest.fn().mockReturnValue(mockD3Selection)

            graphSetup = new GraphSetup(validConfig)
            graphSetup.setupContainer(mockSvg, 800, 600)
        })

        it('creates nodes and links with valid data', () => {
            const container = mockContainer
            const result = graphSetup.createGraphElements(container, validData)
            
            // Verify container methods were called
            expect(container.append).toHaveBeenCalledWith('g')
            
            // Verify D3 selection methods were called
            expect(mockD3Selection.selectAll).toHaveBeenCalledWith('line')
            expect(mockD3Selection.data).toHaveBeenCalledWith(validData.links)
            expect(mockD3Selection.join).toHaveBeenCalledWith('line')
            
            // Verify event handlers were attached
            expect(mockNodeManager.attachEventHandlers).toHaveBeenCalled()
            expect(mockLinkManager.attachEventHandlers).toHaveBeenCalled()
            
            // Verify result structure
            expect(result).toHaveProperty('nodes')
            expect(result).toHaveProperty('links')
        })

        it('throws on invalid data', () => {
            const container = mockContainer
            expect(() => graphSetup.createGraphElements(container)).toThrow('Invalid graph data')
            expect(() => graphSetup.createGraphElements(container, { nodes: null })).toThrow('Invalid graph data')
            expect(() => graphSetup.createGraphElements(container, { links: null })).toThrow('Invalid graph data')
        })

        it('creates fallback node on error', () => {
            const container = mockContainer
            const error = new Error('Test error')
            mockNodeManager.attachEventHandlers.mockImplementation(() => { throw error })
            
            const result = graphSetup.createGraphElements(container, validData)
            
            // Verify fallback node was created
            expect(mockD3Selection.attr).toHaveBeenCalledWith('class', 'node fallback')
            expect(mockD3Selection.text).toHaveBeenCalledWith('Error loading node')
            expect(mockD3Selection.each).toHaveBeenCalled()
        })
    })

    describe('Cleanup', () => {
        let graphSetup

        beforeEach(() => {
            graphSetup = new GraphSetup(validConfig)
            graphSetup.nodeManager = mockNodeManager
            graphSetup.linkManager = mockLinkManager
        })

        it('calls cleanup on managers', () => {
            graphSetup.cleanup()
            expect(mockNodeManager.cleanup).toHaveBeenCalled()
            expect(mockLinkManager.cleanup).toHaveBeenCalled()
        })

        it('handles cleanup errors gracefully', () => {
            const error = new Error('Cleanup error')
            mockNodeManager.cleanup.mockImplementation(() => { throw error })
            
            expect(() => graphSetup.cleanup()).not.toThrow()
        })
    })
})
