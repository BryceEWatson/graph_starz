import * as d3 from 'd3';
import { LinkInteractionManager } from '../../interactions/LinkInteractionManager';

// Mock D3 selection
const createMockSelection = () => {
    const selection = {
        on: jest.fn(),
        select: jest.fn(),
        filter: jest.fn(),
        call: jest.fn()
    };

    // Make methods chainable
    Object.keys(selection).forEach(key => {
        selection[key].mockReturnValue(selection);
    });

    return selection;
};

describe('LinkInteractionManager', () => {
    let validConfig;
    let mockLinks;
    let mockNodes;

    beforeEach(() => {
        validConfig = {
            hoverDuration: 200,
            opacity: {
                default: 0.6,
                hover: 0.8,
                selected: 1.0,
                faded: 0.3
            }
        };

        mockLinks = createMockSelection();
        mockNodes = createMockSelection();
    });

    describe('Configuration Validation', () => {
        test('throws on missing configuration', () => {
            expect(() => new LinkInteractionManager())
                .toThrow('Interaction configuration is required');
        });

        test('throws on invalid hover duration', () => {
            expect(() => new LinkInteractionManager({ ...validConfig, hoverDuration: -1 }))
                .toThrow('Invalid hover duration: must be a positive number');
            expect(() => new LinkInteractionManager({ ...validConfig, hoverDuration: '200' }))
                .toThrow('Invalid hover duration: must be a positive number');
        });

        test('throws on invalid opacity configuration', () => {
            expect(() => new LinkInteractionManager({ ...validConfig, opacity: null }))
                .toThrow('Invalid opacity configuration');
            expect(() => new LinkInteractionManager({ 
                ...validConfig, 
                opacity: { ...validConfig.opacity, default: -0.1 }
            })).toThrow('Invalid default opacity: must be between 0 and 1');
        });

        test('accepts valid configuration', () => {
            expect(() => new LinkInteractionManager(validConfig)).not.toThrow();
        });
    });

    describe('Event Handler Attachment', () => {
        let manager;

        beforeEach(() => {
            manager = new LinkInteractionManager(validConfig);
        });

        test('throws on invalid links', () => {
            expect(() => manager.attachEventHandlers(null, mockNodes))
                .toThrow('Invalid links: must be a valid D3 selection');
            expect(() => manager.attachEventHandlers({ on: 'not a function' }, mockNodes))
                .toThrow('Invalid links: must be a valid D3 selection');
        });

        test('throws on invalid nodes', () => {
            expect(() => manager.attachEventHandlers(mockLinks, null))
                .toThrow('Invalid links: must be a valid D3 selection');
            expect(() => manager.attachEventHandlers(mockLinks, { on: 'not a function' }))
                .toThrow('Invalid links: must be a valid D3 selection');
        });

        test('attaches all event handlers', () => {
            manager.attachEventHandlers(mockLinks, mockNodes);
            
            expect(mockLinks.on).toHaveBeenCalledWith('mouseover', expect.any(Function));
            expect(mockLinks.on).toHaveBeenCalledWith('mouseout', expect.any(Function));
        });

        test('cleanup removes all event handlers', () => {
            manager.attachEventHandlers(mockLinks, mockNodes);
            manager.removeEventHandlers();
            
            expect(mockLinks.on).toHaveBeenCalledWith('mouseover', null);
            expect(mockLinks.on).toHaveBeenCalledWith('mouseout', null);
        });
    });

    describe('Hover Behavior', () => {
        let manager;
        let mockEvent;

        beforeEach(() => {
            manager = new LinkInteractionManager(validConfig);
            mockEvent = {
                currentTarget: document.createElement('div')
            };
        });

        test('handles link hover', () => {
            manager.attachEventHandlers(mockLinks, mockNodes);
            
            // Get hover handler
            const [[, hoverHandler]] = mockLinks.on.mock.calls
                .filter(([event]) => event === 'mouseover');
            
            // Simulate hover
            hoverHandler(mockEvent, { 
                source: { id: 'node1' }, 
                target: { id: 'node2' } 
            });
            
            expect(mockNodes.filter).toHaveBeenCalled();
            expect(mockNodes.select).toHaveBeenCalledWith('circle');
        });

        test('handles link hover out', () => {
            manager.attachEventHandlers(mockLinks, mockNodes);
            
            // Get hover out handler
            const [[, hoverOutHandler]] = mockLinks.on.mock.calls
                .filter(([event]) => event === 'mouseout');
            
            // Simulate hover out
            hoverOutHandler(mockEvent, { 
                source: { id: 'node1' }, 
                target: { id: 'node2' } 
            });
            
            expect(mockNodes.filter).toHaveBeenCalled();
            expect(mockNodes.select).toHaveBeenCalledWith('circle');
        });
    });

    describe('Selection Updates', () => {
        let manager;

        beforeEach(() => {
            manager = new LinkInteractionManager(validConfig);
        });

        test('updates links based on node selection', () => {
            const selectedNodeIds = new Set(['node1']);
            
            manager.updateLinkSelection(mockLinks, selectedNodeIds);
            
            expect(mockLinks.call).toHaveBeenCalled();
        });

        test('resets links when no nodes selected', () => {
            const selectedNodeIds = new Set();
            
            manager.updateLinkSelection(mockLinks, selectedNodeIds);
            
            expect(mockLinks.call).toHaveBeenCalled();
        });

        test('handles connected and unconnected links', () => {
            const selectedNodeIds = new Set(['node1']);
            const mockLinkData = [
                { source: { id: 'node1' }, target: { id: 'node2' } },
                { source: { id: 'node3' }, target: { id: 'node4' } }
            ];

            mockLinks.data = jest.fn().mockReturnValue(mockLinkData);
            
            manager.updateLinkSelection(mockLinks, selectedNodeIds);
            
            expect(mockLinks.call).toHaveBeenCalled();
        });
    });
});
