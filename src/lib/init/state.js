'use server';

import debug from 'debug';
import { getDriver } from '../neo4j/client.js';

const log = debug('app:init:state');

// Track if we've initialized during this server instance
let hasInitialized = false;

export async function setInitialized(value) {
  hasInitialized = value;
  return true;
}

export async function shouldInitialize() {
  // If we've already initialized in this server instance, don't do it again
  if (hasInitialized) {
    return false;
  }

  // Check if we have any images in the database
  const driver = await getDriver();
  const session = driver.session();
  
  try {
    const result = await session.run('MATCH (i:Image) RETURN count(i) as count');
    const imageCount = result.records[0].get('count').toNumber();
    
    // Only initialize if we have no images
    const shouldInit = imageCount === 0;
    if (!shouldInit) {
      hasInitialized = true;
    }
    return shouldInit;
  } finally {
    await session.close();
  }
}
