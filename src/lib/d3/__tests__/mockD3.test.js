// Mock D3 implementation using module factory pattern
jest.mock('d3', () => require('../__mocks__/d3'));

import * as d3 from 'd3';
import { createMockSelection } from '../__mocks__/modules/selectionMock';
import { MockZoomTransform } from '../__mocks__/modules/zoomMock';

describe('Mock D3', () => {
    describe('Selection Module', () => {
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
            expect(selection._classes.active).toBe(true);
        });

        test('selection maintains parent-child relationships', () => {
            const parent = createMockSelection('parent');
            const child = parent.append('child');
            
            expect(child._parents[0]).toBe(parent);
            expect(child._type).toBe('child');
            expect(parent._groups[0]).toContain(child);
        });

        test('selection tracks method calls', () => {
            const selection = createMockSelection('test');
            const handler = jest.fn();
            
            selection
                .attr('width', 100)
                .style('fill', 'blue')
                .on('click', handler);
            
            expect(selection._mockCalls.attr).toContainEqual({ name: 'width', value: 100 });
            expect(selection._mockCalls.style).toContainEqual({ name: 'fill', value: 'blue' });
            expect(selection._mockCalls.on).toContainEqual({ eventName: 'click', handler });
        });
    });

    describe('Force Module', () => {
        test('force simulation provides required methods', () => {
            const simulation = d3.forceSimulation();
            expect(simulation.force).toBeDefined();
            expect(simulation.nodes).toBeDefined();
            expect(simulation.alpha).toBeDefined();
            expect(simulation.restart).toBeDefined();
            expect(simulation.stop).toBeDefined();
        });

        test('force simulation maintains proper configuration', () => {
            const simulation = d3.forceSimulation()
                .nodes([{ id: 1 }, { id: 2 }])
                .force('charge', d3.forceManyBody().strength(-30))
                .force('center', d3.forceCenter(50, 50));
            
            expect(simulation._nodes).toHaveLength(2);
            expect(simulation._forces.get('charge')).toBeDefined();
            expect(simulation._forces.get('center')).toBeDefined();
        });
    });

    describe('Zoom Module', () => {
        test('zoom behavior provides required methods', () => {
            const zoom = d3.zoom();
            expect(zoom.scaleExtent).toBeDefined();
            expect(zoom.translateExtent).toBeDefined();
            expect(zoom.on).toBeDefined();
            expect(zoom.transform).toBeDefined();
        });

        test('zoom transform operations work correctly', () => {
            const transform = new MockZoomTransform(2, 100, 50);
            expect(transform.toString()).toBe('translate(100,50) scale(2)');
            
            const scaled = transform.scale(2);
            expect(scaled.k).toBe(4);
            expect(scaled.x).toBe(100);
            expect(scaled.y).toBe(50);
            
            const translated = transform.translate(25, 25);
            expect(translated.x).toBe(150);  // 100 + (2 * 25)
            expect(translated.y).toBe(100);  // 50 + (2 * 25)
        });
    });

    test('d3 mock provides all required functionality', () => {
        expect(d3.select).toBeDefined();
        expect(d3.selectAll).toBeDefined();
        expect(d3.zoom).toBeDefined();
        expect(d3.forceSimulation).toBeDefined();
        expect(d3.forceManyBody).toBeDefined();
        expect(d3.forceCenter).toBeDefined();
        expect(d3.forceLink).toBeDefined();
        expect(d3.scaleLinear).toBeDefined();
        expect(d3.min).toBeDefined();
        expect(d3.max).toBeDefined();
    });
});
