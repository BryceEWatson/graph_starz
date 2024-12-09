'use server';

import { promises as fs } from 'fs';
import path from 'path';
import debug from 'debug';

const log = debug('app:init:images');

// Use path.join for cross-platform compatibility
const TEST_IMAGES_DIR = path.join(process.cwd(), 'test_images');

/**
 * Initialize test images by uploading them through the standard upload flow
 * @param {string} testUserId - ID of the test user to use for uploads
 */
export async function initializeImages(testUserId) {
  log('Starting image initialization check...');
  
  // Only run in development or during first production startup
  if (process.env.SKIP_IMAGE_INIT === 'true') {
    log('SKIP_IMAGE_INIT is true, skipping image initialization');
    return { success: true, processed: 0, skipped: 0, errors: 0 };
  }

  if (!testUserId) {
    throw new Error('testUserId is required for image initialization');
  }

  try {
    // Validate environment variables - fail fast if missing
    if (!process.env.ANTHROPIC_API_KEY) {
      const error = new Error('ANTHROPIC_API_KEY environment variable is required for image analysis');
      log('Initialization failed: %O', error);
      throw error;
    }

    log('Looking for test images in: %s', TEST_IMAGES_DIR);
    
    // Check if test_images directory exists and is readable
    try {
      const stats = await fs.stat(TEST_IMAGES_DIR);
      if (!stats.isDirectory()) {
        throw new Error('Path exists but is not a directory');
      }
      log('test_images directory found and is a directory');
    } catch (error) {
      log('test_images directory access error at %s: %O', TEST_IMAGES_DIR, error);
      throw new Error(`Cannot access test_images directory at ${TEST_IMAGES_DIR}. Please ensure the directory exists and is readable.`);
    }

    // Get list of images in test directory
    const files = await fs.readdir(TEST_IMAGES_DIR);
    log('Found %d images to process', files.length);

    if (files.length === 0) {
      log('No images found in test_images directory');
      throw new Error('No images found in test_images directory');
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        const imagePath = path.join(TEST_IMAGES_DIR, file);
        log('Processing image: %s', file);

        // Skip non-image files
        if (!/\.(jpg|jpeg|png|webp)$/i.test(file)) {
          log('Skipping non-image file: %s', file);
          continue;
        }

        // Read the image file and create a File object
        const imageBuffer = await fs.readFile(imagePath);
        
        // Determine content type from file extension
        const ext = path.extname(file).toLowerCase();
        const contentType = ext === '.png' ? 'image/png' :
                          ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                          ext === '.webp' ? 'image/webp' :
                          'image/png'; // default to png
        
        // Create FormData and append the buffer with correct type
        const formData = new FormData();
        formData.append('file', new Blob([imageBuffer], { type: contentType }), 
                       file.replace(/[^a-zA-Z0-9-_\.]|\.(?!(jpg|jpeg|png|webp)$)/gi, '_'));

        // Get base URL from environment or default to localhost in development
        const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
        
        // Call the upload endpoint with absolute URL
        const response = await fetch(`${baseUrl}/api/images/upload`, {
          method: 'POST',
          body: formData,
          headers: {
            'X-Test-User': testUserId
          }
        });

        const result = await response.json();

        if (response.status === 409) {
          log('Skipped duplicate image: %s (ID: %s)', file, result.existingImageId);
          skipCount++;
        } else if (!response.ok) {
          throw new Error(
            `Upload failed (${response.status}): ${result.message || result.error || 'Unknown error'}`
          );
        } else {
          log('Successfully processed image: %s (ID: %s)', file, result.id);
          successCount++;
        }
      } catch (error) {
        log('Error processing %s: %O', file, error);
        errorCount++;
      }
    }

    // Log summary
    log('\nImage initialization summary:');
    log('- Successfully processed: %d', successCount);
    log('- Skipped duplicates: %d', skipCount);
    log('- Errors encountered: %d', errorCount);

    // Return success if we either processed or skipped images
    return {
      success: successCount > 0 || skipCount > 0,
      processed: successCount,
      skipped: skipCount,
      errors: errorCount
    };

  } catch (error) {
    log('Fatal error during image initialization: %O', error);
    throw error;
  }
}
