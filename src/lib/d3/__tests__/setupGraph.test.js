// Mock process.env
process.env.NODE_ENV = 'test';

// Mock SelectionManager
jest.mock('../selection/selectionManager', () => ({
    SelectionManager: jest.fn().mockImplementation(() => ({
        selectNode: jest.fn(),
        addToSelection: jest.fn(),
        clearSelection: jest.fn()
    }))
}));

// Import D3 mocks
import { createMockSelection } from '../__mocks__/modules/selectionMock';
import { MockZoomTransform } from '../__mocks__/modules/zoomMock';
import { 
    forceManyBody, 
    forceLink, 
    forceCenter, 
    forceCollide, 
    forceSimulation 
} from '../__mocks__/modules/forceMock';

// Mock D3 implementation using module factory pattern
jest.mock('d3', () => {
    const mockZoom = jest.fn().mockReturnValue({
        scaleExtent: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis(),
        transform: jest.fn().mockReturnThis()
    });

    const mockDrag = jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis()
    });

    return {
        select: jest.fn().mockImplementation(() => createMockSelection()),
        selectAll: jest.fn().mockImplementation(() => createMockSelection()),
        zoom: mockZoom,
        drag: mockDrag,
        zoomIdentity: new MockZoomTransform(),
        forceSimulation,
        forceManyBody,
        forceCenter,
        forceLink,
        forceCollide
    };
});

import * as d3 from 'd3';
import { setupGraph } from '../setupGraph';
import { mockGraphData } from '../__mocks__/mockData';
import { createMockSelection } from '../__mocks__/modules/selectionMock';

describe('Graph Setup', () => {
    let container;
    let data;
    let width;
    let height;
    let theme;

    beforeEach(() => {
        // Create mock selection for SVG element
        container = createMockSelection();
        container.append.mockImplementation(() => createMockSelection());
        
        // Mock data
        data = {
            nodes: mockGraphData.nodes,
            links: mockGraphData.links
        };

        // Mock dimensions
        width = 800;
        height = 600;

        // Mock theme
        theme = {
            background: '#ffffff',
            defaultNode: '#4b5563',
            nodeBorder: '#1f2937',
            nodeHighlight: '#3b82f6',
            nodeRelated: '#60a5fa',
            linkDefault: '#9ca3af',
            linkHighlight: '#3b82f6'
        };

        // Mock D3 force simulation
        d3.forceSimulation.mockReturnValue({
            force: jest.fn().mockReturnThis(),
            nodes: jest.fn().mockReturnThis(),
            alpha: jest.fn().mockReturnThis(),
            restart: jest.fn().mockReturnThis(),
            tick: jest.fn().mockReturnThis(),
            stop: jest.fn().mockReturnThis()
        });
    });

    // Test data validation
    test('mockGraphData should have nodes and links arrays', () => {
        expect(Array.isArray(mockGraphData.nodes)).toBe(true);
        expect(Array.isArray(mockGraphData.links)).toBe(true);
    });

    test('nodes should have required properties', () => {
        mockGraphData.nodes.forEach(node => {
            expect(node).toHaveProperty('id');
            expect(node).toHaveProperty('group');
            expect(node).toHaveProperty('label');
        });
    });

    test('links should have required properties', () => {
        mockGraphData.links.forEach(link => {
            expect(link).toHaveProperty('source');
            expect(link).toHaveProperty('target');
            expect(link).toHaveProperty('value');
        });
    });

    // Test graph initialization
    test('initializes with correct data', () => {
        // Setup mock append chain
        const mockDefs = createMockSelection();
        const mockFilter = createMockSelection();
        container.append.mockReturnValueOnce(mockDefs);
        mockDefs.append.mockReturnValueOnce(mockFilter);

        // Initialize graph
        const graph = setupGraph(container, data, width, height, theme);

        // Verify SVG setup
        expect(container.attr).toHaveBeenCalledWith('width', width);
        expect(container.attr).toHaveBeenCalledWith('height', height);

        // Verify data binding
        expect(graph).toBeDefined();
        expect(graph.nodes).toBeDefined();
        expect(graph.links).toBeDefined();
        expect(graph.simulation).toBeDefined();
    });

    // Test theme application
    test('applies correct styling based on theme', () => {
        // Setup mock append chain
        const mockDefs = createMockSelection();
        const mockFilter = createMockSelection();
        container.append.mockReturnValueOnce(mockDefs);
        mockDefs.append.mockReturnValueOnce(mockFilter);

        // Initialize graph
        setupGraph(container, data, width, height, theme);

        // Verify theme application
        expect(container.style).toHaveBeenCalledWith('background-color', theme.background);
    });

    // Test empty data handling
    test('handles empty data gracefully', () => {
        // Setup mock append chain
        const mockDefs = createMockSelection();
        const mockFilter = createMockSelection();
        container.append.mockReturnValueOnce(mockDefs);
        mockDefs.append.mockReturnValueOnce(mockFilter);

        const emptyData = {
            nodes: [],
            links: []
        };

        // Initialize graph with empty data
        const graph = setupGraph(container, emptyData, width, height, theme);

        // Verify empty graph setup
        expect(graph).toBeDefined();
        expect(graph.nodes).toHaveLength(0);
        expect(graph.links).toHaveLength(0);
        expect(graph.simulation).toBeDefined();
    });

    // Test force simulation parameters
    test('applies correct type-specific force parameters', () => {
        // Setup mock append chain
        const mockDefs = createMockSelection();
        const mockFilter = createMockSelection();
        container.append.mockReturnValueOnce(mockDefs);
        mockDefs.append.mockReturnValueOnce(mockFilter);

        // Initialize graph
        const graph = setupGraph(container, data, width, height, theme);

        // Verify force simulation setup
        expect(d3.forceSimulation).toHaveBeenCalledWith(data.nodes);
        
        // Verify force types
        const simulation = graph.simulation;
        expect(simulation.force).toHaveBeenCalledWith('charge', expect.any(Function));
        expect(simulation.force).toHaveBeenCalledWith('link', expect.any(Function));
        expect(simulation.force).toHaveBeenCalledWith('center', expect.any(Function));
        expect(simulation.force).toHaveBeenCalledWith('collide', expect.any(Function));

        // Verify force parameters
        const forceLink = d3.forceLink.mock.results[0].value;
        expect(forceLink.distance).toHaveBeenCalled();
        expect(forceLink.strength).toHaveBeenCalled();

        const forceManyBody = d3.forceManyBody.mock.results[0].value;
        expect(forceManyBody.strength).toHaveBeenCalled();
    });

    test('sets correct link distances based on node types with variations', () => {
        // Setup mock append chain
        const mockDefs = createMockSelection();
        const mockFilter = createMockSelection();
        container.append.mockReturnValueOnce(mockDefs);
        mockDefs.append.mockReturnValueOnce(mockFilter);

        // Initialize graph with test data containing different node types
        const testData = {
            nodes: [
                { id: '1', type: 'image' },
                { id: '2', type: 'user' },
                { id: '3', type: 'attribute' }
            ],
            links: [
                { source: '1', target: '2' }, // image-user link
                { source: '2', target: '3' }  // user-attribute link
            ]
        };

        const graph = setupGraph(container, testData, width, height, theme);

        // Verify link distance calculations
        const forceLink = d3.forceLink.mock.results[0].value;
        const distanceFunction = forceLink.distance.mock.calls[0][0];

        // Test image-user link distance (should be within ±10% of 180)
        const imageUserDistance = distanceFunction(testData.links[0]);
        expect(imageUserDistance).toBeGreaterThanOrEqual(180 * 0.9);
        expect(imageUserDistance).toBeLessThanOrEqual(180 * 1.1);

        // Test user-attribute link distance (should be within ±10% of 120)
        const userAttrDistance = distanceFunction(testData.links[1]);
        expect(userAttrDistance).toBeGreaterThanOrEqual(120 * 0.9);
        expect(userAttrDistance).toBeLessThanOrEqual(120 * 1.1);
    });

    test('sets correct link strengths with variations', () => {
        // Setup mock append chain
        const mockDefs = createMockSelection();
        const mockFilter = createMockSelection();
        container.append.mockReturnValueOnce(mockDefs);
        mockDefs.append.mockReturnValueOnce(mockFilter);

        // Initialize graph with test data
        const testData = {
            nodes: [
                { id: '1', type: 'image' },
                { id: '2', type: 'user' },
                { id: '3', type: 'image' }
            ],
            links: [
                { source: '1', target: '2' }, // image-user link
                { source: '1', target: '3' }  // image-image link
            ]
        };

        const graph = setupGraph(container, testData, width, height, theme);

        // Verify link strength calculations
        const forceLink = d3.forceLink.mock.results[0].value;
        const strengthFunction = forceLink.strength.mock.calls[0][0];

        // Test image-user link strength (should be within ±20% of 0.5)
        const imageUserStrength = strengthFunction(testData.links[0]);
        expect(imageUserStrength).toBeGreaterThanOrEqual(0.5 * 0.8);
        expect(imageUserStrength).toBeLessThanOrEqual(0.5 * 1.2);

        // Test image-image link strength (should be within ±20% of 0.7)
        const imageImageStrength = strengthFunction(testData.links[1]);
        expect(imageImageStrength).toBeGreaterThanOrEqual(0.7 * 0.8);
        expect(imageImageStrength).toBeLessThanOrEqual(0.7 * 1.2);
    });

    test('generates consistent variations for same node pairs', () => {
        // Setup mock append chain
        const mockDefs = createMockSelection();
        const mockFilter = createMockSelection();
        container.append.mockReturnValueOnce(mockDefs);
        mockDefs.append.mockReturnValueOnce(mockFilter);

        // Initialize graph with test data
        const testData = {
            nodes: [
                { id: '1', type: 'image' },
                { id: '2', type: 'user' }
            ],
            links: [
                { source: '1', target: '2' }
            ]
        };

        // Create two separate graph instances
        const graph1 = setupGraph(container, testData, width, height, theme);
        const graph2 = setupGraph(container, testData, width, height, theme);

        // Get force functions
        const forceLink1 = d3.forceLink.mock.results[0].value;
        const forceLink2 = d3.forceLink.mock.results[1].value;

        const distance1 = forceLink1.distance.mock.calls[0][0](testData.links[0]);
        const distance2 = forceLink2.distance.mock.calls[0][0](testData.links[0]);
        const strength1 = forceLink1.strength.mock.calls[0][0](testData.links[0]);
        const strength2 = forceLink2.strength.mock.calls[0][0](testData.links[0]);

        // Verify that variations are consistent
        expect(distance1).toBe(distance2);
        expect(strength1).toBe(strength2);
    });

    test('sets correct repulsion forces based on node types', () => {
        // Setup mock append chain
        const mockDefs = createMockSelection();
        const mockFilter = createMockSelection();
        container.append.mockReturnValueOnce(mockDefs);
        mockDefs.append.mockReturnValueOnce(mockFilter);

        // Initialize graph with test data
        const testData = {
            nodes: [
                { id: '1', type: 'image' },
                { id: '2', type: 'user' },
                { id: '3', type: 'attribute' }
            ],
            links: []
        };

        const graph = setupGraph(container, testData, width, height, theme);

        // Verify node repulsion forces
        const forceManyBody = d3.forceManyBody.mock.results[0].value;
        const strengthFunction = forceManyBody.strength.mock.calls[0][0];

        // Test repulsion strengths
        expect(strengthFunction(testData.nodes[0])).toBeGreaterThanOrEqual(-500 * 0.9);
        expect(strengthFunction(testData.nodes[0])).toBeLessThanOrEqual(-500 * 1.1);
        expect(strengthFunction(testData.nodes[1])).toBeGreaterThanOrEqual(-300 * 0.9);
        expect(strengthFunction(testData.nodes[1])).toBeLessThanOrEqual(-300 * 1.1);
        expect(strengthFunction(testData.nodes[2])).toBeGreaterThanOrEqual(-100 * 0.9);
        expect(strengthFunction(testData.nodes[2])).toBeLessThanOrEqual(-100 * 1.1);
    });

    test('configures correct movement parameters', () => {
        // Setup mock append chain
        const mockDefs = createMockSelection();
        const mockFilter = createMockSelection();
        container.append.mockReturnValueOnce(mockDefs);
        mockDefs.append.mockReturnValueOnce(mockFilter);

        const graph = setupGraph(container, data, width, height, theme);

        // Verify simulation parameters
        const simulation = graph.simulation;
        expect(simulation.alpha).toHaveBeenCalledWith(0.3); // initial alpha
        expect(simulation.alphaDecay).toHaveBeenCalledWith(0.02); // stable layout
        expect(simulation.velocityDecay).toHaveBeenCalledWith(0.3); // smooth movement
        expect(simulation.alphaTarget).toHaveBeenCalledWith(0.05); // subtle movement
    });
});
