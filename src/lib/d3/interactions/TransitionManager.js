import * as d3 from 'd3';

/**
 * @typedef {Object} TransitionConfig
 * @property {number} duration - Transition duration in milliseconds
 * @property {function} ease - D3 easing function
 */

/**
 * Manages D3 transitions for graph elements
 */
export class TransitionManager {
    /**
     * Creates a new TransitionManager
     * @param {TransitionConfig} config - Transition configuration
     */
    constructor(config) {
        this.config = this.validateConfig(config);
    }

    /**
     * Validates transition configuration
     * @param {TransitionConfig} config - Configuration to validate
     * @returns {TransitionConfig} Validated configuration
     * @throws {Error} If configuration is invalid
     * @private
     */
    validateConfig(config) {
        if (!config) {
            throw new Error('Transition configuration is required');
        }

        const { duration, ease } = config;
        if (typeof duration !== 'number' || duration <= 0) {
            throw new Error('Invalid duration: must be a positive number');
        }
        if (typeof ease !== 'function') {
            throw new Error('Invalid ease: must be a function');
        }

        return { duration, ease };
    }

    /**
     * Creates a new transition with configured parameters
     * @param {d3.Selection} selection - D3 selection to transition
     * @returns {d3.Transition} Configured transition
     */
    createTransition(selection) {
        if (!selection || typeof selection.transition !== 'function') {
            throw new Error('Invalid selection: must be a valid D3 selection');
        }

        return selection
            .transition()
            .duration(this.config.duration)
            .ease(this.config.ease);
    }

    /**
     * Updates element opacity with transition
     * @param {d3.Selection} selection - Element to update
     * @param {number} opacity - Target opacity
     * @returns {d3.Transition} The transition
     */
    updateOpacity(selection, opacity) {
        if (typeof opacity !== 'number' || opacity < 0 || opacity > 1) {
            throw new Error('Invalid opacity: must be between 0 and 1');
        }

        return this.createTransition(selection)
            .style('opacity', opacity);
    }

    /**
     * Updates element scale with transition
     * @param {d3.Selection} selection - Element to update
     * @param {number} scale - Target scale
     * @returns {d3.Transition} The transition
     */
    updateScale(selection, scale) {
        if (typeof scale !== 'number' || scale <= 0) {
            throw new Error('Invalid scale: must be a positive number');
        }

        return this.createTransition(selection)
            .attr('transform', `scale(${scale})`);
    }

    /**
     * Updates stroke width with transition
     * @param {d3.Selection} selection - Element to update
     * @param {number} width - Target stroke width
     * @returns {d3.Transition} The transition
     */
    updateStrokeWidth(selection, width) {
        if (typeof width !== 'number' || width < 0) {
            throw new Error('Invalid stroke width: must be non-negative');
        }

        return this.createTransition(selection)
            .attr('stroke-width', width);
    }
}
