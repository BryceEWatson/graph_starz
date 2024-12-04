'use server';

import { initialize, validateConnection, healthCheck, close } from './client';
import { getDbStats, getAttributeDistribution } from './queries';

// Re-export all async functions
export {
    initialize,
    validateConnection,
    healthCheck,
    close,
    getDbStats,
    getAttributeDistribution
};
