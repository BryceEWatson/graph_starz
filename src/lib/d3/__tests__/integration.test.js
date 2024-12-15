// Mock SelectionManager
jest.mock('../selection/selectionManager', () => ({
    SelectionManager: jest.fn().mockImplementation(() => ({
        selectNode: jest.fn(),
        addToSelection: jest.fn(),
        clearSelection: jest.fn()
    }))
}));

// Mock D3 implementation using module factory pattern
jest.mock('d3', () => require('../__mocks__/d3'));

import * as d3 from 'd3';
import { createMockSelection } from '../__mocks__/modules/selectionMock';
import { MockZoomTransform } from '../__mocks__/modules/zoomMock';

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

// Mock Neo4j client
jest.mock('../../neo4j/api-client', () => ({
    initialize: jest.fn(),
    getDriver: jest.fn()
}));

// Mock next-auth
jest.mock('next-auth', () => ({
    getServerSession: jest.fn()
}));

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

describe('D3 Mock Integration', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Selection and Force Integration', () => {
        test('selection methods chain with force simulation', () => {
            const container = createMockSelection();
            const nodes = [
                { id: 1, x: 100, y: 100 },
                { id: 2, x: 200, y: 200 }
            ];
            const links = [
                { source: 1, target: 2 }
            ];

            // Create force simulation
            const simulation = d3.forceSimulation(nodes)
                .force('charge', d3.forceManyBody())
                .force('link', d3.forceLink(links))
                .force('center', d3.forceCenter());

            // Create node elements with force simulation
            const nodeElements = container
                .append('g')
                .selectAll('circle')
                .data(nodes)
                .join('circle');

            // Verify simulation methods were called
            expect(d3.forceSimulation).toHaveBeenCalledWith(nodes);
            expect(d3.forceManyBody).toHaveBeenCalled();
            expect(d3.forceLink).toHaveBeenCalledWith(links);
            expect(d3.forceCenter).toHaveBeenCalled();

            // Verify selection chaining
            expect(container.append).toHaveBeenCalledWith('g');
            expect(nodeElements.data).toHaveBeenCalledWith(nodes);
            expect(nodeElements.join).toHaveBeenCalledWith('circle');
        });

        test('force simulation updates trigger selection updates', () => {
            const container = createMockSelection();
            const nodes = [
                { id: 1, x: 0, y: 0 },
                { id: 2, x: 0, y: 0 }
            ];

            // Create force simulation
            const simulation = d3.forceSimulation(nodes)
                .force('charge', d3.forceManyBody().strength(-30))
                .force('center', d3.forceCenter(300, 300))
                .on('tick', () => {
                    container.selectAll('circle')
                        .data(nodes)
                        .join('circle')
                        .attr('cx', d => d.x)
                        .attr('cy', d => d.y);
                });

            // Verify simulation setup
            expect(simulation.on).toHaveBeenCalledWith('tick', expect.any(Function));
            expect(d3.forceManyBody().strength).toHaveBeenCalledWith(-30);
            expect(d3.forceCenter).toHaveBeenCalledWith(300, 300);

            // Trigger a tick event
            const tickHandler = simulation.on.mock.calls.find(call => call[0] === 'tick')[1];
            tickHandler();

            // Verify selection updates
            expect(container.selectAll).toHaveBeenCalledWith('circle');
            const circles = container.selectAll('circle');
            expect(circles.data).toHaveBeenCalledWith(nodes);
            expect(circles.join).toHaveBeenCalledWith('circle');
            expect(circles.attr).toHaveBeenCalledWith('cx', expect.any(Function));
            expect(circles.attr).toHaveBeenCalledWith('cy', expect.any(Function));
        });
    });

    describe('Selection and Zoom Integration', () => {
        test('zoom behavior properly integrates with selections', () => {
            const container = createMockSelection();
            const zoomBehavior = d3.zoom()
                .scaleExtent([0.1, 4])
                .on('zoom', (event) => {
                    container.select('g')
                        .attr('transform', event.transform);
                });

            container.call(zoomBehavior);

            // Verify zoom setup
            expect(d3.zoom).toHaveBeenCalled();
            expect(zoomBehavior.scaleExtent).toHaveBeenCalledWith([0.1, 4]);
            expect(zoomBehavior.on).toHaveBeenCalledWith('zoom', expect.any(Function));
            expect(container.call).toHaveBeenCalledWith(zoomBehavior);

            // Simulate zoom event
            const zoomHandler = zoomBehavior.on.mock.calls.find(call => call[0] === 'zoom')[1];
            const mockEvent = {
                transform: new MockZoomTransform(2, 100, 100)
            };
            zoomHandler(mockEvent);

            // Verify selection updates from zoom
            expect(container.select).toHaveBeenCalledWith('g');
            const g = container.select('g');
            expect(g.attr).toHaveBeenCalledWith('transform', mockEvent.transform);
        });
    });

    describe('Force and Drag Integration', () => {
        test('drag behavior properly integrates with force simulation', () => {
            const nodes = [
                { id: 1, x: 100, y: 100 },
                { id: 2, x: 200, y: 200 }
            ];

            // Create force simulation
            const simulation = d3.forceSimulation(nodes);

            // Create drag behavior
            const dragBehavior = d3.drag()
                .on('start', () => {
                    simulation.alphaTarget(0.3).restart();
                })
                .on('drag', () => {
                    const node = nodes[0];
                    node.x = 150;
                    node.y = 150;
                })
                .on('end', () => {
                    simulation.alphaTarget(0);
                });

            // Create container and nodes
            const container = createMockSelection();
            const nodeElements = container
                .append('g')
                .selectAll('circle')
                .data(nodes)
                .join('circle')
                .call(dragBehavior);

            // Verify drag behavior setup
            expect(d3.drag).toHaveBeenCalled();
            expect(dragBehavior.on).toHaveBeenCalledWith('start', expect.any(Function));
            expect(dragBehavior.on).toHaveBeenCalledWith('drag', expect.any(Function));
            expect(dragBehavior.on).toHaveBeenCalledWith('end', expect.any(Function));

            // Simulate drag start
            const dragStartHandler = dragBehavior.on.mock.calls.find(call => call[0] === 'start')[1];
            dragStartHandler();
            expect(simulation.alphaTarget).toHaveBeenCalledWith(0.3);
            expect(simulation.restart).toHaveBeenCalled();

            // Simulate drag
            const dragHandler = dragBehavior.on.mock.calls.find(call => call[0] === 'drag')[1];
            dragHandler();
            expect(nodes[0].x).toBe(150);
            expect(nodes[0].y).toBe(150);

            // Simulate drag end
            const dragEndHandler = dragBehavior.on.mock.calls.find(call => call[0] === 'end')[1];
            dragEndHandler();
            expect(simulation.alphaTarget).toHaveBeenCalledWith(0);
        });
    });
});
