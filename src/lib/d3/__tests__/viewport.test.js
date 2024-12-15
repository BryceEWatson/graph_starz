// Mock D3 implementation using module factory pattern
jest.mock('d3', () => require('../__mocks__/d3'));

import * as d3 from 'd3';
import { ViewportManager } from '../viewportManager';
import { mockGraphData } from './mockData';
import { createMockSelection } from '../__mocks__/modules/selectionMock';
import { MockZoomTransform } from '../__mocks__/modules/zoomMock';

describe('ViewportManager', () => {
    let viewportManager;
    let container;
    let width;
    let height;

    beforeEach(() => {
        width = 800;
        height = 600;
        container = createMockSelection('svg');
        container._empty = false;  // Make container non-empty for tests
        viewportManager = new ViewportManager(container, width, height);
    });

    test('initializes with correct dimensions and zoom constraints', () => {
        // Get zoom behavior from mock calls
        expect(container._mockCalls.call).toHaveLength(2);  // zoom and initial transform
        const zoomBehavior = container._mockCalls.call[0][0];
        
        // Verify zoom configuration
        expect(zoomBehavior._scaleExtent).toEqual([0.1, 4]);
        expect(zoomBehavior._translateExtent).toEqual([
            [-width * 2, -height * 2],
            [width * 2, height * 2]
        ]);
        
        // Verify container setup
        const graphContainer = container.select('.graph-container');
        expect(graphContainer._attributes.transform).toBe('translate(0,0)');
    });

    test('centers viewport on specific node', () => {
        const node = mockGraphData.nodes[0];
        viewportManager.centerOnNode(node);
        
        // Should create a transition
        expect(container._mockCalls.transition).toHaveLength(1);
        
        // Should call zoom transform
        const lastCall = container._mockCalls.call[container._mockCalls.call.length - 1];
        expect(lastCall[0]).toBeDefined();
        expect(lastCall[0].transform).toBeDefined();
    });

    test('handles zoom events correctly', () => {
        // Get zoom behavior from initialization
        const zoomBehavior = container._mockCalls.call[0][0];
        
        // Simulate zoom event
        const event = {
            transform: { k: 1.5, x: 100, y: 100 }
        };
        zoomBehavior._listeners.zoom(event);
        
        // Verify internal state updated
        expect(viewportManager.currentZoom).toBe(1.5);
        expect(viewportManager.currentTransform).toBe(event.transform);
        
        // Verify transform applied to container
        const graphContainer = container.select('.graph-container');
        expect(graphContainer._attributes.transform).toBeDefined();
    });

    test('maintains viewport boundaries during pan', () => {
        // Get zoom behavior
        const zoomBehavior = container._mockCalls.call[0][0];
        
        // Simulate pan outside bounds
        const event = {
            transform: { k: 1, x: width * 3, y: height * 3 }
        };
        zoomBehavior._listeners.zoom(event);
        
        // Verify transform is within bounds
        const graphContainer = container.select('.graph-container');
        const transform = graphContainer._attributes.transform;
        expect(transform.x).toBeLessThanOrEqual(width * 2);
        expect(transform.y).toBeLessThanOrEqual(height * 2);
    });

    test('updates dimensions correctly', () => {
        const newWidth = 1000;
        const newHeight = 800;
        
        viewportManager.updateDimensions(newWidth, newHeight);
        
        // Get latest zoom behavior
        const zoomBehavior = container._mockCalls.call[container._mockCalls.call.length - 1][0];
        
        // Verify updated constraints
        expect(zoomBehavior._translateExtent).toEqual([
            [-newWidth * 2, -newHeight * 2],
            [newWidth * 2, newHeight * 2]
        ]);
        
        // Verify transform updated
        const graphContainer = container.select('.graph-container');
        expect(graphContainer._attributes.transform).toBeDefined();
    });

    test('throws error for invalid SVG element', () => {
        const emptyContainer = createMockSelection('svg');
        emptyContainer._empty = true;
        
        expect(() => {
            new ViewportManager(emptyContainer, width, height);
        }).toThrow('Invalid SVG element provided to ViewportManager');
    });

    test('handles invalid zoom event gracefully', () => {
        const invalidEvent = null;
        const consoleWarnSpy = jest.spyOn(console, 'warn');
        
        viewportManager.handleZoom(invalidEvent);
        
        expect(consoleWarnSpy).toHaveBeenCalledWith('Invalid zoom event received');
        consoleWarnSpy.mockRestore();
    });

    test('resets viewport to initial state', () => {
        // First zoom to a different state
        const zoomEvent = {
            transform: { k: 2, x: 100, y: 100 }
        };
        viewportManager.handleZoom(zoomEvent);
        
        // Then reset
        viewportManager.reset();
        
        // Verify transition was created
        expect(container._mockCalls.transition).toHaveLength(1);
        
        // Verify zoom transform was reset
        const lastCall = container._mockCalls.call[container._mockCalls.call.length - 1];
        expect(lastCall[1]).toEqual(d3.zoomIdentity);
    });

    test('handles extreme zoom values correctly', () => {
        const zoomBehavior = container._mockCalls.call[0][0];
        
        // Test maximum zoom
        const maxZoomEvent = {
            transform: { k: 5, x: 0, y: 0 }  // Beyond max of 4
        };
        zoomBehavior._listeners.zoom(maxZoomEvent);
        expect(viewportManager.currentZoom).toBeLessThanOrEqual(4);
        
        // Test minimum zoom
        const minZoomEvent = {
            transform: { k: 0.05, x: 0, y: 0 }  // Below min of 0.1
        };
        zoomBehavior._listeners.zoom(minZoomEvent);
        expect(viewportManager.currentZoom).toBeGreaterThanOrEqual(0.1);
    });

    test('maintains aspect ratio during dimension updates', () => {
        // Set initial transform
        const initialEvent = {
            transform: { k: 2, x: 100, y: 75 }  // 4:3 ratio position
        };
        viewportManager.handleZoom(initialEvent);
        
        // Update to double size maintaining aspect ratio
        viewportManager.updateDimensions(1600, 1200);
        
        // Check if position scaled proportionally
        const state = viewportManager.getState();
        expect(state.transform.x).toBe(200);  // 100 * (1600/800)
        expect(state.transform.y).toBe(150);  // 75 * (1200/600)
        expect(state.transform.k).toBe(2);    // zoom should remain unchanged
    });
});
