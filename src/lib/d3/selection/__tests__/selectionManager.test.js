import * as d3 from 'd3';
import { SelectionManager } from '../selectionManager';

// Create mock D3 selection
const createMockSelection = (data = []) => ({
    selectAll: jest.fn().mockReturnThis(),
    classed: jest.fn().mockReturnThis(),
    data: jest.fn(() => ({
        data: () => data,
        classed: jest.fn().mockReturnThis(),
        some: jest.fn().mockReturnValue(false)
    })),
    some: jest.fn().mockReturnValue(false)
});

jest.mock('d3', () => ({
    select: jest.fn()
}));

describe('SelectionManager', () => {
    let manager;
    let mockContainer;
    let mockNodes;
    let mockLinks;
    let mockSelection;

    beforeEach(() => {
        // Create mock DOM elements
        mockContainer = document.createElement('div');
        mockNodes = [
            { id: 'node1', type: 'user' },
            { id: 'node2', type: 'image' }
        ];
        mockLinks = [
            { source: { id: 'node1' }, target: { id: 'node2' } }
        ];

        // Set up D3 mocks
        mockSelection = createMockSelection([...mockNodes]);
        d3.select.mockReturnValue(mockSelection);

        manager = new SelectionManager(mockContainer);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    test('selectNode adds node to selection', () => {
        manager.selectNode('node1');
        expect(manager.selectedNodes.has('node1')).toBeTruthy();
        expect(manager.selectedNodes.size).toBe(1);
        expect(d3.select).toHaveBeenCalledWith(mockContainer);
        expect(mockSelection.selectAll).toHaveBeenCalledWith('.graph-node');
        expect(mockSelection.classed).toHaveBeenCalledWith('selected', expect.any(Function));
    });

    test('addToSelection allows multiple selections', () => {
        manager.selectNode('node1');
        manager.addToSelection('node2');
        expect(manager.selectedNodes.has('node1')).toBeTruthy();
        expect(manager.selectedNodes.has('node2')).toBeTruthy();
        expect(manager.selectedNodes.size).toBe(2);
        expect(mockSelection.classed).toHaveBeenCalledWith('selected', expect.any(Function));
    });

    test('deselect removes node from selection', () => {
        manager.selectNode('node1');
        manager.deselect('node1');
        expect(manager.selectedNodes.has('node1')).toBeFalsy();
        expect(manager.selectedNodes.size).toBe(0);
        expect(mockSelection.classed).toHaveBeenCalledWith('selected', expect.any(Function));
    });

    test('toggleNode toggles selection state', () => {
        manager.toggleNode('node1');
        expect(manager.selectedNodes.has('node1')).toBeTruthy();
        expect(mockSelection.classed).toHaveBeenCalledWith('selected', expect.any(Function));

        manager.toggleNode('node1');
        expect(manager.selectedNodes.has('node1')).toBeFalsy();
        expect(mockSelection.classed).toHaveBeenCalledWith('selected', expect.any(Function));
    });

    test('clearSelection removes all selections', () => {
        manager.selectNode('node1');
        manager.addToSelection('node2');
        manager.clearSelection();
        expect(manager.selectedNodes.size).toBe(0);
        expect(mockSelection.classed).toHaveBeenCalledWith('selected', expect.any(Function));
    });

    test('connected nodes are highlighted', () => {
        manager.selectNode('node1');
        expect(mockSelection.selectAll).toHaveBeenCalledWith('.graph-node');
        expect(mockSelection.classed).toHaveBeenCalledWith('connected', expect.any(Function));
    });

    test('connected links are highlighted', () => {
        manager.selectNode('node1');
        expect(mockSelection.selectAll).toHaveBeenCalledWith('.graph-link');
        expect(mockSelection.classed).toHaveBeenCalledWith('highlighted', expect.any(Function));
    });
});
