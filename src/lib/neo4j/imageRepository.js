'use server';

import { getDriver } from './client.js';
import { randomUUID } from 'crypto';
import debug from 'debug';
import neo4j from 'neo4j-driver';

const log = debug('app:neo4j:image');

function normalizeAttribute(attr) {
  if (!attr || typeof attr !== 'string') {
    return '';
  }
  // Convert to lowercase and trim whitespace
  return attr.toLowerCase().trim();
}

/**
 * Clear test images from the database
 * @param {string[]} testImageIds - Array of test image IDs to clear
 * @returns {Promise<number>} Number of images cleared
 */
export async function clearTestImages(testImageIds) {
  const log = debug('app:neo4j:image');
  
  try {
    log('Clearing test images with IDs:', testImageIds);
    const driver = await getDriver();
    const session = driver.session();

    // Delete all test images and their relationships
    const result = await session.executeWrite(tx => tx.run(`
      MATCH (i:Image)
      WHERE i.id IN $testImageIds
      OPTIONAL MATCH (i)-[r]-()
      DELETE r, i
      RETURN count(i) as cleared
    `, { testImageIds }));

    // Convert Neo4j Integer to JavaScript number
    const cleared = neo4j.integer.toNumber(result.records[0].get('cleared'));
    log(`Cleared ${cleared} test images`);
    
    await session.close();
    return cleared;
  } catch (error) {
    log('Error clearing test images:', error);
    throw error;
  }
}

/**
 * Save image data to Neo4j
 * @param {Object} imageData - Processed image data (url, thumbnailUrl, width, height, pHash)
 * @param {Object} analysis - Image analysis results (title, description, objects, colors, styles)
 * @param {string} userId - ID of the user uploading the image
 * @param {string} [fixedId] - Optional fixed ID for test images
 * @returns {Promise<{id: string, isDuplicate?: boolean}>}
 */
export async function saveImageData(imageData, analysis, userId, fixedId = null) {
  if (!userId) {
    const error = new Error('User ID is required');
    log('Failed to save image: %O', {
      error: error.message,
      code: 'MISSING_USER_ID',
      userId
    });
    throw error;
  }

  const driver = await getDriver();
  const session = driver.session();

  try {
    // Generate a unique ID for the image
    const imageId = fixedId || randomUUID();
    log('Starting image save operation: %O', {
      imageId,
      userId,
      isTestImage: !!fixedId,
      contentType: imageData.contentType
    });

    // Check for duplicate if not a test image
    if (!fixedId && imageData.pHash) {
      const duplicate = await findSimilarImage(imageData.pHash);
      if (duplicate) {
        log('Duplicate image detected: %O', {
          originalId: duplicate,
          pHash: imageData.pHash,
          newImageId: imageId
        });
        return { id: duplicate, isDuplicate: true };
      }
    }

    // Create the image with its properties
    const result = await session.executeWrite(async (tx) => {
      log('Creating image node with properties: %O', {
        imageId,
        userId,
        url: imageData.url,
        thumbnailUrl: imageData.thumbnailUrl,
        width: imageData.width,
        height: imageData.height
      });

      // First verify the user exists
      const userCheck = await tx.run(`
        MATCH (u:User {id: $userId})
        RETURN u
      `, { userId });

      if (!userCheck.records[0]) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Create the image
      const imageResult = await tx.run(`
        MATCH (u:User {id: $userId})
        CREATE (i:Image {
          id: $imageId,
          name: $name,
          description: $description,
          url: $url,
          thumbnailUrl: $thumbnailUrl,
          pHash: $pHash,
          width: toInteger($width),
          height: toInteger($height),
          createdAt: datetime(),
          userId: $userId
        })
        CREATE (u)-[:UPLOADED]->(i)
        RETURN i
      `, {
        imageId,
        userId,
        name: imageData.name || '',
        description: imageData.description || '',
        url: imageData.url,
        thumbnailUrl: imageData.thumbnailUrl,
        pHash: imageData.pHash || null,
        width: imageData.width,
        height: imageData.height
      });

      if (!imageResult.records[0]) {
        log('Failed to create image node. Query result: %O', imageResult);
        throw new Error('Failed to create image node - no records returned');
      }

      // Create relationships for colors
      if (analysis.colors && analysis.colors.length > 0) {
        log('Creating color relationships: %O', analysis.colors);
        try {
          for (const color of analysis.colors) {
            const normalizedColor = normalizeAttribute(color);
            if (!normalizedColor) continue;

            await tx.run(`
              MERGE (c:Color {name: $color})
              WITH c
              MATCH (i:Image {id: $imageId})
              CREATE (i)-[:HAS_COLOR]->(c)
            `, { color: normalizedColor, imageId });
          }
        } catch (error) {
          log('Failed to create color relationships: %O', {
            error: error.message,
            code: error.code,
            colors: analysis.colors,
            imageId
          });
          throw error;
        }
      }

      // Create relationships for objects
      if (analysis.objects && analysis.objects.length > 0) {
        log('Creating object relationships: %O', analysis.objects);
        try {
          for (const object of analysis.objects) {
            const normalizedObject = normalizeAttribute(object);
            if (!normalizedObject) continue;

            await tx.run(`
              MERGE (o:Object {name: $object})
              WITH o
              MATCH (i:Image {id: $imageId})
              CREATE (i)-[:CONTAINS]->(o)
            `, { object: normalizedObject, imageId });
          }
        } catch (error) {
          log('Failed to create object relationships: %O', {
            error: error.message,
            code: error.code,
            objects: analysis.objects,
            imageId
          });
          throw error;
        }
      }

      // Create relationships for styles
      if (analysis.styles && analysis.styles.length > 0) {
        log('Creating style relationships: %O', analysis.styles);
        try {
          for (const style of analysis.styles) {
            const normalizedStyle = normalizeAttribute(style);
            if (!normalizedStyle) continue;

            await tx.run(`
              MERGE (s:Style {name: $style})
              WITH s
              MATCH (i:Image {id: $imageId})
              CREATE (i)-[:HAS_STYLE]->(s)
            `, { style: normalizedStyle, imageId });
          }
        } catch (error) {
          log('Failed to create style relationships: %O', {
            error: error.message,
            code: error.code,
            styles: analysis.styles,
            imageId
          });
          throw error;
        }
      }

      return imageResult;
    });

    if (!result.records[0]) {
      throw new Error('Failed to create image - transaction succeeded but no records returned');
    }

    log('Successfully saved image: %s', imageId);
    return { id: imageId };
  } catch (error) {
    log('Error saving image: %O', {
      error: error.message,
      stack: error.stack,
      code: error.code,
      imageId: fixedId || 'new'
    });
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Ensure user exists in Neo4j database
 * @param {string} email - User's email address
 * @param {string} name - User's display name
 * @param {string} providerId - OAuth provider's user ID
 * @returns {Promise<void>}
 */
export async function ensureUserExists(email, name, providerId) {
  const log = debug('app:neo4j:user');
  log('Ensuring user exists:', { email, name, providerId });
  
  const driver = await getDriver();
  const session = driver.session();
  
  try {
    await session.executeWrite(async (tx) => {
      const result = await tx.run(`
        MERGE (u:User {id: $providerId})
        ON CREATE SET
          u.email = $email,
          u.name = $name,
          u.createdAt = datetime(),
          u.lastLogin = datetime()
        ON MATCH SET
          u.email = $email,
          u.name = $name,
          u.lastLogin = datetime()
        RETURN u
      `, { email, name, providerId });
      
      const user = result.records[0]?.get('u')?.properties;
      log('User created/updated:', user);
    });
  } catch (error) {
    log('Error ensuring user exists:', error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Find similar image based on perceptual hash
 * @param {string} pHash - Perceptual hash to check
 * @returns {Promise<string|null>} Image ID if similar image exists, null otherwise
 */
export async function findSimilarImage(pHash) {
  const driver = await getDriver();
  const session = driver.session();

  try {
    const result = await session.executeRead(async (tx) => {
      return await tx.run(`
        MATCH (i:Image)
        WHERE i.pHash = $pHash
        RETURN i.id as id
      `, { pHash });
    });

    return result.records[0]?.get('id') || null;
  } finally {
    await session.close();
  }
}

/**
 * Get image by ID
 * @param {string} imageId - ID of the image to retrieve
 * @returns {Promise<Object|null>} Image data if found, null otherwise
 */
export async function getImageById(imageId) {
  const driver = await getDriver();
  const session = driver.session();

  try {
    const result = await session.executeRead(async (tx) => {
      const imageResult = await tx.run(`
        MATCH (i:Image {id: $imageId})
        OPTIONAL MATCH (i)-[:HAS_COLOR]->(c:Color)
        OPTIONAL MATCH (i)-[:CONTAINS]->(o:Object)
        OPTIONAL MATCH (i)-[:HAS_STYLE]->(s:Style)
        RETURN i,
               collect(DISTINCT c.name) as colors,
               collect(DISTINCT o.name) as objects,
               collect(DISTINCT s.name) as styles
      `, { imageId });

      if (!imageResult.records[0]) {
        return null;
      }

      const record = imageResult.records[0];
      const image = record.get('i').properties;
      const colors = record.get('colors');
      const objects = record.get('objects');
      const styles = record.get('styles');

      return {
        ...image,
        colors,
        objects,
        styles
      };
    });

    return result;
  } finally {
    await session.close();
  }
}
