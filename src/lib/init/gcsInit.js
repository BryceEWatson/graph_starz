'use server';

import { Storage } from '@google-cloud/storage';
import debug from 'debug';
import path from 'path';
import fs from 'fs/promises';
import { uploadToGCS } from '../storage/gcs.js';
import sharpPhash from 'sharp-phash';
import { formatHash } from '../utils/imageHash.js';

const log = debug('app:init:gcs');

export async function initializeGCS() {
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
    const testFiles = await fs.readdir(testImagesDir);
    
    if (testFiles.length > 0) {
      // Get the first test image
      const testImagePath = path.join(testImagesDir, testFiles[0]);
      const imageBuffer = await fs.readFile(testImagePath);
      
      // Calculate hash directly to check its size
      const binaryHash = await sharpPhash(imageBuffer);
      const hash = formatHash(binaryHash);
      log('Perceptual hash:', hash);
      log('Hash length:', hash.length, 'characters');
      log('Hash format valid:', /^[0-9a-f]{16}$/i.test(hash), '(should be 16 hex chars)');
      
      // Upload the same image twice
      log('Uploading test image first time...');
      const firstUpload = await uploadToGCS(imageBuffer, 'test-duplicate-1.webp');
      log('First upload complete, URL:', firstUpload.url);
      
      log('Uploading same image second time...');
      const secondUpload = await uploadToGCS(imageBuffer, 'test-duplicate-2.webp');
      log('Second upload complete, URL:', secondUpload.url);
      
      if (!secondUpload.isNew && firstUpload.url === secondUpload.url) {
        log('Duplicate detection successful! Both uploads returned the same URL');
      } else if (secondUpload.isNew) {
        log('Warning: Duplicate detection failed - image was uploaded twice');
      } else if (firstUpload.url !== secondUpload.url) {
        log('Warning: Duplicate detection returned different URLs for same image');
      }
    } else {
      log('No test images found for duplicate detection test');
    }

    log('Firebase Storage initialization successful');
    return {
      status: 'success',
      message: 'Firebase Storage connection verified'
    };
  } catch (error) {
    log('Firebase Storage initialization failed:', error);
    throw error;
  }
}
