// Mock D3 implementation using module factory pattern
jest.mock('d3', () => require('../__mocks__/d3'));

import * as d3 from 'd3';
import { SelectionViewportManager } from '../selection/selectionViewportManager';
import { mockGraphData } from './mockData';
import { createMockSelection } from '../__mocks__/modules/selectionMock';

describe('SelectionViewportManager', () => {
    let manager;
    let container;
    let width;
    let height;

    beforeEach(() => {
        width = 800;
        height = 600;
        container = createMockSelection('svg');
        container._empty = false;  // Make container non-empty for tests
        manager = new SelectionViewportManager(container, width, height);
    });

    test('initializes with empty selection and default viewport', () => {
        expect(manager.getSelectedNodes()).toEqual(new Set());
        expect(manager.getViewportState().zoom).toBe(1);
        
        // Should set up keyboard event listener
        expect(container._mockCalls.on).toContainEqual(['keydown', expect.any(Function)]);
    });

    test('selects node and centers viewport', () => {
        const node = { ...mockGraphData.nodes[0], id: 'node1' };
        manager.selectAndFocus(node);

        // Should select the node
        expect(manager.getSelectedNodes()).toEqual(new Set([node.id]));

        // Should trigger viewport transition
        expect(container._mockCalls.transition).toHaveLength(1);
        
        // Should update visual states
        const nodes = container.selectAll('.node');
        expect(nodes._mockCalls.classed).toContainEqual(['selected', expect.any(Function)]);
        expect(nodes._mockCalls.classed).toContainEqual(['focused', expect.any(Function)]);
    });

    test('maintains selection during zoom', () => {
        // Select a node first
        const node = { ...mockGraphData.nodes[0], id: 'node1' };
        manager.selectAndFocus(node);

        // Get zoom behavior
        const zoomBehavior = container._mockCalls.call[0][0];
        
        // Simulate zoom event
        const event = {
            transform: { k: 1.5, x: 100, y: 100 }
        };
        zoomBehavior._listeners.zoom(event);

        // Selection should remain unchanged
        expect(manager.getSelectedNodes()).toEqual(new Set([node.id]));
        
        // Visual states should be maintained
        const nodes = container.selectAll('.node');
        const selectedNodes = nodes._data.filter(d => 
            nodes._classes[d.id]?.includes('selected'));
        expect(selectedNodes).toContainEqual(node);
    });

    test('handles multi-select with viewport updates', () => {
        const node1 = { ...mockGraphData.nodes[0], id: 'node1', x: 0, y: 0 };
        const node2 = { ...mockGraphData.nodes[1], id: 'node2', x: 100, y: 100 };

        // Select first node
        manager.selectAndFocus(node1);
        expect(manager.getSelectedNodes()).toEqual(new Set([node1.id]));

        // Add second node to selection
        manager.addToSelectionAndAdjustView(node2);
        expect(manager.getSelectedNodes()).toEqual(new Set([node1.id, node2.id]));

        // Should adjust viewport to show both nodes
        expect(container._mockCalls.transition).toHaveLength(2);
        
        // Both nodes should be marked as selected
        const nodes = container.selectAll('.node');
        const selectedNodes = nodes._data.filter(d => 
            nodes._classes[d.id]?.includes('selected'));
        expect(selectedNodes).toContainEqual(node1);
        expect(selectedNodes).toContainEqual(node2);
    });

    test('keyboard navigation between selected nodes', () => {
        const nodes = mockGraphData.nodes.slice(0, 3).map((n, i) => ({
            ...n,
            id: `node${i}`,
            x: i * 100,
            y: i * 100
        }));

        // Select multiple nodes
        nodes.forEach(node => manager.addToSelectionAndAdjustView(node));

        // Get keyboard handler
        const keyboardHandler = container._mockCalls.on
            .find(call => call[0] === 'keydown')[1];

        // Simulate Tab key press (next)
        keyboardHandler({ key: 'Tab', shiftKey: false, preventDefault: jest.fn() });
        expect(manager.getCurrentFocusIndex()).toBe(1);

        // Simulate Shift+Tab key press (previous)
        keyboardHandler({ key: 'Tab', shiftKey: true, preventDefault: jest.fn() });
        expect(manager.getCurrentFocusIndex()).toBe(0);

        // Simulate Escape key press (clear selection)
        keyboardHandler({ key: 'Escape', preventDefault: jest.fn() });
        expect(manager.getSelectedNodes().size).toBe(0);
    });
});
