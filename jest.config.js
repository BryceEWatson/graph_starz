module.exports = {
    testEnvironment: 'jest-fixed-jsdom',
    setupFilesAfterEnv: [
        '<rootDir>/jest.setup.js',
        '@testing-library/jest-dom'
    ],
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '^(\.{1,2}/)+config/storage-credentials\\.json$': '<rootDir>/src/lib/config/__mocks__/storage-credentials.json'
    },
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest']
    },
    transformIgnorePatterns: [
        'node_modules/(?!(d3|d3-array|d3-scale|d3-shape|d3-selection|d3-zoom)/)'
    ],
    testMatch: [
        "**/__tests__/**/*.test.js"
    ],
    verbose: true,
    testEnvironmentOptions: {
        customExportConditions: ['node', 'node-addons']
    }
}
