import * as d3 from 'd3';
import { NodeInteractionManager } from '../../interactions/NodeInteractionManager';

// Mock D3 selection
const createMockSelection = () => {
    const selection = {
        on: jest.fn(),
        select: jest.fn(),
        filter: jest.fn(),
        classed: jest.fn(),
        call: jest.fn()
    };

    // Make methods chainable
    Object.keys(selection).forEach(key => {
        selection[key].mockReturnValue(selection);
    });

    return selection;
};

describe('NodeInteractionManager', () => {
    let validConfig;
    let mockNodes;
    let mockLinks;

    beforeEach(() => {
        validConfig = {
            hoverDuration: 200,
            selectionDuration: 300,
            opacity: {
                default: 0.6,
                hover: 0.8,
                selected: 1.0,
                faded: 0.3
            }
        };

        mockNodes = createMockSelection();
        mockLinks = createMockSelection();
    });

    describe('Configuration Validation', () => {
        test('throws on missing configuration', () => {
            expect(() => new NodeInteractionManager())
                .toThrow('Interaction configuration is required');
        });

        test('throws on invalid hover duration', () => {
            expect(() => new NodeInteractionManager({ ...validConfig, hoverDuration: -1 }))
                .toThrow('Invalid hover duration: must be a positive number');
            expect(() => new NodeInteractionManager({ ...validConfig, hoverDuration: '200' }))
                .toThrow('Invalid hover duration: must be a positive number');
        });

        test('throws on invalid selection duration', () => {
            expect(() => new NodeInteractionManager({ ...validConfig, selectionDuration: -1 }))
                .toThrow('Invalid selection duration: must be a positive number');
            expect(() => new NodeInteractionManager({ ...validConfig, selectionDuration: '300' }))
                .toThrow('Invalid selection duration: must be a positive number');
        });

        test('throws on invalid opacity configuration', () => {
            expect(() => new NodeInteractionManager({ ...validConfig, opacity: null }))
                .toThrow('Invalid opacity configuration');
            expect(() => new NodeInteractionManager({ 
                ...validConfig, 
                opacity: { ...validConfig.opacity, default: -0.1 }
            })).toThrow('Invalid default opacity: must be between 0 and 1');
        });

        test('accepts valid configuration', () => {
            expect(() => new NodeInteractionManager(validConfig)).not.toThrow();
        });
    });

    describe('Event Handler Attachment', () => {
        let manager;

        beforeEach(() => {
            manager = new NodeInteractionManager(validConfig);
        });

        test('throws on invalid nodes', () => {
            expect(() => manager.attachEventHandlers(null, mockLinks))
                .toThrow('Invalid nodes: must be a valid D3 selection');
            expect(() => manager.attachEventHandlers({ on: 'not a function' }, mockLinks))
                .toThrow('Invalid nodes: must be a valid D3 selection');
        });

        test('throws on invalid links', () => {
            expect(() => manager.attachEventHandlers(mockNodes, null))
                .toThrow('Invalid nodes: must be a valid D3 selection');
            expect(() => manager.attachEventHandlers(mockNodes, { on: 'not a function' }))
                .toThrow('Invalid nodes: must be a valid D3 selection');
        });

        test('attaches all event handlers', () => {
            manager.attachEventHandlers(mockNodes, mockLinks);
            
            expect(mockNodes.on).toHaveBeenCalledWith('mouseover', expect.any(Function));
            expect(mockNodes.on).toHaveBeenCalledWith('mouseout', expect.any(Function));
            expect(mockNodes.on).toHaveBeenCalledWith('click', expect.any(Function));
        });

        test('cleanup removes all event handlers', () => {
            manager.attachEventHandlers(mockNodes, mockLinks);
            manager.removeEventHandlers();
            
            expect(mockNodes.on).toHaveBeenCalledWith('mouseover', null);
            expect(mockNodes.on).toHaveBeenCalledWith('mouseout', null);
            expect(mockNodes.on).toHaveBeenCalledWith('click', null);
        });
    });

    describe('Hover Behavior', () => {
        let manager;
        let mockEvent;

        beforeEach(() => {
            manager = new NodeInteractionManager(validConfig);
            mockEvent = {
                currentTarget: document.createElement('div')
            };
        });

        test('handles node hover', () => {
            manager.attachEventHandlers(mockNodes, mockLinks);
            
            // Get hover handler
            const [[, hoverHandler]] = mockNodes.on.mock.calls
                .filter(([event]) => event === 'mouseover');
            
            // Simulate hover
            hoverHandler(mockEvent, { id: 'node1' });
            
            expect(mockNodes.select).toHaveBeenCalledWith('circle');
            expect(mockNodes.select).toHaveBeenCalledWith('text');
        });

        test('handles node hover out', () => {
            manager.attachEventHandlers(mockNodes, mockLinks);
            
            // Get hover out handler
            const [[, hoverOutHandler]] = mockNodes.on.mock.calls
                .filter(([event]) => event === 'mouseout');
            
            // Simulate hover out
            hoverOutHandler(mockEvent, { id: 'node1' });
            
            expect(mockNodes.select).toHaveBeenCalledWith('circle');
            expect(mockNodes.select).toHaveBeenCalledWith('text');
        });
    });

    describe('Selection Behavior', () => {
        let manager;
        let mockEvent;

        beforeEach(() => {
            manager = new NodeInteractionManager(validConfig);
            mockEvent = {
                currentTarget: document.createElement('div'),
                shiftKey: false
            };
        });

        test('handles node selection', () => {
            manager.attachEventHandlers(mockNodes, mockLinks);
            
            // Get click handler
            const [[, clickHandler]] = mockNodes.on.mock.calls
                .filter(([event]) => event === 'click');
            
            // Simulate click
            clickHandler(mockEvent, { id: 'node1' });
            
            expect(mockNodes.classed).toHaveBeenCalledWith('selected', true);
            expect(mockNodes.filter).toHaveBeenCalled();
        });

        test('handles multi-selection with shift key', () => {
            manager.attachEventHandlers(mockNodes, mockLinks);
            
            // Get click handler
            const [[, clickHandler]] = mockNodes.on.mock.calls
                .filter(([event]) => event === 'click');
            
            // Simulate shift+click
            mockEvent.shiftKey = true;
            clickHandler(mockEvent, { id: 'node1' });
            
            expect(mockNodes.classed).toHaveBeenCalledWith('selected', true);
            expect(mockNodes.filter).toHaveBeenCalled();
        });

        test('handles deselection', () => {
            manager.attachEventHandlers(mockNodes, mockLinks);
            
            // Get click handler
            const [[, clickHandler]] = mockNodes.on.mock.calls
                .filter(([event]) => event === 'click');
            
            // Simulate click twice on same node
            clickHandler(mockEvent, { id: 'node1' });
            clickHandler(mockEvent, { id: 'node1' });
            
            expect(mockNodes.classed).toHaveBeenCalledWith('selected', false);
        });
    });

    describe('Touch Event Handling', () => {
        let manager;
        let mockEvent;

        beforeEach(() => {
            manager = new NodeInteractionManager(validConfig);
            mockEvent = {
                preventDefault: jest.fn(),
                currentTarget: document.createElement('div'),
                touches: [{ clientX: 100, clientY: 100 }]
            };
        });

        test('handles single tap', () => {
            manager.attachEventHandlers(mockNodes, mockLinks);
            
            // Get touch handler
            const [[, touchHandler]] = mockNodes.on.mock.calls
                .filter(([event]) => event === 'touchstart');
            
            // Simulate touch
            touchHandler(mockEvent);
            
            expect(mockEvent.preventDefault).toHaveBeenCalled();
            expect(mockNodes.classed).toHaveBeenCalled();
        });

        test('handles double tap', (done) => {
            manager.attachEventHandlers(mockNodes, mockLinks);
            
            // Get touch handler
            const [[, touchHandler]] = mockNodes.on.mock.calls
                .filter(([event]) => event === 'touchstart');
            
            // Simulate double tap
            touchHandler(mockEvent);
            touchHandler(mockEvent);
            
            expect(mockEvent.preventDefault).toHaveBeenCalledTimes(2);
            done();
        });

        test('prevents default on touchend', () => {
            manager.attachEventHandlers(mockNodes, mockLinks);
            
            // Get touchend handler
            const [[, touchEndHandler]] = mockNodes.on.mock.calls
                .filter(([event]) => event === 'touchend');
            
            // Simulate touch end
            touchEndHandler(mockEvent);
            
            expect(mockEvent.preventDefault).toHaveBeenCalled();
        });
    });

    describe('Resource Cleanup', () => {
        let manager;

        beforeEach(() => {
            manager = new NodeInteractionManager(validConfig);
        });

        test('removes all event handlers', () => {
            manager.attachEventHandlers(mockNodes, mockLinks);
            manager.removeEventHandlers();
            
            expect(mockNodes.on).toHaveBeenCalledWith('mouseover', null);
            expect(mockNodes.on).toHaveBeenCalledWith('mouseout', null);
            expect(mockNodes.on).toHaveBeenCalledWith('click', null);
            expect(mockNodes.on).toHaveBeenCalledWith('touchstart', null);
            expect(mockNodes.on).toHaveBeenCalledWith('touchend', null);
        });

        test('resets visual state', () => {
            manager.attachEventHandlers(mockNodes, mockLinks);
            manager.removeEventHandlers();
            
            expect(mockNodes.classed).toHaveBeenCalledWith('selected', false);
            expect(mockNodes.call).toHaveBeenCalled();
            expect(mockLinks.call).toHaveBeenCalled();
        });

        test('clears internal state', () => {
            manager.attachEventHandlers(mockNodes, mockLinks);
            manager.removeEventHandlers();
            
            expect(manager.nodes).toBeNull();
            expect(manager.links).toBeNull();
            expect(manager.cleanup).toBeNull();
            expect(manager.selectedNodes.size).toBe(0);
        });

        test('handles cleanup when no handlers attached', () => {
            expect(() => manager.removeEventHandlers()).not.toThrow();
        });
    });
});
