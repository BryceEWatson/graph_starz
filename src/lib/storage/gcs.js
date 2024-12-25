/* eslint-disable @typescript-eslint/no-require-imports */
import { Storage } from '@google-cloud/storage';
import sharpPhash from 'sharp-phash';
import { areSimilarImages, formatHash } from '../utils/imageHash.js';
import { getGCSCredentials } from '../config/gcs.js';
import debug from 'debug';
/* eslint-enable @typescript-eslint/no-require-imports */

const log = debug('app:storage:gcs');

// Storage client singleton
let storage = null;
let bucket = null;

/**
 * Initialize the Storage client if not already initialized
 * @returns {Promise<{storage: Storage, bucket: any}>}
 */
async function initializeStorage() {
  if (storage && bucket) {
    return { storage, bucket };
  }

  try {
    const config = await getGCSCredentials();
    storage = new Storage(config);

    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('GCS_BUCKET_NAME environment variable is required');
    }

    bucket = storage.bucket(bucketName);
    return { storage, bucket };
  } catch (error) {
    log('Failed to initialize Storage client:', error);
    throw error;
  }
}

// Hamming distance threshold for considering images as duplicates
const SIMILARITY_THRESHOLD = 3;

// Cache for hash prefixes to avoid repeated metadata fetches
let hashPrefixCache = new Map();
let lastCacheUpdate = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Updates the hash prefix cache with current bucket state
 */
async function updateHashPrefixCache() {
  const now = Date.now();
  if (now - lastCacheUpdate < CACHE_TTL && hashPrefixCache.size > 0) {
    return;
  }

  const { bucket } = await initializeStorage();
  const [files] = await bucket.getFiles();
  hashPrefixCache.clear();

  await Promise.all(files.map(async (file) => {
    const [metadata] = await file.getMetadata();
    const hash = metadata.metadata?.phash;
    if (hash && /^[0-9a-f]{16}$/i.test(hash)) {
      const prefix = hash.substring(0, 4);
      if (!hashPrefixCache.has(prefix)) {
        hashPrefixCache.set(prefix, []);
      }
      hashPrefixCache.get(prefix).push({
        hash,
        name: file.name,
        url: `https://storage.googleapis.com/${bucket.name}/${encodeURIComponent(file.name)}`
      });
    }
  }));

  lastCacheUpdate = now;
}

/**
 * Calculates perceptual hash of an image buffer
 * @param {Buffer} buffer - The image buffer to hash
 * @returns {Promise<string>} The perceptual hash in hex format
 */
async function calculateImageHash(buffer) {
  // Handle both ESM and CommonJS versions of sharp-phash
  const phashFn = typeof sharpPhash === 'function' ? sharpPhash : sharpPhash.default;
  if (!phashFn) {
    throw new Error('Failed to load sharp-phash function');
  }
  const hash = await phashFn(buffer);
  return formatHash(hash);
}

/**
 * Checks if a similar image already exists in the bucket
 * @param {string} hash - Perceptual hash of the image
 * @param {string} filename - The filename being uploaded
 * @returns {Promise<string|null>} Existing file URL if found, null otherwise
 */
async function findSimilarImage(hash, filename) {
  if (!hash || hash.length !== 16) {
    console.warn('Invalid hash format:', hash);
    return null;
  }

  const prefix = hash.substring(0, 4);
  if (!/^[0-9a-f]{4}$/i.test(prefix)) {
    console.warn('Invalid hash prefix:', prefix);
    return null;
  }

  // Update cache if needed
  await updateHashPrefixCache();

  // Get files with same or neighboring prefixes
  const prefixes = getNeighboringPrefixes(prefix);
  const candidates = [];
  for (const p of prefixes) {
    if (hashPrefixCache.has(p)) {
      candidates.push(...hashPrefixCache.get(p));
    }
  }

  // Check each candidate for similarity
  for (const candidate of candidates) {
    if (candidate.name === filename) continue;
    const distance = areSimilarImages(hash, candidate.hash);
    if (distance <= SIMILARITY_THRESHOLD) {
      return candidate.url;
    }
  }

  return null;
}

/**
 * Get neighboring hash prefixes to handle edge cases
 * @param {string} prefix - The current hash prefix
 * @returns {string[]} - Array of neighboring prefixes
 */
function getNeighboringPrefixes(prefix) {
  const prefixes = [prefix];
  const value = parseInt(prefix, 16);
  
  // Add neighboring prefixes (±1 in hex)
  if (value > 0) {
    prefixes.push((value - 1).toString(16).padStart(4, '0'));
  }
  if (value < 0xffff) {
    prefixes.push((value + 1).toString(16).padStart(4, '0'));
  }
  
  return prefixes;
}

/**
 * Uploads a buffer to Firebase Storage and returns its public URL
 * @param {Buffer|string} buffer - The buffer or base64 string to upload
 * @param {string} filename - The desired filename in storage
 * @param {string} contentType - The MIME type of the file
 * @returns {Promise<{url: string, publicUrl: string, isNew: boolean, similarity?: number}>}
 */
export async function uploadToGCS(buffer, filename, contentType = 'image/webp') {
  const { bucket } = await initializeStorage();
  
  if (!buffer) {
    throw new Error('Buffer is required');
  }

  if (!filename) {
    throw new Error('Filename is required');
  }

  // Convert base64 to buffer if needed
  if (typeof buffer === 'string') {
    buffer = Buffer.from(buffer.split(',')[1], 'base64');
  }

  // Calculate perceptual hash
  const hash = await calculateImageHash(buffer);

  // Check for similar images
  const similarImageUrl = await findSimilarImage(hash, filename);
  if (similarImageUrl) {
    log('Duplicate detected - returning existing image URL: %s', similarImageUrl);
    return {
      url: similarImageUrl,
      publicUrl: similarImageUrl,
      isNew: false,
      similarity: SIMILARITY_THRESHOLD,
      hash
    };
  }

  // Upload new image
  const file = bucket.file(filename);
  const [exists] = await file.exists();
  
  if (exists) {
    throw new Error(`File ${filename} already exists`);
  }

  // Upload the file
  await file.save(buffer, {
    metadata: {
      contentType,
      metadata: {
        phash: hash
      }
    }
  });

  // Generate public URL
  const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(filename)}?alt=media`;
  
  return {
    url: publicUrl,
    publicUrl,
    isNew: true,
    hash
  };
}

/**
 * Deletes all files from the bucket
 * @returns {Promise<void>}
 */
export async function clearBucket() {
  const { bucket } = await initializeStorage();
  const [files] = await bucket.getFiles();
  await Promise.all(files.map(file => file.delete()));
  
  // Clear the cache
  hashPrefixCache.clear();
  lastCacheUpdate = 0;
}

/**
 * Generates a unique filename for an image
 * @param {string} title - The AI-generated title of the image
 * @param {string} size - The size variant of the image (thumbnail, preview, full)
 * @param {string} extension - The file extension (default: webp)
 * @returns {string}
 */
export function generateImageFilename(title, size, extension = 'webp') {
  const timestamp = Date.now();
  const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  return `${safeName}-${size}-${timestamp}.${extension}`;
}
