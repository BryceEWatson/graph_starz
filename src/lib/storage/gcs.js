import { Storage } from '@google-cloud/storage'
import sharpPhash from 'sharp-phash'
import { areSimilarImages, formatHash } from '../utils/imageHash.js'
import { getStorageConfig } from '../config/env.js'
import debug from 'debug'

const log = debug('app:storage:gcs')

// Storage client singleton
let storage = null
let bucket = null

/**
 * Initialize the Storage client if not already initialized
 * @returns {Promise<{storage: Storage, bucket: any}>}
 */
async function initializeStorage() {
    if (storage && bucket) {
        return { storage, bucket }
    }

    try {
        const config = getStorageConfig()
        storage = new Storage({
            projectId: config.projectId,
            ...config.credentials
        })

        bucket = storage.bucket(config.bucketName)
        return { storage, bucket }
    } catch (error) {
        log('Failed to initialize storage:', error)
        throw new Error(`Failed to initialize storage: ${error.message}`)
    }
}

// Hamming distance threshold for considering images as duplicates
const SIMILARITY_THRESHOLD = 3

// Cache for hash prefixes to avoid repeated metadata fetches
let hashPrefixCache = new Map()
let lastCacheUpdate = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Updates the hash prefix cache with current bucket state
 */
async function updateHashPrefixCache() {
    const now = Date.now()
    if (now - lastCacheUpdate < CACHE_TTL && hashPrefixCache.size > 0) {
        return
    }

    const { bucket } = await initializeStorage()
    const [files] = await bucket.getFiles()
    hashPrefixCache.clear()

    await Promise.all(files.map(async (file) => {
        const [metadata] = await file.getMetadata()
        const hash = metadata.metadata?.phash
        if (hash && /^[0-9a-f]{16}$/i.test(hash)) {
            const prefix = hash.substring(0, 4)
            if (!hashPrefixCache.has(prefix)) {
                hashPrefixCache.set(prefix, [])
            }
            hashPrefixCache.get(prefix).push({
                hash,
                name: file.name,
                url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(file.name)}?alt=media`
            })
        }
    }))

    lastCacheUpdate = now
}

/**
 * Calculates perceptual hash of an image buffer
 * @param {Buffer} buffer - The image buffer to hash
 * @returns {Promise<string>} The perceptual hash in hex format
 */
async function calculateImageHash(buffer) {
    // Handle both ESM and CommonJS versions of sharp-phash
    const phashFn = typeof sharpPhash === 'function' ? sharpPhash : sharpPhash.default
    if (!phashFn) {
        throw new Error('Failed to load sharp-phash function')
    }
    const hash = await phashFn(buffer)
    return formatHash(hash)
}

/**
 * Checks if a similar image already exists in the bucket
 * @param {string} hash - Perceptual hash of the image
 * @param {string} _filename - The filename being uploaded (unused)
 * @returns {Promise<string|null>} Existing file URL if found, null otherwise
 */
async function findSimilarImage(hash, _filename) {
    if (!hash) {
        return null
    }

    const { bucket } = await initializeStorage()
    const prefix = hash.substring(0, 4)
    const prefixes = [prefix, ...getNeighboringPrefixes(prefix)]

    for (const currentPrefix of prefixes) {
        const [files] = await bucket.getFiles({
            prefix: currentPrefix
        })

        for (const file of files) {
            const [metadata] = await file.getMetadata()
            const storedHash = metadata?.metadata?.pHash

            if (storedHash && areSimilarImages(hash, storedHash)) {
                const bucketName = bucket.name
                const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(file.name)}?alt=media`
                return publicUrl
            }
        }
    }

    return null
}

/**
 * Get neighboring hash prefixes to handle edge cases
 * @param {string} prefix - The current hash prefix
 * @returns {string[]} - Array of neighboring prefixes
 */
function getNeighboringPrefixes(prefix) {
    const prefixes = [prefix]
    const value = parseInt(prefix, 16)

    // Add neighboring prefixes (±1 in hex)
    if (value > 0) {
        prefixes.push((value - 1).toString(16).padStart(4, '0'))
    }
    if (value < 0xffff) {
        prefixes.push((value + 1).toString(16).padStart(4, '0'))
    }

    return prefixes
}

/**
 * Uploads a buffer to Firebase Storage and returns its public URL
 * @param {Buffer|string} buffer - The buffer or base64 string to upload
 * @param {string} filename - The desired filename in storage
 * @param {string} contentType - The MIME type of the file
 * @returns {Promise<{fullUrl: string, isNew: boolean, similarity?: number}>}
 */
async function uploadToGCS(buffer, filename, contentType = 'image/webp') {
    const { bucket } = await initializeStorage()

    if (!buffer) {
        throw new Error('Buffer is required')
    }

    if (!filename) {
        throw new Error('Filename is required')
    }

    // Convert base64 to buffer if needed
    if (typeof buffer === 'string') {
        buffer = Buffer.from(buffer.split(',')[1], 'base64')
    }

    // Calculate perceptual hash
    const hash = await calculateImageHash(buffer)

    // Check for similar images
    const similarImageUrl = await findSimilarImage(hash, filename)
    if (similarImageUrl) {
        log('Duplicate detected - returning existing image URL: %s', similarImageUrl)
        return {
            fullUrl: similarImageUrl,
            isNew: false,
            similarity: SIMILARITY_THRESHOLD,
            hash
        }
    }

    // Upload new image
    const file = bucket.file(filename)
    const [exists] = await file.exists()

    if (exists) {
        log('File already exists in bucket: %s', filename)
        const bucketName = bucket.name
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filename)}?alt=media`
        return {
            fullUrl: publicUrl,
            isNew: false
        }
    }

    try {
        await file.save(buffer, {
            metadata: {
                contentType,
                metadata: {
                    pHash: hash
                }
            }
        })

        // Generate Firebase Storage URL
        const bucketName = bucket.name
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(filename)}?alt=media`

        return {
            fullUrl: publicUrl,
            isNew: true,
            hash
        }
    } catch (error) {
        log('Error uploading to GCS:', error)
        throw error
    }
}

/**
 * Deletes all files from the bucket
 * @returns {Promise<void>}
 */
async function clearBucket() {
    const { bucket } = await initializeStorage()
    const [files] = await bucket.getFiles()
    await Promise.all(files.map(file => file.delete()))

    // Clear the cache
    hashPrefixCache.clear()
    lastCacheUpdate = 0
}

/**
 * Generates a unique filename for an image
 * @param {string} title - The AI-generated title of the image
 * @param {string} size - The size variant of the image (thumbnail, preview, full)
 * @param {string} extension - The file extension (default: webp)
 * @returns {string}
 */
function generateImageFilename(title, size, extension = 'webp') {
    const timestamp = Date.now()
    const safeName = title.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    return `${safeName}-${size}-${timestamp}.${extension}`
}

/**
 * Deletes a file from GCS
 * @param {string} filename - The name of the file to delete
 * @returns {Promise<void>}
 */
async function deleteFromGCS(filename) {
    const { bucket } = await initializeStorage()
    const file = bucket.file(filename)
    try {
        await file.delete()
        log('Deleted file:', filename)
    } catch (error) {
        log('Error deleting file:', error)
        throw error
    }
}

/**
 * Renames a file in GCS
 * @param {string} oldFilename - The current filename
 * @param {string} newFilename - The new filename
 * @returns {Promise<string>} The new public URL
 */
async function renameInGCS(oldFilename, newFilename) {
    if (!oldFilename || !newFilename) {
        throw new Error('Both oldFilename and newFilename are required')
    }

    const { bucket } = await initializeStorage()
    const file = bucket.file(oldFilename)

    try {
        // Check if source file exists
        const [exists] = await file.exists()
        if (!exists) {
            throw new Error(`Source file ${oldFilename} does not exist`)
        }

        // Check if destination already exists
        const [destExists] = await bucket.file(newFilename).exists()
        if (destExists) {
            throw new Error(`Destination file ${newFilename} already exists`)
        }

        await file.move(newFilename)
        const publicUrl = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(newFilename)}?alt=media`
        log('Renamed file from', oldFilename, 'to', newFilename)
        return publicUrl
    } catch (error) {
        log('Error renaming file:', error)
        throw error
    }
}

export {
    initializeStorage,
    findSimilarImage,
    uploadToGCS,
    clearBucket,
    generateImageFilename,
    deleteFromGCS,
    renameInGCS,
    updateHashPrefixCache
}
