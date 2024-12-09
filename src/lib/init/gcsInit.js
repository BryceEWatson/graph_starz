'use server';

import { Storage } from '@google-cloud/storage';
import debug from 'debug';
import path from 'path';
import fs from 'fs/promises';
import { uploadToGCS } from '../storage/gcs.js';

const log = debug('app:init:gcs');

export const initialize = async () => {
  log('Starting Firebase Storage initialization check...');

  try {
    // Validate environment variables
    const requiredVars = ['GOOGLE_CLOUD_PROJECT', 'GOOGLE_APPLICATION_CREDENTIALS', 'GCS_BUCKET_NAME'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }

    // Initialize Storage client
    const storage = new Storage();
    const bucketName = process.env.GCS_BUCKET_NAME;
    const bucket = storage.bucket(bucketName);

    // Test bucket access
    log('Testing bucket access...');
    const [exists] = await bucket.exists();
    if (!exists) {
      throw new Error(`Bucket ${bucketName} does not exist`);
    }

    // Test bucket permissions by listing files
    log('Testing bucket permissions...');
    const [files] = await bucket.getFiles({ maxResults: 1 });
    log('Successfully listed files in bucket');

    // Test URL generation
    if (files.length > 0) {
      const testFile = files[0];
      const encodedFilePath = encodeURIComponent(testFile.name);
      const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedFilePath}?alt=media`;
      log('Successfully generated Firebase Storage URL:', url);
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
        
        // Upload test image twice to verify duplicate detection
        log('Testing duplicate detection with test image...');
        const firstUpload = await uploadToGCS(imageBuffer, 'test-duplicate-1.webp');
        const secondUpload = await uploadToGCS(imageBuffer, 'test-duplicate-2.webp');
        
        const duplicateDetectionWorking = !secondUpload.isNew && firstUpload.url === secondUpload.url;
        if (!duplicateDetectionWorking) {
          log('Warning: Duplicate detection test failed');
          return {
            success: true,
            message: 'Firebase Storage connection verified',
            warnings: ['Duplicate detection not working as expected']
          };
        }
      }
    } catch (error) {
      log('Warning: Could not test duplicate detection:', error.message);
      return {
        success: true,
        message: 'Firebase Storage connection verified',
        warnings: ['Could not test duplicate detection']
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
      error: error.message,
      warnings: []
    };
  }
}
