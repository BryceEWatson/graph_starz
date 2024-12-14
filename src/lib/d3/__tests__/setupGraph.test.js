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

// Mock D3 implementation using module factory pattern
jest.mock('d3', () => ({
    select: jest.fn().mockImplementation(() => createMockSelection()),
    zoom: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis()
    }),
    drag: jest.fn().mockReturnValue({
        on: jest.fn().mockReturnThis()
    }),
    forceSimulation: jest.fn().mockImplementation(() => ({
        force: jest.fn().mockReturnThis(),
        nodes: jest.fn().mockReturnThis(),
        alpha: jest.fn().mockReturnThis(),
        restart: jest.fn(),
        tick: jest.fn().mockReturnThis(),
        stop: jest.fn().mockReturnThis(),
        alphaMin: jest.fn().mockReturnThis(),
        alphaDecay: jest.fn().mockReturnThis(),
        alphaTarget: jest.fn().mockReturnThis(),
        velocityDecay: jest.fn().mockReturnThis(),
        on: jest.fn().mockReturnThis()
    })),
    forceManyBody: jest.fn().mockReturnValue({
        strength: jest.fn().mockReturnThis()
    }),
    forceCenter: jest.fn().mockReturnValue({
        x: jest.fn().mockReturnThis(),
        y: jest.fn().mockReturnThis()
    }),
    forceLink: jest.fn().mockReturnValue({
        id: jest.fn().mockReturnThis(),
        distance: jest.fn().mockReturnThis(),
        strength: jest.fn().mockReturnThis()
    })
}));

import * as d3 from 'd3';
import { setupGraph } from '../setupGraph';
import { createMockSelection } from '../__mocks__/d3Mock';
import { mockGraphData } from './mockData';

describe('Graph Setup', () => {
    let container;
    let mockGraphData;
    
    beforeEach(() => {
        jest.clearAllMocks();
        container = createMockSelection();
        mockGraphData = {
            nodes: [
                { id: 1, label: 'Node 1' },
                { id: 2, label: 'Node 2' }
            ],
            links: [
                { source: 1, target: 2 }
            ]
        };
    });

    test('initializes with correct data', () => {
        // Create mock selections
        const container = createMockSelection();
        const defsSelection = createMockSelection('defs');
        const graphContainer = createMockSelection('g');
        const linksGroup = createMockSelection('g');
        const nodesGroup = createMockSelection('g');
        const linkElements = createMockSelection('line');
        const nodeElements = createMockSelection('g');

        // Set up the selection chain
        container.append
            .mockReturnValueOnce(defsSelection)  // defs
            .mockReturnValueOnce(graphContainer); // graph container
        
        graphContainer.append
            .mockReturnValueOnce(linksGroup)
            .mockReturnValueOnce(nodesGroup);
        
        linksGroup.selectAll
            .mockReturnValue(linkElements);
        linkElements.data
            .mockReturnValue(linkElements);
        linkElements.join
            .mockReturnValue(linkElements);
        
        nodesGroup.selectAll
            .mockReturnValue(nodeElements);
        nodeElements.data
            .mockReturnValue(nodeElements);
        nodeElements.join
            .mockReturnValue(nodeElements);
        
        // Create the graph
        const graph = setupGraph(container, mockGraphData, 800, 600, 'dark');
        
        // Verify force simulation setup
        expect(d3.forceSimulation).toHaveBeenCalledWith(mockGraphData.nodes);
        expect(d3.forceLink).toHaveBeenCalledWith(mockGraphData.links);
        expect(d3.forceManyBody).toHaveBeenCalled();
        expect(d3.forceCenter).toHaveBeenCalledWith(400, 300);

        // Verify container setup
        expect(container.append).toHaveBeenNthCalledWith(1, 'defs');
        expect(container.append).toHaveBeenNthCalledWith(2, 'g');
        
        // Verify links setup
        expect(linksGroup.selectAll).toHaveBeenCalledWith('line');
        expect(linkElements.data).toHaveBeenCalledWith(mockGraphData.links);
        expect(linkElements.join).toHaveBeenCalledWith('line');
        
        // Verify nodes setup
        expect(nodesGroup.selectAll).toHaveBeenCalledWith('g');
        expect(nodeElements.data).toHaveBeenCalledWith(mockGraphData.nodes);
        expect(nodeElements.join).toHaveBeenCalledWith('g');
    });

    test('applies correct styling based on theme', () => {
        // Create mock selections for the chain
        const container = createMockSelection();
        const defsSelection = createMockSelection('defs');
        const graphContainer = createMockSelection('g');
        const linksGroup = createMockSelection('g');
        const nodesGroup = createMockSelection('g');
        const linkElements = createMockSelection('line');
        const nodeElements = createMockSelection('g');
        const nodeCircles = createMockSelection('circle');

        // Set up the selection chain
        container.append
            .mockReturnValueOnce(defsSelection)   // defs
            .mockReturnValueOnce(graphContainer); // graph container
            
        graphContainer.append
            .mockReturnValueOnce(linksGroup)      // links container
            .mockReturnValueOnce(nodesGroup);     // nodes container
        
        linksGroup.selectAll
            .mockReturnValue(linkElements);
        linkElements.data
            .mockReturnValue(linkElements);
        linkElements.join
            .mockReturnValue(linkElements);
        
        nodesGroup.selectAll
            .mockReturnValue(nodeElements);
        nodeElements.data
            .mockReturnValue(nodeElements);
        nodeElements.join
            .mockReturnValue(nodeElements);
        nodeElements.append
            .mockReturnValue(nodeCircles);
        
        // Create the graph with dark theme
        setupGraph(container, mockGraphData, 800, 600, 'dark');
        
        // Verify container setup
        expect(container.append).toHaveBeenNthCalledWith(1, 'defs');
        expect(container.append).toHaveBeenNthCalledWith(2, 'g');
        
        // Verify links setup
        expect(linksGroup.selectAll).toHaveBeenCalledWith('line');
        expect(linkElements.data).toHaveBeenCalledWith(mockGraphData.links);
        expect(linkElements.join).toHaveBeenCalledWith('line');
        expect(linkElements.attr).toHaveBeenCalledWith('stroke', '#6b7280');
        
        // Verify nodes setup
        expect(nodesGroup.selectAll).toHaveBeenCalledWith('g');
        expect(nodeElements.data).toHaveBeenCalledWith(mockGraphData.nodes);
        expect(nodeElements.join).toHaveBeenCalledWith('g');
        expect(nodeElements.attr).toHaveBeenCalledWith('class', 'graph-node');
        
        // Verify drag behavior
        expect(d3.drag).toHaveBeenCalled();
        const dragBehavior = d3.drag();
        expect(dragBehavior.on).toHaveBeenCalledWith('start', expect.any(Function));
        expect(dragBehavior.on).toHaveBeenCalledWith('drag', expect.any(Function));
        expect(dragBehavior.on).toHaveBeenCalledWith('end', expect.any(Function));
        expect(nodeElements.call).toHaveBeenCalledWith(dragBehavior);
        
        // Verify node styling
        expect(nodeElements.append).toHaveBeenCalledWith('circle');
        
        // Check each required attribute individually
        const attrCalls = nodeCircles.attr.mock.calls;
        const findAttrCall = (name) => attrCalls.find(call => call[0] === name);
        
        // Check radius (should be a function to handle custom sizes)
        const rCall = findAttrCall('r');
        expect(rCall).toBeTruthy();
        expect(rCall[1]).toEqual(expect.any(Function));
        
        // Check fill (should be a function to handle custom colors)
        const fillCall = findAttrCall('fill');
        expect(fillCall).toBeTruthy();
        expect(fillCall[1]).toEqual(expect.any(Function));
        
        // Test the fill function with a node that has no custom color
        const defaultNode = { id: 1 };
        expect(fillCall[1](defaultNode)).toBe('#4b5563');
        
        // Test the fill function with a node that has a custom color
        const customNode = { id: 2, properties: { color: '#ff0000' } };
        expect(fillCall[1](customNode)).toBe('#ff0000');
        
        // Check stroke (should be a constant color)
        const strokeCall = findAttrCall('stroke');
        expect(strokeCall).toBeTruthy();
        expect(strokeCall[1]).toBe('#1f2937');
        
        // Check stroke width (should be constant)
        const strokeWidthCall = findAttrCall('stroke-width');
        expect(strokeWidthCall).toBeTruthy();
        expect(strokeWidthCall[1]).toBe(2);
        
        // Verify shadow effect
        expect(nodeCircles.style).toHaveBeenCalledWith('filter', 'url(#drop-shadow)');
    });

    test('handles empty data gracefully', () => {
        const container = createMockSelection();
        const emptyData = { nodes: [], links: [] };
        const graph = setupGraph(container, emptyData, 800, 600, 'light');
        
        expect(d3.forceSimulation).toHaveBeenCalledWith([]);
        expect(d3.forceLink).toHaveBeenCalledWith([]);
        expect(d3.forceManyBody).toHaveBeenCalled();
        expect(d3.forceCenter).toHaveBeenCalledWith(400, 300);
    });
});
