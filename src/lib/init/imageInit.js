'use server';

import { promises as fs } from 'fs';
import path from 'path';
import debug from 'debug';
import { _saveImageData, clearTestImages } from '../neo4j/imageRepository';
import { POST } from '../../app/api/images/upload/route';
import { initializeStorage } from '../storage/gcs';

const log = debug('app:init:images');

// Use path.join for cross-platform compatibility
const TEST_IMAGES_DIR = path.join(process.cwd(), 'test_images');

// Fixed IDs for test images
const TEST_IMAGE_IDS = ['test-image-1', 'test-image-2'];

// Clear test data from previous runs
async function clearTestData() {
  log('Clearing existing test images...');

  try {
    // 1. Clear test images from Neo4j
    const testImageIds = TEST_IMAGE_IDS;
    await clearTestImages(testImageIds);
    log('Test images cleared from Neo4j successfully');

    // 2. Clear test files from GCS
    const { bucket } = await initializeStorage();
    const [files] = await bucket.getFiles();
    
    // Filter for test files (both full size and thumbnails)
    const testFiles = files.filter(file => {
      const filename = file.name;
      return testImageIds.some(id => filename.includes(id));
    });

    // Delete test files from storage
    if (testFiles.length > 0) {
      await Promise.all(testFiles.map(file => file.delete()));
      log(`Cleared ${testFiles.length} test files from GCS`);
    }

    log('Test data cleared successfully');
  } catch (error) {
    log('Error clearing test data:', error);
    throw error;
  }
}

/**
 * Initialize test images by uploading them through the standard upload flow
 * @param {string} testUserId - ID of the test user to use for uploads
 */
export async function initializeImages(testUserId) {
  try {
    log('Starting image initialization check...');
    
    // Clear existing test data first
    await clearTestData();

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
    let currentTestImageIndex = 0;

    for (const file of files) {
      try {
        // Skip if we've used all test image IDs
        if (currentTestImageIndex >= TEST_IMAGE_IDS.length) {
          log('Skipping additional image %s - no more test IDs available', file);
          skipCount++;
          continue;
        }

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

        // Create FormData for upload
        const contentType = path.extname(file).toLowerCase() === '.png' ? 'image/png' :
          path.extname(file).toLowerCase() === '.jpg' || path.extname(file).toLowerCase() === '.jpeg' ? 'image/jpeg' :
            'image/webp';
            
        const fileBlob = new Blob([imageBuffer], { type: contentType });
        const uploadFile = new File([fileBlob], file, { type: contentType });

        // Create FormData
        const formData = new FormData();
        formData.append('file', uploadFile);
        formData.append('id', TEST_IMAGE_IDS[currentTestImageIndex]);

        // Create mock request with test user header
        const mockRequest = new Request('http://localhost:3000/api/images/upload', {
          method: 'POST',
          body: formData,
          headers: {
            'X-Test-User': testUserId
          }
        });

        // Call the upload route directly
        const response = await POST(mockRequest);
        if (!response.ok) {
          const error = await response.json();
          console.error('[IMAGE-INIT] Upload failed:', error);
          throw new Error(`Upload failed: ${error.message || 'Unknown error'}`);
        }

        const result = await response.json();
        console.log('[IMAGE-INIT] Upload successful:', result);

        // Move to next image
        log('Successfully processed: %s', file);
        console.log('[IMAGE-INIT] Successfully processed:', file);
        successCount++;
        currentTestImageIndex++;
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
    log('Error initializing images: %O', error);
    console.error('[IMAGE-INIT] Error initializing images:', error);
    return {
      success: false,
      processed: 0,
      skipped: 0,
      errors: 1,
      error: error.message || JSON.stringify(error) || 'Unknown error occurred'
    };
  }
}
