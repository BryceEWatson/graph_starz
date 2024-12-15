import * as d3 from 'd3';
import { createMockSelection } from '../__mocks__/modules/selectionMock';
import { MockZoomTransform } from '../__mocks__/modules/zoomMock';

jest.mock('d3', () => require('../__mocks__/d3'));

describe('D3 Zoom Mock', () => {
    let zoomBehavior;
    let container;

    beforeEach(() => {
        container = createMockSelection('svg');
        zoomBehavior = d3.zoom();
    });

    test('zoom behavior provides required methods', () => {
        expect(zoomBehavior.scaleExtent).toBeDefined();
        expect(zoomBehavior.translateExtent).toBeDefined();
        expect(zoomBehavior.extent).toBeDefined();
        expect(zoomBehavior.on).toBeDefined();
        expect(zoomBehavior.transform).toBeDefined();
    });

    test('transform operations', () => {
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

    test('scale extent configuration', () => {
        zoomBehavior.scaleExtent([0.5, 2]);
        expect(zoomBehavior._scaleExtent).toEqual([0.5, 2]);
    });

    test('translate extent configuration', () => {
        const extent = [[-100, -100], [100, 100]];
        zoomBehavior.translateExtent(extent);
        expect(zoomBehavior._translateExtent).toEqual(extent);
    });

    test('event handling', () => {
        const zoomHandler = jest.fn();
        zoomBehavior.on('zoom', zoomHandler);
        expect(zoomBehavior._listeners.get('zoom')).toBe(zoomHandler);
    });

    test('transform application', () => {
        const transform = new MockZoomTransform(2, 100, 50);
        zoomBehavior.transform(container, transform);
        expect(zoomBehavior._transform).toHaveBeenCalledWith(container, transform);
    });

    test('zoom scale methods', () => {
        const transform = new MockZoomTransform(2, 100, 50);
        
        zoomBehavior.transform(container, transform);
        zoomBehavior.scaleBy(container, 2);
        expect(zoomBehavior._transform).toHaveBeenCalled();
        
        zoomBehavior.scaleTo(container, 4);
        expect(zoomBehavior._transform).toHaveBeenCalled();
    });

    test('zoom translate methods', () => {
        const transform = new MockZoomTransform(1, 0, 0);
        
        zoomBehavior.transform(container, transform);
        zoomBehavior.translateBy(container, 50, 25);
        expect(zoomBehavior._transform).toHaveBeenCalled();
        
        zoomBehavior.translateTo(container, 100, 50);
        expect(zoomBehavior._transform).toHaveBeenCalled();
    });
});
