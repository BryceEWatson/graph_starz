// Mock D3 implementation using module factory pattern
jest.mock('d3', () => require('../__mocks__/d3Mock'));

import * as d3 from 'd3';
import { createMockSelection } from '../__mocks__/d3Mock';

describe('Mock D3', () => {
    test('createMockSelection returns a valid selection object', () => {
        const selection = createMockSelection('test');
        expect(selection._type).toBe('test');
        expect(selection.append).toBeDefined();
        expect(selection.selectAll).toBeDefined();
        expect(selection.select).toBeDefined();
        expect(selection.data).toBeDefined();
        expect(selection.join).toBeDefined();
        expect(selection.on).toBeDefined();
        expect(selection.attr).toBeDefined();
        expect(selection.style).toBeDefined();
        expect(selection.transition).toBeDefined();
    });

    test('mockD3 provides required D3 functionality', () => {
        expect(d3.select).toBeDefined();
        expect(d3.zoom).toBeDefined();
        expect(d3.drag).toBeDefined();
        expect(d3.forceSimulation).toBeDefined();
        expect(d3.forceManyBody).toBeDefined();
        expect(d3.forceCenter).toBeDefined();
        expect(d3.forceLink).toBeDefined();
    });

    test('selection methods maintain proper chaining', () => {
        const selection = createMockSelection('test');
        
        // Test method chaining
        const chainedSelection = selection
            .attr('test', 'value')
            .style('color', 'red')
            .classed('active', true)
            .on('click', () => {});

        expect(chainedSelection).toBe(selection);
        expect(selection._attributes.test).toBe('value');
        expect(selection._styles.color).toBe('red');
    });

    test('selection maintains parent-child relationships', () => {
        const parent = createMockSelection('parent');
        const child = parent.append('child');
        
        expect(child._parent).toBe(parent);
        expect(child._type).toBe('child');
    });
});
