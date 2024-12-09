/* eslint-disable @typescript-eslint/no-require-imports */
const { Storage } = require('@google-cloud/storage');
const sharpPhash = require('sharp-phash');
const { areSimilarImages, formatHash } = require('../utils/imageHash.js');
/* eslint-enable @typescript-eslint/no-require-imports */

const storage = new Storage();
const bucketName = process.env.GCS_BUCKET_NAME;

if (!bucketName) {
  throw new Error('GCS_BUCKET_NAME environment variable is required');
}

const bucket = storage.bucket(bucketName);

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

  const [files] = await bucket.getFiles();
  hashPrefixCache.clear();

  await Promise.all(files.map(async (file) => {
    const [metadata] = await file.getMetadata();
    const hash = metadata.metadata?.pHash;
    if (hash && /^[0-9a-f]{16}$/i.test(hash)) {
      // Validate prefix is exactly 4 hex characters
      const prefix = hash.substring(0, 4);
      if (!/^[0-9a-f]{4}$/i.test(prefix)) {
        console.warn(`Invalid hash prefix for file ${file.name}: ${prefix}`);
        return;
      }

      if (!hashPrefixCache.has(prefix)) {
        hashPrefixCache.set(prefix, []);
      }
      hashPrefixCache.get(prefix).push({
        name: file.name,
        hash,
        size: file.name.match(/-(?:thumbnail|preview|full)-/)?.[0]
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
  const binaryHash = await sharpPhash(buffer);
  return formatHash(binaryHash);
}

/**
 * Checks if a similar image already exists in the bucket
 * @param {string} hash - Perceptual hash of the image
 * @param {string} filename - The filename being uploaded
 * @returns {Promise<string|null>} Existing file URL if found, null otherwise
 */
async function findSimilarImage(hash, filename) {
  // Validate input hash first
  if (!/^[0-9a-f]{16}$/i.test(hash)) {
    throw new Error('Input hash must be a 16-character hex string');
  }

  // Extract size from filename
  const targetSize = filename.match(/-(?:thumbnail|preview|full)-/)?.[0];
  if (!targetSize) {
    return null;
  }

  // Update cache if needed
  await updateHashPrefixCache();

  // Get prefix for quick filtering
  const prefix = hash.substring(0, 4);
  
  // Get all hashes that share the same prefix
  const candidates = hashPrefixCache.get(prefix) || [];
  
  // Add candidates from neighboring prefixes to handle edge cases
  const neighborPrefixes = getNeighboringPrefixes(prefix);
  for (const neighborPrefix of neighborPrefixes) {
    const neighborCandidates = hashPrefixCache.get(neighborPrefix) || [];
    candidates.push(...neighborCandidates);
  }

  // Filter by size and check similarity
  for (const candidate of candidates) {
    if (candidate.size === targetSize && 
        areSimilarImages(hash, candidate.hash, SIMILARITY_THRESHOLD)) {
      const encodedFilePath = encodeURIComponent(candidate.name);
      return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedFilePath}?alt=media`;
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
  const prefixNum = parseInt(prefix, 16);
  const neighbors = [];
  
  // Add prefixes that differ by 1 bit
  for (let i = 0; i < 16; i++) {
    const neighbor = prefixNum ^ (1 << i);
    if (neighbor !== prefixNum) {
      const neighborHex = neighbor.toString(16).padStart(4, '0');
      if (neighborHex.length === 4) {
        neighbors.push(neighborHex);
      }
    }
  }
  
  return neighbors;
}

/**
 * Uploads a buffer to Firebase Storage and returns its public URL
 * @param {Buffer|string} buffer - The buffer or base64 string to upload
 * @param {string} filename - The desired filename in storage
 * @param {string} contentType - The MIME type of the file
 * @returns {Promise<{url: string, publicUrl: string, isNew: boolean, similarity?: number}>} The public URL and upload status
 */
async function uploadToGCS(buffer, filename, contentType = 'image/webp') {
  // Convert base64 to buffer if needed
  const fileBuffer = typeof buffer === 'string' 
    ? Buffer.from(buffer.replace(/^data:image\/\w+;base64,/, ''), 'base64')
    : buffer;

  try {
    // Calculate perceptual hash of the image
    const pHash = await calculateImageHash(fileBuffer);
    
    // Check if similar image exists
    const existingUrl = await findSimilarImage(pHash, filename);
    if (existingUrl) {
      return { url: existingUrl, publicUrl: existingUrl, isNew: false };
    }

    // Create a reference to the new file
    const file = bucket.file(filename);

    // Upload the file
    await file.save(fileBuffer, {
      contentType,
      metadata: {
        cacheControl: 'public, max-age=31536000', // Cache for 1 year
        metadata: {
          pHash // Store perceptual hash in metadata
        }
      },
    });

    // Generate Firebase Storage public URL
    const encodedFilePath = encodeURIComponent(filename);
    const url = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodedFilePath}?alt=media`;
    const publicUrl = url; // For backwards compatibility
    
    return { url, publicUrl, isNew: true };
  } catch (error) {
    throw new Error(`Failed to upload to GCS: ${error.message}`);
  }
}

/**
 * Deletes all files from the bucket
 * @returns {Promise<void>}
 */
async function clearBucket() {
  const [files] = await bucket.getFiles();
  
  if (files.length === 0) {
    return;
  }

  await Promise.all(
    files.map(file => file.delete())
  );
}

/**
 * Generates a unique filename for an image
 * @param {string} title - The AI-generated title of the image
 * @param {string} size - The size variant of the image (thumbnail, preview, full)
 * @param {string} extension - The file extension (default: webp)
 * @returns {string} A unique filename
 */
function generateImageFilename(title, size, extension = 'webp') {
  // Convert title to URL-friendly format
  const urlSafeTitle = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  // Add a timestamp to ensure uniqueness
  const timestamp = Date.now();

  return `${urlSafeTitle}-${size}-${timestamp}.${extension}`;
}

module.exports = {
  uploadToGCS,
  clearBucket,
  generateImageFilename
};
