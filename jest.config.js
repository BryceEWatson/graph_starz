const nextJest = require('next/jest');

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files in your test environment
    dir: './',
});

// Add any custom config to be passed to Jest
const customJestConfig = {
    setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
    testEnvironment: 'jest-environment-jsdom',
    reporters: [['<rootDir>/clean-reporter.js', {}]],
    moduleNameMapper: {
        // Handle module aliases (if you're using them in your Next.js project)
        '^@/(.*)$': '<rootDir>/src/$1',
    },
    transformIgnorePatterns: [
        // Transform ES modules including d3
        '/node_modules/(?!d3|d3-array|d3-selection|d3-zoom|d3-force|internmap|delaunator|robust-predicates)/',
    ],
    testPathIgnorePatterns: [
        '<rootDir>/.next/', 
        '<rootDir>/node_modules/',
    ],
    // Only run files with .test.js extension
    testMatch: [
        "**/__tests__/**/*.test.js",
        "**/?(*.)+(spec|test).js"
    ],
    // Collect coverage from source files, not test files
    collectCoverageFrom: [
        "src/**/*.{js,jsx}",
        "!src/**/*.test.js",
        "!src/**/__tests__/**",
        "!src/**/__mocks__/**"
    ]
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig);
