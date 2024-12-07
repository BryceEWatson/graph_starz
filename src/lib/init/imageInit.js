'use server';

import { promises as fs } from 'fs';
import path from 'path';
import debug from 'debug';
import { processImage } from '../image/imageProcessor.js';
import { analyzeImage } from '../image/imageAnalyzer.js';
import { saveImageData, findSimilarImage } from '../neo4j/imageRepository.js';
import sharpPhash from 'sharp-phash';
import { formatHash } from '../utils/imageHash.js';

const log = debug('app:init:images');
const TEST_USER_ID = 'test-user';

// Use path.join for cross-platform compatibility
const TEST_IMAGES_DIR = path.join(process.cwd(), 'test_images');

export async function initializeImages() {
  log('Starting image initialization check...');
  
  // Only run in development or during first production startup
  if (process.env.SKIP_IMAGE_INIT === 'true') {
    log('SKIP_IMAGE_INIT is true, skipping image initialization');
    return;
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

        // Process image into different sizes
        log('Converting image to WebP and resizing...');
        const processedImage = await processImage(imagePath);
        log('Image processed successfully');

        // Verify that all image sizes were uploaded to GCS
        const allSizesUploaded = processedImage.images.every(img => 
          img.metadata.isNewUpload || img.publicUrl.includes(img.size)
        );

        if (!allSizesUploaded) {
          throw new Error('Not all image sizes were successfully uploaded to GCS');
        }

        // Analyze the full-size image with Anthropic
        log('Analyzing image with Anthropic API...');
        const fullSizeImage = processedImage.images.find(img => img.size === 'full');
        if (!fullSizeImage) {
          throw new Error('Failed to find full-size processed image');
        }
        log('Full size image data type: %s, isBase64: %s', 
          typeof fullSizeImage.data,
          fullSizeImage.isBase64 ? 'true' : 'false'
        );

        // Debug the image data format
        log('Full size image data: %s', fullSizeImage.data ? fullSizeImage.data.substring(0, 100) + '...' : 'undefined');
        
        // Process image and get perceptual hash
        if (!fullSizeImage.data) {
          throw new Error('Full size image data is undefined');
        }

        // The data is already base64, but we need to add the data URL prefix
        const imageData = Buffer.from(fullSizeImage.data, 'base64');
        const pHash = await sharpPhash(imageData);
        const formattedHash = formatHash(pHash);

        // Check if similar image exists in Neo4j first
        const existingId = await findSimilarImage(formattedHash);
        if (existingId) {
          log('Skipped duplicate image %s with ID: %s', file, existingId);
          skipCount++;
          continue;
        }

        // Verify that all image sizes were uploaded to GCS and none were duplicates
        const uploadResults = processedImage.images.map(img => ({
          size: img.size,
          isNewUpload: img.metadata.isNewUpload,
          publicUrl: img.publicUrl
        }));

        const hasDuplicates = uploadResults.some(result => !result.isNewUpload);
        if (hasDuplicates) {
          log('Skipping image %s as duplicates found in GCS', file);
          skipCount++;
          continue;
        }

        // Only analyze and save to Neo4j if the image is new in both systems
        const analysis = await analyzeImage(fullSizeImage.data, 'image/webp');
        log('Image analysis completed: %O', {
          title: analysis.title,
          style: analysis.style,
          objectCount: analysis.objects.length,
          colorCount: analysis.dominantColors.length,
          technique: analysis.technique
        });

        // Save to Neo4j with test user
        log('Saving image data to Neo4j...');
        const result = await saveImageData(processedImage, analysis, TEST_USER_ID);

        if (result.isNew) {
          log('Successfully processed and saved %s with ID: %s', file, result.id);
          successCount++;
        } else {
          log('Skipped duplicate image %s with ID: %s', file, result.id);
          skipCount++;
        }
      } catch (error) {
        log('Error processing %s: %O', file, error);
        errorCount++;
        // Don't throw here, continue processing other images
      }
    }

    log('\nImage initialization summary:');
    log('- Successfully processed: %d', successCount);
    log('- Skipped duplicates: %d', skipCount);
    log('- Errors encountered: %d', errorCount);

    // If no images were processed successfully, consider this a failure
    if (successCount === 0 && errorCount > 0) {
      throw new Error(`Failed to process any images. Errors: ${errorCount}`);
    }

    return {
      successCount,
      skipCount,
      errorCount
    };
  } catch (error) {
    log('Fatal error during image initialization: %O', error);
    throw error;
  }
}
