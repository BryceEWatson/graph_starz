'use server';

import { promises as fs } from 'fs';
import path from 'path';
import debug from 'debug';
import { analyzeImage } from '../image/imageAnalyzer';
import { saveImageData } from '../neo4j/imageRepository';
import { processImage } from '../image/imageProcessor';
import { findSimilarImage } from '../neo4j/imageRepository';

const log = debug('app:init:images');

// Use path.join for cross-platform compatibility
const TEST_IMAGES_DIR = path.join(process.cwd(), 'test_images');

/**
 * Initialize test images by uploading them through the standard upload flow
 * @param {string} testUserId - ID of the test user to use for uploads
 */
export async function initializeImages(testUserId) {
  log('Starting image initialization check...');
  
  if (!testUserId) {
    console.log('[IMAGE-INIT] No test user ID provided');
    const error = new Error('testUserId is required for image initialization');
    const errorDetails = {
      error: error.message,
      testUserId: testUserId,
      type: typeof testUserId
    };
    log('Initialization failed: %O', errorDetails);
    console.log('[IMAGE-INIT] Initialization failed:', errorDetails);
    return {
      success: false,
      processed: 0,
      skipped: 0,
      errors: 1,
      error: error.message || JSON.stringify(error) || 'Unknown error occurred'
    };
  }

  try {
    // Log initial state
    const initialState = {
      testUserId: testUserId,
      env: {
        NODE_ENV: process.env.NODE_ENV,
        NEXTAUTH_URL: process.env.NEXTAUTH_URL,
        FRONTEND_URL: process.env.FRONTEND_URL,
        hasAnthropicKey: !!process.env.ANTHROPIC_API_KEY,
        cwd: process.cwd(),
        testImagesDir: TEST_IMAGES_DIR
      }
    };
    log('Starting image initialization with state: %O', initialState);
    console.log('[IMAGE-INIT] Starting with state:', initialState);

    // Validate environment variables - fail fast if missing
    if (!process.env.ANTHROPIC_API_KEY) {
      const error = new Error('ANTHROPIC_API_KEY environment variable is required for image analysis');
      console.log('[IMAGE-INIT] Missing ANTHROPIC_API_KEY');
      log('Initialization failed: %O', error);
      return {
        success: false,
        processed: 0,
        skipped: 0,
        errors: 1,
        error: error.message || JSON.stringify(error) || 'Unknown error occurred'
      };
    }

    // Log environment state
    log('Environment state:');
    log('- NODE_ENV: %s', process.env.NODE_ENV);
    log('- NEXTAUTH_URL: %s', process.env.NEXTAUTH_URL);
    log('- FRONTEND_URL: %s', process.env.FRONTEND_URL);
    log('- Test User ID: %s', testUserId);
    log('- Working Directory: %s', process.cwd());
    log('- Test Images Directory: %s', TEST_IMAGES_DIR);

    // Check if test_images directory exists and is readable
    let directoryExists = false;
    try {
      const stats = await fs.stat(TEST_IMAGES_DIR);
      directoryExists = stats.isDirectory();
      const dirStats = {
        mode: stats.mode,
        uid: stats.uid,
        gid: stats.gid,
        size: stats.size,
        path: TEST_IMAGES_DIR
      };
      log('test_images directory found and is accessible: %O', dirStats);
      console.log('[IMAGE-INIT] Directory stats:', dirStats);

      // List directory contents
      const dirContents = await fs.readdir(TEST_IMAGES_DIR, { withFileTypes: true });
      const contents = dirContents.map(entry => ({
        name: entry.name,
        isDirectory: entry.isDirectory(),
        isFile: entry.isFile()
      }));
      log('Directory contents: %O', contents);
      console.log('[IMAGE-INIT] Directory contents:', contents);
    } catch (error) {
      const errorDetails = {
        error: error.message,
        code: error.code,
        syscall: error.syscall,
        path: error.path,
        stack: error.stack,
        cwd: process.cwd()
      };
      log('test_images directory access error: %O', errorDetails);
      console.log('[IMAGE-INIT] Directory access error:', errorDetails);
      return {
        success: true,
        processed: 0,
        skipped: 0,
        errors: 0,
        message: `Image initialization skipped: test_images directory not accessible (${error.code}: ${error.message})`
      };
    }

    if (!directoryExists) {
      const message = 'test_images path exists but is not a directory';
      log(message);
      console.log('[IMAGE-INIT] Directory exists but is not a directory:', message);
      return {
        success: true,
        processed: 0,
        skipped: 0,
        errors: 0,
        message
      };
    }

    log('Looking for test images in: %s', TEST_IMAGES_DIR);
    
    // Get list of images in test directory
    const files = await fs.readdir(TEST_IMAGES_DIR);
    log('Found %d files in test_images directory', files.length);

    if (files.length === 0) {
      log('No images found in test_images directory');
      console.log('[IMAGE-INIT] No images found in test_images directory');
      throw new Error('No images found in test_images directory');
    }

    let successCount = 0;
    let skipCount = 0;
    let errorCount = 0;

    for (const file of files) {
      try {
        const imagePath = path.join(TEST_IMAGES_DIR, file);
        log('Processing image: %s', file);
        console.log('[IMAGE-INIT] Starting processing for:', file);

        // Skip non-image files
        if (!/\.(jpg|jpeg|png|webp)$/i.test(file)) {
          log('Skipping non-image file: %s', file);
          console.log('[IMAGE-INIT] Skipping non-image file:', file);
          skipCount++;
          continue;
        }

        // Read the image file
        console.log('[IMAGE-INIT] Reading image file:', imagePath);
        let imageBuffer;
        try {
          imageBuffer = await fs.readFile(imagePath);
          console.log('[IMAGE-INIT] Successfully read image file:', file, 'size:', imageBuffer.length);
        } catch (readError) {
          console.error('[IMAGE-INIT] Failed to read image file:', file, 'Error:', readError);
          throw readError;
        }
        
        // Process the image directly
        log('Processing image directly: %s', file);
        console.log('[IMAGE-INIT] Starting image processing for:', file);
        
        // Get content type
        const contentType = path.extname(file).toLowerCase() === '.png' ? 'image/png' :
                          path.extname(file).toLowerCase() === '.webp' ? 'image/webp' :
                          'image/jpeg';
        
        // Process and analyze the image
        console.log('[IMAGE-INIT] Processing image:', file, 'with content type:', contentType);
        let processedData;
        try {
          processedData = await processImage(imageBuffer, {
            filename: file.replace(/[^a-zA-Z0-9-_\.]|\.(?!(jpg|jpeg|png|webp)$)/gi, '_'),
            contentType
          });
          console.log('[IMAGE-INIT] Image processed successfully:', {
            filename: processedData.filename,
            contentType: processedData.contentType,
            pHash: processedData.pHash,
            metadata: processedData.metadata
          });
        } catch (processError) {
          console.error('[IMAGE-INIT] Failed to process image:', file, 'Error:', processError);
          throw processError;
        }

        // Check for duplicates using the pHash from processedData
        console.log('[IMAGE-INIT] Checking for duplicates with pHash:', processedData.pHash);
        let existingImage;
        try {
          existingImage = await findSimilarImage(processedData.pHash);
          console.log('[IMAGE-INIT] Duplicate check result:', existingImage ? 'Found duplicate' : 'No duplicate found');
        } catch (dupError) {
          console.error('[IMAGE-INIT] Failed to check for duplicates:', file, 'Error:', dupError);
          throw dupError;
        }

        // Get MIME type based on file extension
        const mimeType = path.extname(file).toLowerCase() === '.png' ? 'image/png' :
                        path.extname(file).toLowerCase() === '.webp' ? 'image/webp' :
                        'image/jpeg';
        
        console.log('[IMAGE-INIT] Analyzing image with MIME type:', mimeType);
        let analysisData;
        try {
          analysisData = await analyzeImage(imageBuffer, mimeType);
          console.log('[IMAGE-INIT] Analysis complete:', analysisData);
        } catch (analysisError) {
          console.error('[IMAGE-INIT] Failed to analyze image:', file, 'Error:', analysisError);
          throw analysisError;
        }
        
        // Save to database with correct parameter order
        console.log('[IMAGE-INIT] Saving image data to database...', {
          processedData: {
            filename: processedData.filename,
            contentType: processedData.contentType,
            pHash: processedData.pHash
          },
          analysisData: {
            title: analysisData.title,
            description: analysisData.description
          },
          testUserId
        });
        
        let savedImage;
        try {
          savedImage = await saveImageData(processedData, analysisData, testUserId);
          console.log('[IMAGE-INIT] Image saved successfully. ID:', savedImage?.id);
        } catch (saveError) {
          console.error('[IMAGE-INIT] Failed to save image:', file, 'Error:', saveError);
          throw saveError;
        }

        if (!savedImage?.id) {
          const error = new Error('Failed to save image data - no ID returned');
          console.error('[IMAGE-INIT] Save failed:', error);
          throw error;
        }

        log('Successfully processed: %s', file);
        console.log('[IMAGE-INIT] Successfully processed:', file);
        successCount++;
      } catch (error) {
        log('Error processing %s: %O', file, error);
        console.log('[IMAGE-INIT] Error processing:', file, error);
        errorCount++;
      }
    }

    log('Image initialization complete: %d processed, %d skipped, %d errors',
        successCount, skipCount, errorCount);
    console.log('[IMAGE-INIT] Image initialization complete:', successCount, 'processed,', skipCount, 'skipped,', errorCount, 'errors');

    return {
      success: errorCount === 0,
      processed: successCount,
      skipped: skipCount,
      errors: errorCount
    };

  } catch (error) {
    log('Image initialization failed: %O', error);
    console.log('[IMAGE-INIT] Image initialization failed:', error);
    return {
      success: false,
      processed: 0,
      skipped: 0,
      errors: 1,
      error: error.message || JSON.stringify(error) || 'Unknown error occurred'
    };
  }
}
