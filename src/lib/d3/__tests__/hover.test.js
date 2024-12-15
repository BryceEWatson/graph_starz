import { mockGraphData } from './mockData';
import { createMockSelection } from '../__mocks__/modules/selectionMock';
import * as d3 from 'd3';
import { applyNodeState } from '../interactions/hover';

describe('Hover Interactions', () => {
    let nodes, links;
    let nodeSelections;

    beforeEach(() => {
        // Reset mocks
        jest.clearAllMocks();
        
        // Create mock DOM nodes and selections
        nodeSelections = new Map();
        mockGraphData.nodes.forEach(node => {
            const nodeSelection = createMockSelection()
                .setDatum(node)
                .setEmpty(false)
                .setNode({ nodeType: 1, _data: node });
            
            // Mock image and text selections
            nodeSelection.select.mockImplementation((selector) => {
                if (selector === 'image') {
                    return createMockSelection()
                        .setDatum(node)
                        .setEmpty(node.type !== 'image');
                }
                if (selector === 'text') {
                    return createMockSelection()
                        .setDatum(node)
                        .setEmpty(false);
                }
                return createMockSelection().setEmpty(true);
            });
            nodeSelections.set(node.id, nodeSelection);
        });

        // Create mock nodes and links selections
        nodes = createMockSelection();
        nodes.data.mockReturnValue(mockGraphData.nodes);
        nodes.each.mockImplementation(callback => {
            mockGraphData.nodes.forEach(node => {
                callback.call(nodeSelections.get(node.id).node(), node);
            });
        });

        links = createMockSelection();
        links.data.mockReturnValue(mockGraphData.links);
        links.each.mockImplementation(callback => {
            mockGraphData.links.forEach(link => {
                callback.call({}, link);
            });
        });

        // Mock d3.select
        d3.select = jest.fn().mockImplementation((selector) => {
            if (selector && selector.nodeType === 1 && selector._data) {
                return nodeSelections.get(selector._data.id);
            }
            return createMockSelection();
        });
    });

    test('applies correct node state', () => {
        const node = mockGraphData.nodes[0];
        const nodeSelection = nodeSelections.get(node.id);
        
        applyNodeState(nodeSelection, 'highlighted');
        
        expect(nodeSelection.style).toHaveBeenCalledWith('opacity', 1);
        expect(nodeSelection.attr).toHaveBeenCalledWith('transform', expect.stringContaining('scale(1.2)'));
        expect(nodeSelection.classed).toHaveBeenCalledWith('highlighted', true);
    });

    test('shows labels for highlighted and related nodes', () => {
        const node = mockGraphData.nodes[0];
        const nodeSelection = nodeSelections.get(node.id);
        const textSelection = nodeSelection.select('text');
        
        applyNodeState(nodeSelection, 'highlighted');
        
        expect(textSelection.style).toHaveBeenCalledWith('opacity', 1);
        expect(textSelection.text).toHaveBeenCalledWith(node.properties.name || node.name || '');
    });

    test('handles image nodes correctly', () => {
        const imageNode = mockGraphData.nodes.find(n => n.type === 'image');
        if (!imageNode) return; // Skip if no image nodes in test data
        
        const nodeSelection = nodeSelections.get(imageNode.id);
        const imageSelection = nodeSelection.select('image');
        
        applyNodeState(nodeSelection, 'highlighted');
        
        expect(imageSelection.attr).toHaveBeenCalledWith('width', expect.any(Number));
        expect(imageSelection.attr).toHaveBeenCalledWith('height', expect.any(Number));
    });
});
