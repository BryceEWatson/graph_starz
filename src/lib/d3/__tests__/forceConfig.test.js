import { validateForceConfig } from '../forceConfig';

describe('Force Configuration Validation', () => {
    const validConfig = {
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
        charge: {
            image: -800,
            user: -400,
            attribute: -200,
            distanceMax: 800,
            distanceMin: 100
        },
        collide: {
            radius: {
                image: 120,
                user: 50,
                attribute: 30
            },
            strength: 0.8,
            iterations: 3
        }
    };

    test('accepts valid configuration', () => {
        expect(() => validateForceConfig(validConfig)).not.toThrow();
    });

    describe('Link Distance Validation', () => {
        test('throws on missing link distance', () => {
            const config = {
                ...validConfig,
                link: {}
            };
            expect(() => validateForceConfig(config))
                .toThrow('Missing link distance configuration');
        });

        test('throws on missing node type distance', () => {
            const config = {
                ...validConfig,
                link: {
                    distance: {
                        image: 200,
                        user: 150,
                        // attribute missing
                        variations: { min: 0.8, max: 1.2 }
                    }
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Missing distance configuration for node type');
        });

        test('throws on invalid distance value type', () => {
            const config = {
                ...validConfig,
                link: {
                    distance: {
                        image: '200', // string instead of number
                        user: 150,
                        attribute: 100,
                        variations: { min: 0.8, max: 1.2 }
                    }
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Distance values must be numbers');
        });

        test('throws on invalid variations', () => {
            const config = {
                ...validConfig,
                link: {
                    distance: {
                        ...validConfig.link.distance,
                        variations: { min: 1.2, max: 0.8 } // min > max
                    }
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Invalid variation range: min must be less than max');
        });

        test('throws on null link configuration', () => {
            const config = {
                ...validConfig,
                link: null
            };
            expect(() => validateForceConfig(config))
                .toThrow('Missing link distance configuration');
        });

        test('throws on undefined link configuration', () => {
            const config = {
                ...validConfig,
                link: undefined
            };
            expect(() => validateForceConfig(config))
                .toThrow('Missing link distance configuration');
        });

        test('throws on null distance values', () => {
            const config = {
                ...validConfig,
                link: {
                    distance: {
                        image: null,
                        user: 150,
                        attribute: 100,
                        variations: { min: 0.8, max: 1.2 }
                    }
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Distance values must be numbers');
        });

        test('throws on undefined distance values', () => {
            const config = {
                ...validConfig,
                link: {
                    distance: {
                        image: undefined,
                        user: 150,
                        attribute: 100,
                        variations: { min: 0.8, max: 1.2 }
                    }
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Distance values must be numbers');
        });

        test('throws on null variations', () => {
            const config = {
                ...validConfig,
                link: {
                    distance: {
                        ...validConfig.link.distance,
                        variations: null
                    }
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Missing distance variations');
        });
    });

    describe('Charge Configuration Validation', () => {
        test('throws on missing charge configuration', () => {
            const { charge, ...config } = validConfig;
            expect(() => validateForceConfig(config))
                .toThrow('Missing charge configuration');
        });

        test('throws on invalid charge value', () => {
            const config = {
                ...validConfig,
                charge: {
                    ...validConfig.charge,
                    image: '800' // string instead of number
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Invalid charge value for image');
        });

        test('throws on invalid charge distance range', () => {
            const config = {
                ...validConfig,
                charge: {
                    ...validConfig.charge,
                    distanceMin: 900,
                    distanceMax: 800
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Invalid charge distance range: min must be less than max');
        });

        test('throws on null charge values', () => {
            const config = {
                ...validConfig,
                charge: {
                    ...validConfig.charge,
                    image: null
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Invalid charge value for image');
        });

        test('throws on undefined charge values', () => {
            const config = {
                ...validConfig,
                charge: {
                    ...validConfig.charge,
                    user: undefined
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Invalid charge value for user');
        });

        test('throws on null distance values', () => {
            const config = {
                ...validConfig,
                charge: {
                    ...validConfig.charge,
                    distanceMin: null,
                    distanceMax: 800
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Invalid charge distance range');
        });
    });

    describe('Collision Configuration Validation', () => {
        test('throws on missing collision radius', () => {
            const config = {
                ...validConfig,
                collide: {
                    strength: 0.8,
                    iterations: 3
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Missing collision radius configuration');
        });

        test('throws on invalid radius value', () => {
            const config = {
                ...validConfig,
                collide: {
                    ...validConfig.collide,
                    radius: {
                        image: -120, // negative value
                        user: 50,
                        attribute: 30
                    }
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Invalid collision radius for image');
        });

        test('throws on invalid iterations', () => {
            const config = {
                ...validConfig,
                collide: {
                    ...validConfig.collide,
                    iterations: 0 // must be positive
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Invalid collision iterations: must be positive integer');
        });

        test('throws on null collision configuration', () => {
            const config = {
                ...validConfig,
                collide: null
            };
            expect(() => validateForceConfig(config))
                .toThrow('Missing collision radius configuration');
        });

        test('throws on null radius values', () => {
            const config = {
                ...validConfig,
                collide: {
                    ...validConfig.collide,
                    radius: {
                        image: null,
                        user: 50,
                        attribute: 30
                    }
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Invalid collision radius for image');
        });

        test('throws on undefined strength', () => {
            const config = {
                ...validConfig,
                collide: {
                    ...validConfig.collide,
                    strength: undefined
                }
            };
            expect(() => validateForceConfig(config))
                .toThrow('Invalid collision strength: must be between 0 and 1');
        });
    });
});
