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
});
