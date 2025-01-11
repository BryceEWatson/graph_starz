import * as d3 from 'd3';
import { TransitionManager } from '../../interactions/TransitionManager';

// Mock D3 selection
const createMockSelection = () => {
    const selection = {
        transition: jest.fn(),
        style: jest.fn(),
        attr: jest.fn()
    };

    // Make methods chainable
    Object.keys(selection).forEach(key => {
        selection[key].mockReturnValue(selection);
    });

    return selection;
};

describe('TransitionManager', () => {
    let validConfig;
    let mockSelection;

    beforeEach(() => {
        validConfig = {
            duration: 200,
            ease: d3.easeCubicInOut
        };
        mockSelection = createMockSelection();
    });

    describe('Configuration Validation', () => {
        test('throws on missing configuration', () => {
            expect(() => new TransitionManager()).toThrow('Transition configuration is required');
        });

        test('throws on invalid duration', () => {
            expect(() => new TransitionManager({ ...validConfig, duration: -1 }))
                .toThrow('Invalid duration: must be a positive number');
            expect(() => new TransitionManager({ ...validConfig, duration: '200' }))
                .toThrow('Invalid duration: must be a positive number');
        });

        test('throws on invalid ease function', () => {
            expect(() => new TransitionManager({ ...validConfig, ease: 'not a function' }))
                .toThrow('Invalid ease: must be a function');
        });

        test('accepts valid configuration', () => {
            expect(() => new TransitionManager(validConfig)).not.toThrow();
        });
    });

    describe('Transition Creation', () => {
        let manager;

        beforeEach(() => {
            manager = new TransitionManager(validConfig);
        });

        test('throws on invalid selection', () => {
            expect(() => manager.createTransition(null))
                .toThrow('Invalid selection: must be a valid D3 selection');
            expect(() => manager.createTransition({ transition: 'not a function' }))
                .toThrow('Invalid selection: must be a valid D3 selection');
        });

        test('creates transition with correct configuration', () => {
            const transition = manager.createTransition(mockSelection);
            
            expect(mockSelection.transition).toHaveBeenCalled();
            expect(transition.duration).toHaveBeenCalledWith(validConfig.duration);
            expect(transition.ease).toHaveBeenCalledWith(validConfig.ease);
        });
    });

    describe('Opacity Updates', () => {
        let manager;

        beforeEach(() => {
            manager = new TransitionManager(validConfig);
        });

        test('throws on invalid opacity', () => {
            expect(() => manager.updateOpacity(mockSelection, -0.1))
                .toThrow('Invalid opacity: must be between 0 and 1');
            expect(() => manager.updateOpacity(mockSelection, 1.1))
                .toThrow('Invalid opacity: must be between 0 and 1');
            expect(() => manager.updateOpacity(mockSelection, 'not a number'))
                .toThrow('Invalid opacity: must be between 0 and 1');
        });

        test('updates opacity with transition', () => {
            const opacity = 0.5;
            const transition = manager.updateOpacity(mockSelection, opacity);
            
            expect(transition.style).toHaveBeenCalledWith('opacity', opacity);
        });
    });

    describe('Scale Updates', () => {
        let manager;

        beforeEach(() => {
            manager = new TransitionManager(validConfig);
        });

        test('throws on invalid scale', () => {
            expect(() => manager.updateScale(mockSelection, -1))
                .toThrow('Invalid scale: must be a positive number');
            expect(() => manager.updateScale(mockSelection, 0))
                .toThrow('Invalid scale: must be a positive number');
            expect(() => manager.updateScale(mockSelection, 'not a number'))
                .toThrow('Invalid scale: must be a positive number');
        });

        test('updates scale with transition', () => {
            const scale = 1.5;
            const transition = manager.updateScale(mockSelection, scale);
            
            expect(transition.attr).toHaveBeenCalledWith('transform', `scale(${scale})`);
        });
    });

    describe('Stroke Width Updates', () => {
        let manager;

        beforeEach(() => {
            manager = new TransitionManager(validConfig);
        });

        test('throws on invalid stroke width', () => {
            expect(() => manager.updateStrokeWidth(mockSelection, -1))
                .toThrow('Invalid stroke width: must be non-negative');
            expect(() => manager.updateStrokeWidth(mockSelection, 'not a number'))
                .toThrow('Invalid stroke width: must be non-negative');
        });

        test('updates stroke width with transition', () => {
            const width = 2;
            const transition = manager.updateStrokeWidth(mockSelection, width);
            
            expect(transition.attr).toHaveBeenCalledWith('stroke-width', width);
        });
    });
});
