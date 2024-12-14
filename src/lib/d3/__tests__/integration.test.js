// Mock SelectionManager
jest.mock('../selection/selectionManager', () => ({
    SelectionManager: jest.fn().mockImplementation(() => ({
        selectNode: jest.fn(),
        addToSelection: jest.fn(),
        clearSelection: jest.fn()
    }))
}));

// Create a function that returns a new mock selection to avoid shared state
const createMockSelection = () => {
    const selection = {
        append: jest.fn(),
        attr: jest.fn(),
        style: jest.fn(),
        call: jest.fn(),
        on: jest.fn(),
        data: jest.fn(),
        join: jest.fn(),
        selectAll: jest.fn(),
        node: jest.fn(),
        select: jest.fn(),
        remove: jest.fn(),
        classed: jest.fn(),
        text: jest.fn(),
        html: jest.fn(),
        transition: jest.fn(),
        duration: jest.fn(),
        ease: jest.fn(),
        filter: jest.fn()
    };

    // Make all methods chainable
    Object.keys(selection).forEach(key => {
        selection[key].mockReturnValue(selection);
    });

    // Special implementations
    const domElement = document.createElement('div');
    selection.node.mockReturnValue(domElement);
    selection.append.mockImplementation(type => {
        const newSelection = createMockSelection();
        // Store the element type for verification
        newSelection._type = type;
        return newSelection;
    });
    selection.selectAll.mockReturnValue(selection);
    selection.select.mockReturnValue(selection);
    selection.data.mockImplementation(data => {
        selection._data = data;
        return selection;
    });
    selection.join.mockImplementation(type => {
        const newSelection = createMockSelection();
        newSelection._type = type;
        newSelection._data = selection._data;
        return newSelection;
    });
    selection.filter.mockImplementation(predicate => {
        const newSelection = createMockSelection();
        if (selection._data) {
            newSelection._data = Array.isArray(selection._data) 
                ? selection._data.filter(predicate)
                : predicate(selection._data) ? [selection._data] : [];
        }
        return newSelection;
    });

    return selection;
};

// Mock D3 implementation using module factory pattern
jest.mock('d3', () => {
    const createMockSimulation = (nodes) => {
        const simulation = {
            _nodes: nodes?.map(n => ({ ...n, x: 0, y: 0, vx: 0, vy: 0 })) || [],
            _forces: new Map(),
            nodes: jest.fn().mockImplementation(n => {
                if (n) simulation._nodes = n.map(node => ({ ...node, x: 0, y: 0, vx: 0, vy: 0 }));
                return simulation;
            }),
            force: jest.fn().mockImplementation((name, force) => {
                simulation._forces.set(name, force);
                return simulation;
            }),
            alpha: jest.fn().mockReturnThis(),
            alphaTarget: jest.fn().mockReturnThis(),
            alphaDecay: jest.fn().mockReturnThis(),
            velocityDecay: jest.fn().mockReturnThis(),
            restart: jest.fn().mockReturnThis(),
            tick: jest.fn().mockReturnThis(),
            on: jest.fn().mockImplementation((event, callback) => {
                if (event === 'tick') callback();
                return simulation;
            })
        };
        if (nodes) simulation.nodes(nodes);
        return simulation;
    };

    const d3Mock = {
        select: jest.fn().mockImplementation(() => createMockSelection()),
        zoom: jest.fn().mockReturnValue({
            scaleExtent: jest.fn().mockReturnThis(),
            on: jest.fn().mockReturnThis()
        }),
        drag: jest.fn().mockReturnValue({
            on: jest.fn().mockReturnThis()
        }),
        forceSimulation: jest.fn().mockImplementation(nodes => createMockSimulation(nodes)),
        forceManyBody: jest.fn().mockReturnValue({
            strength: jest.fn().mockReturnThis()
        }),
        forceCenter: jest.fn().mockReturnValue({
            x: jest.fn().mockReturnThis(),
            y: jest.fn().mockReturnThis()
        }),
        forceLink: jest.fn().mockImplementation(links => ({
            id: jest.fn().mockReturnThis(),
            distance: jest.fn().mockReturnThis(),
            strength: jest.fn().mockReturnThis(),
            _links: links
        })),
        forceCollide: jest.fn().mockReturnValue({
            radius: jest.fn().mockReturnThis()
        }),
        forceX: jest.fn().mockReturnValue({
            strength: jest.fn().mockReturnThis()
        }),
        forceY: jest.fn().mockReturnValue({
            strength: jest.fn().mockReturnThis()
        })
    };
    return d3Mock;
});

// Mock Neo4j client
jest.mock('../../neo4j/api-client', () => ({
    initialize: jest.fn(),
    getDriver: jest.fn()
}));

// Mock next-auth
jest.mock('next-auth', () => ({
    getServerSession: jest.fn()
}));

import * as d3 from 'd3';
import { setupGraph } from '../setupGraph';
import { mockGraphData } from './mockData';
import { getGraphData } from '../../neo4j/queries';

describe('Neo4j to D3 Integration', () => {
    let container;
    
    beforeEach(() => {
        jest.clearAllMocks();
        container = createMockSelection();
    });

    test('Neo4j data properly renders in D3', async () => {
        const graphData = { 
            nodes: [
                { id: 1, type: 'user', name: 'User 1' },
                { id: 2, type: 'image', name: 'Image 1' }
            ],
            links: [{ source: 1, target: 2 }]
        };
        const graph = setupGraph(container, graphData, 800, 600, 'light');
        
        // Verify filter and SVG setup
        const defsSelection = container.append.mock.results[0].value;
        expect(defsSelection._type).toBe('defs');
        
        // Verify force simulation setup
        expect(d3.forceSimulation).toHaveBeenCalledWith(graphData.nodes);
        expect(graph.simulation._nodes).toEqual(
            graphData.nodes.map(n => expect.objectContaining({
                ...n,
                x: expect.any(Number),
                y: expect.any(Number),
                vx: expect.any(Number),
                vy: expect.any(Number)
            }))
        );
        
        // Verify link setup
        expect(graph.simulation._forces.get('link')._links).toEqual(graphData.links);
    });

    test('Handles empty graph data gracefully', async () => {
        const emptyData = { nodes: [], links: [] };
        const graph = setupGraph(container, emptyData, 800, 600, 'light');
        
        expect(graph.simulation).toBeDefined();
        expect(graph.simulation._nodes).toEqual([]);
        expect(graph.simulation._forces.get('link')._links).toEqual([]);
    });

    test('Node styling matches properties', () => {
        const nodeData = { 
            nodes: [{ id: 1, type: 'user', properties: { color: '#ff0000' } }],
            links: []
        };
        const graph = setupGraph(container, nodeData, 800, 600, 'light');
        
        // Verify filter creation
        const defsSelection = container.append.mock.results[0].value;
        expect(defsSelection._type).toBe('defs');
        
        // Verify container group creation
        const graphContainer = container.append.mock.results[1].value;
        expect(graphContainer._type).toBe('g');
        
        // Verify nodes group creation
        const nodesGroup = graphContainer.append.mock.results[1].value;
        expect(nodesGroup.selectAll).toHaveBeenCalledWith('g');
        expect(nodesGroup.data).toHaveBeenCalledWith(nodeData.nodes);
    });

    test('Force simulation parameters are properly set', () => {
        const graph = setupGraph(container, mockGraphData, 800, 600, 'light');
        
        // Verify force simulation setup
        expect(d3.forceSimulation).toHaveBeenCalledWith(mockGraphData.nodes);
        expect(d3.forceManyBody).toHaveBeenCalled();
        expect(d3.forceCenter).toHaveBeenCalledWith(400, 300);
        expect(d3.forceLink).toHaveBeenCalledWith(mockGraphData.links);
        
        // Verify force configuration
        const simulation = graph.simulation;
        expect(simulation._forces.has('link')).toBe(true);
        expect(simulation._forces.has('charge')).toBe(true);
        expect(simulation._forces.has('center')).toBe(true);
    });
});
