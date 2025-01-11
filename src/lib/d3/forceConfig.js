/**
 * @typedef {Object} ForceConfig
 * @property {Object} link - Link force configuration
 * @property {Object} link.distance - Distance parameters for different node types
 * @property {number} link.distance.image - Base distance for image nodes (pixels)
 * @property {number} link.distance.user - Base distance for user nodes (pixels)
 * @property {number} link.distance.attribute - Base distance for attribute nodes (pixels)
 * @property {Object} link.distance.variations - Random variations for distances
 * @property {number} link.distance.variations.min - Minimum variation multiplier
 * @property {number} link.distance.variations.max - Maximum variation multiplier
 */

/**
 * Validates force configuration object
 * @param {ForceConfig} config - Force configuration to validate
 * @throws {Error} If configuration is invalid
 */
export function validateForceConfig(config) {
    // Validate link configuration
    if (!config.link?.distance) {
        throw new Error('Missing link distance configuration');
    }

    const { image, user, attribute } = config.link.distance;
    if (!image || !user || !attribute) {
        throw new Error('Missing distance configuration for node type');
    }

    if (typeof image !== 'number' || typeof user !== 'number' || typeof attribute !== 'number') {
        throw new Error('Distance values must be numbers');
    }

    // Validate variations
    const { variations } = config.link.distance;
    if (!variations?.min || !variations?.max) {
        throw new Error('Missing distance variations');
    }

    if (variations.min >= variations.max) {
        throw new Error('Invalid variation range: min must be less than max');
    }

    // Validate charge configuration
    if (!config.charge) {
        throw new Error('Missing charge configuration');
    }

    Object.entries(config.charge).forEach(([key, value]) => {
        if (key !== 'distanceMax' && key !== 'distanceMin' && typeof value !== 'number') {
            throw new Error(`Invalid charge value for ${key}`);
        }
    });

    if (config.charge.distanceMin >= config.charge.distanceMax) {
        throw new Error('Invalid charge distance range: min must be less than max');
    }

    // Validate collision configuration
    if (!config.collide?.radius) {
        throw new Error('Missing collision radius configuration');
    }

    Object.entries(config.collide.radius).forEach(([key, value]) => {
        if (typeof value !== 'number' || value <= 0) {
            throw new Error(`Invalid collision radius for ${key}`);
        }
    });

    if (!config.collide.iterations || config.collide.iterations < 1) {
        throw new Error('Invalid collision iterations: must be positive integer');
    }
}

/**
 * Configuration for D3 force simulation parameters
 * @type {ForceConfig}
 */
const forceConfig = {
    // Link force configuration
    link: {
        distance: {
            image: 200,
            user: 150,
            attribute: 100,
            variations: {
                min: 0.8,
                max: 1.2
            }
        }
    },

    // Node charge force configuration
    charge: {
        image: -800,
        user: -400,
        attribute: -200,
        distanceMax: 800,
        distanceMin: 100
    },

    // Collision force configuration
    collide: {
        radius: {
            image: 120,
            user: 50,
            attribute: 30
        },
        strength: 0.8,
        iterations: 3
    },

    // General strength configuration
    strength: {
        sameType: 0.7,
        userImage: 0.3,
        default: 0.2,
        variations: {
            min: 0.8,
            max: 1.2
        }
    },

    // Simulation parameters
    simulation: {
        alpha: 1,
        alphaDecay: 0.02,
        alphaTarget: 0
    }
};

// Validate configuration on import
validateForceConfig(forceConfig);

export default forceConfig;
