import { jest } from '@jest/globals';
import { PerformanceMonitor } from '../performanceMonitor';

describe('PerformanceMonitor', () => {
    let monitor;

    beforeEach(() => {
        monitor = new PerformanceMonitor();
        // Mock performance.now()
        jest.spyOn(performance, 'now')
            .mockImplementation(() => Date.now());
        // Mock requestAnimationFrame
        jest.spyOn(window, 'requestAnimationFrame')
            .mockImplementation(cb => setTimeout(cb, 16));
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('initializes with correct default values', () => {
        expect(monitor.metrics.frameRates).toEqual([]);
        expect(monitor.metrics.forceCalculationTimes).toEqual([]);
        expect(monitor.metrics.nodeCount).toBe(0);
    });

    test('records force calculation times correctly', () => {
        monitor.recordForceCalculation(10);
        monitor.recordForceCalculation(15);
        
        expect(monitor.getAverageForceCalculationTime()).toBe(12.5);
    });

    test('updates node count and returns correct status', () => {
        expect(monitor.updateNodeCount(300)).toBe('normal');
        expect(monitor.updateNodeCount(450)).toBe('warning');
        expect(monitor.updateNodeCount(550)).toBe('critical');
    });

    test('maintains correct metrics array sizes', () => {
        // Fill force calculation times
        for (let i = 0; i < 150; i++) {
            monitor.recordForceCalculation(i);
        }
        
        // Should keep only last 100 samples
        expect(monitor.metrics.forceCalculationTimes.length).toBe(100);
        expect(monitor.metrics.forceCalculationTimes[0]).toBe(50); // First sample
        expect(monitor.metrics.forceCalculationTimes[99]).toBe(149); // Last sample
    });

    test('calculates performance status correctly', () => {
        // Normal conditions
        expect(monitor.getPerformanceStatus(60, 10, 300)).toBe('normal');
        
        // Warning conditions
        expect(monitor.getPerformanceStatus(45, 10, 450)).toBe('warning');
        
        // Critical conditions
        expect(monitor.getPerformanceStatus(25, 20, 550)).toBe('critical');
    });
});
