import { setupHoverInteractions } from '../interactions/hover';
import { mockGraphData } from './mockData';
import * as d3 from 'd3';

// Mock D3 selections
const mockSelection = {
    style: jest.fn().mockReturnThis(),
    on: jest.fn().mockReturnThis(),
    each: jest.fn(),
    empty: jest.fn().mockReturnValue(false),
    html: jest.fn().mockReturnThis(),
};

// Mock d3.select
jest.spyOn(d3, 'select').mockImplementation(() => mockSelection);

describe('Hover Interactions', () => {
    let nodes, links, labels;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Create mock selections
        nodes = {
            ...mockSelection,
            data: () => mockGraphData.nodes,
        };
        
        links = {
            ...mockSelection,
            data: () => mockGraphData.links,
        };
        
        labels = {
            ...mockSelection,
            data: () => mockGraphData.nodes,
        };
    });

    test('setupHoverInteractions registers mouse events', () => {
        setupHoverInteractions(nodes, links, labels);
        
        // Should register mouseover, mousemove, and mouseout events
        expect(nodes.on).toHaveBeenCalledWith('mouseover', expect.any(Function));
        expect(nodes.on).toHaveBeenCalledWith('mousemove', expect.any(Function));
        expect(nodes.on).toHaveBeenCalledWith('mouseout', expect.any(Function));
    });

    test('mouseover highlights connected nodes and shows tooltip', () => {
        setupHoverInteractions(nodes, links, labels);
        
        // Get the mouseover handler
        const mouseoverHandler = nodes.on.mock.calls.find(call => call[0] === 'mouseover')[1];
        
        // Simulate mouseover event
        const event = { pageX: 100, pageY: 100 };
        const node = mockGraphData.nodes[0];
        
        mouseoverHandler(event, node);
        
        // Should update opacities
        expect(nodes.style).toHaveBeenCalledWith('opacity', expect.any(Function));
        expect(links.style).toHaveBeenCalledWith('opacity', expect.any(Function));
        expect(labels.style).toHaveBeenCalledWith('opacity', expect.any(Function));
        
        // Should show and position tooltip
        expect(mockSelection.style).toHaveBeenCalledWith('opacity', 1);
        expect(mockSelection.style).toHaveBeenCalledWith('left', '110px');
        expect(mockSelection.style).toHaveBeenCalledWith('top', '90px');
    });

    test('mouseout resets highlights and hides tooltip', () => {
        setupHoverInteractions(nodes, links, labels);
        
        // Get the mouseout handler
        const mouseoutHandler = nodes.on.mock.calls.find(call => call[0] === 'mouseout')[1];
        
        mouseoutHandler();
        
        // Should reset opacities
        expect(nodes.style).toHaveBeenCalledWith('opacity', 1);
        expect(links.style).toHaveBeenCalledWith('opacity', 0.6);
        expect(labels.style).toHaveBeenCalledWith('opacity', 0);
        
        // Should hide tooltip
        expect(mockSelection.style).toHaveBeenCalledWith('opacity', 0);
    });
});
