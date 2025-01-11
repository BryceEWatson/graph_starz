/**
 * Configuration for D3 force simulation parameters
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
}

export default forceConfig
