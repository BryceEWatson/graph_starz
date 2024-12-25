'use server';

import { Storage } from '@google-cloud/storage';
import debug from 'debug';
import path from 'path';
import fs from 'fs/promises';
import { getGCSCredentials } from '../config/gcs.js';
import { uploadToGCS } from '../storage/gcs.js';

const log = debug('app:init:gcs');

/**
 * Initializes and verifies Firebase Storage connection
 * @returns {Promise<{success: boolean, message: string, warnings: string[]}>}
 */
export const initialize = async () => {
  log('Starting Firebase Storage initialization check...');
  
  try {
    // Validate environment variables
    const requiredVars = ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_APPLICATION_CREDENTIALS', 'GCS_BUCKET_NAME'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Test bucket access
    log('Testing bucket access...');
    let config;
    try {
      config = await getGCSCredentials();
      log('Successfully loaded GCS credentials');
    } catch (credError) {
      log('Failed to load GCS credentials:', credError);
      throw new Error(`GCS credentials error: ${credError.message}`);
    }

    const storage = new Storage(config);
    log('Created Storage instance');

    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('GCS_BUCKET_NAME environment variable is required');
    }

    const bucket = storage.bucket(bucketName);
    log(`Accessing bucket: ${bucketName}`);
    
    // Test bucket permissions
    log('Testing bucket permissions...');
    try {
      const [files] = await bucket.getFiles({ maxResults: 1 });
      log('Successfully listed files in bucket');

      // Test URL generation
      if (files.length > 0) {
        const testFile = files[0];
        const encodedFilePath = encodeURIComponent(testFile.name);
        const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedFilePath}?alt=media`;
        log('Successfully generated Firebase Storage URL:', url);
      }
    } catch (bucketError) {
      log('Failed to access bucket:', bucketError);
      throw new Error(`Failed to access GCS bucket: ${bucketError.message}`);
    }

    // Test duplicate detection
    log('Testing duplicate detection...');
    const testImagesDir = path.join(process.cwd(), 'test_images');
    try {
      const testFiles = await fs.readdir(testImagesDir);
      
      if (testFiles.length > 0) {
        // Get the first test image
        const testImagePath = path.join(testImagesDir, testFiles[0]);
        const imageBuffer = await fs.readFile(testImagePath);
        
        // Try to upload the same image twice
        log('Testing duplicate detection with test image...');
        try {
          const firstUpload = await uploadToGCS(imageBuffer, 'test-duplicate-1.webp');
          const secondUpload = await uploadToGCS(imageBuffer, 'test-duplicate-2.webp');
          
          const duplicateDetectionWorking = !secondUpload.isNew && firstUpload.url === secondUpload.url;
          if (!duplicateDetectionWorking) {
            log('Warning: Duplicate detection test failed - URLs did not match or second upload was marked as new');
            return {
              success: true,
              message: 'Firebase Storage connection verified',
              warnings: ['Duplicate detection not working as expected']
            };
          }
          
          log('Duplicate detection test passed');
        } catch (uploadError) {
          if (uploadError.message.includes('already exists')) {
            // This is expected if the test files already exist
            log('Test files already exist, skipping duplicate detection test');
            return {
              success: true,
              message: 'Firebase Storage connection verified',
              warnings: [] // This is expected when files exist
            };
          }
          throw uploadError;
        }
      }
    } catch (error) {
      log('Warning: Could not test duplicate detection:', error.message);
      return {
        success: true,
        message: 'Firebase Storage connection verified',
        warnings: ['Could not test duplicate detection: ' + error.message]
      };
    }

    log('Firebase Storage initialization successful');
    return {
      success: true,
      message: 'Firebase Storage connection verified',
      warnings: []
    };
  } catch (error) {
    log('Firebase Storage initialization failed:', error);
    return {
      success: false,
      message: error.message,
      warnings: []
    };
  }
};
