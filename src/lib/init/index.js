'use server';

import debug from 'debug';
import { initializeImages } from './imageInit.js';
import { initializeGCS } from './gcsInit.js';
import { getDriver } from '../neo4j/client.js';

console.log('Loading initialization module...');
const log = debug('app:init');
log('Debug logger initialized');

let initialized = false;

export async function initializeApplication() {
  console.log('initializeApplication called');
  if (initialized) {
    log('Application already initialized, skipping');
    return { status: 'skipped', message: 'Already initialized' };
  }

  log('Starting application initialization...');

  try {
    // Initialize GCS first as it's required for image processing
    log('Initializing GCS...');
    await initializeGCS();
    
    // Initialize Neo4j next
    log('Initializing Neo4j...');
    await getDriver();  // This will initialize if not already initialized
    log('Neo4j initialized');

    // Run image initialization
    log('Initializing images...');
    const imageResults = await initializeImages();
    log('Image initialization completed: %O', imageResults);
    
    // Add any other initialization steps here
    
    log('Application initialization completed successfully');
    initialized = true;
    return { status: 'success', message: 'Initialization complete' };
  } catch (error) {
    log('Application initialization failed: %O', error);
    // Don't exit process, just throw the error
    throw error;
  }
}
