/**
 * Performance monitoring utility for D3 graph visualization
 */
export class PerformanceMonitor {
    constructor() {
        this.metrics = {
            frameRates: [],
            forceCalculationTimes: [],
            nodeCount: 0,
            lastFrameTime: performance.now(),
            frameCount: 0
        };

        // Performance thresholds
        this.thresholds = {
            minFrameRate: 30,
            maxForceCalcTime: 16, // ms
            nodeCountWarning: 400,
            nodeCountCritical: 500
        };
    }

    /**
     * Start monitoring frame rate
     */
    startFrameMonitoring() {
        this.frameLoop();
    }

    /**
     * Monitor frame rate
     */
    frameLoop() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.metrics.lastFrameTime;
        
        // Calculate frame rate
        if (deltaTime >= 1000) { // Every second
            const fps = (this.metrics.frameCount * 1000) / deltaTime;
            this.metrics.frameRates.push(fps);
            
            // Keep only last 60 samples
            if (this.metrics.frameRates.length > 60) {
                this.metrics.frameRates.shift();
            }

            // Reset counters
            this.metrics.frameCount = 0;
            this.metrics.lastFrameTime = currentTime;

            // Check performance
            this.checkPerformance();
        }

        this.metrics.frameCount++;
        requestAnimationFrame(() => this.frameLoop());
    }

    /**
     * Record time taken for force calculation
     * @param {number} time - Time in milliseconds
     */
    recordForceCalculation(time) {
        this.metrics.forceCalculationTimes.push(time);
        
        // Keep only last 100 samples
        if (this.metrics.forceCalculationTimes.length > 100) {
            this.metrics.forceCalculationTimes.shift();
        }
    }

    /**
     * Update node count and check against thresholds
     * @param {number} count - Number of nodes
     * @param {Object} options - Options for update
     * @param {boolean} options.silent - Suppress warnings
     */
    updateNodeCount(count, options = { silent: false }) {
        this.metrics.nodeCount = count;
        
        if (!options.silent) {
            if (count >= this.thresholds.nodeCountCritical) {
                console.warn('Critical node count reached. Consider optimization strategies.');
                return 'critical';
            } else if (count >= this.thresholds.nodeCountWarning) {
                console.warn('Node count approaching critical threshold.');
                return 'warning';
            }
        }
        return 'normal';
    }

    /**
     * Check current performance metrics
     */
    checkPerformance() {
        const avgFrameRate = this.getAverageFrameRate();
        const avgForceCalcTime = this.getAverageForceCalculationTime();

        if (avgFrameRate < this.thresholds.minFrameRate) {
            console.warn('Frame rate below threshold:', avgFrameRate.toFixed(2), 'fps');
        }

        if (avgForceCalcTime > this.thresholds.maxForceCalcTime) {
            console.warn('Force calculation time above threshold:', 
                avgForceCalcTime.toFixed(2), 'ms');
        }

        return {
            frameRate: avgFrameRate,
            forceCalcTime: avgForceCalcTime,
            nodeCount: this.metrics.nodeCount,
            status: this.getPerformanceStatus(avgFrameRate, avgForceCalcTime, this.metrics.nodeCount)
        };
    }

    /**
     * Get average frame rate from recent samples
     */
    getAverageFrameRate() {
        if (this.metrics.frameRates.length === 0) return 60;
        return this.metrics.frameRates.reduce((a, b) => a + b) / 
            this.metrics.frameRates.length;
    }

    /**
     * Get average force calculation time
     */
    getAverageForceCalculationTime() {
        if (this.metrics.forceCalculationTimes.length === 0) return 0;
        return this.metrics.forceCalculationTimes.reduce((a, b) => a + b) / 
            this.metrics.forceCalculationTimes.length;
    }

    /**
     * Get overall performance status
     */
    getPerformanceStatus(fps, forceTime, nodeCount) {
        // Check each metric and return the most severe status
        const fpsStatus = this.checkFPS(fps);
        const forceStatus = this.checkForceTime(forceTime);
        const nodeStatus = this.checkNodeCount(nodeCount);

        // Return the most severe status (critical > warning > normal)
        if (fpsStatus === 'critical' || forceStatus === 'critical' || nodeStatus === 'critical') {
            return 'critical';
        } else if (fpsStatus === 'warning' || forceStatus === 'warning' || nodeStatus === 'warning') {
            return 'warning';
        }
        return 'normal';
    }

    checkFPS(fps) {
        if (fps < this.thresholds.minFrameRate) {
            return 'critical';
        } else if (fps < this.thresholds.minFrameRate * 1.5) {
            return 'warning';
        }
        return 'normal';
    }

    checkForceTime(forceTime) {
        if (forceTime > this.thresholds.maxForceCalcTime) {
            return 'critical';
        } else if (forceTime > this.thresholds.maxForceCalcTime * 0.8) {
            return 'warning';
        }
        return 'normal';
    }

    checkNodeCount(nodeCount) {
        if (nodeCount >= this.thresholds.nodeCountCritical) {
            return 'critical';
        } else if (nodeCount >= this.thresholds.nodeCountWarning) {
            return 'warning';
        }
        return 'normal';
    }
}
