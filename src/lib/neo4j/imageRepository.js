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
 * Create an attribute relationship between an image and an attribute
 * @param {Object} tx - Neo4j transaction
 * @param {string} imageId - ID of the image
 * @param {Object} attr - Attribute object with category, value, context, prominence, and reasoning
 */
async function createAttributeRelationship(tx, imageId, attr) {
  try {
    await tx.run(`
      MERGE (a:Attribute {category: $category, value: $value})
      WITH a
      MATCH (i:Image {id: $imageId})
      CREATE (i)-[:HAS_ATTRIBUTE {
        context: $context,
        prominence: $prominence,
        reasoning: $reasoning,
        timestamp: datetime()
      }]->(a)
    `, {
      imageId,
      category: attr.category,
      value: normalizeAttribute(attr.value),
      context: attr.context,
      prominence: attr.prominence,
      reasoning: attr.reasoning
    });
  } catch (error) {
    log('Failed to create attribute relationship: %O', {
      error: error.message,
      code: error.code,
      imageId,
      attribute: attr
    });
    throw error;
  }
}

/**
 * Save image data to Neo4j
 * @param {Object} imageData - Processed image data (fullUrl, previewUrl, graphUrl, width, height, pHash)
 * @param {Object} analysis - Image analysis results from Claude
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
    await session.executeWrite(async (tx) => {
      // First verify the user exists
      const userCheck = await tx.run(`
        MATCH (u:User {id: $userId})
        RETURN u
      `, { userId });

      if (!userCheck.records[0]) {
        throw new Error(`User with ID ${userId} not found`);
      }

      // Create the image
      await tx.run(`
        MATCH (u:User {id: $userId})
        CREATE (i:Image {
          id: $imageId,
          title: $title,
          description: $description,
          fullUrl: $fullUrl,            // Full size image
          previewUrl: $previewUrl,      // Medium size image
          graphUrl: $graphUrl,          // Graph view size (160px)
          pHash: $pHash,
          width: toInteger($width),
          height: toInteger($height),
          createdAt: datetime(),
          userId: $userId
        })
        CREATE (u)-[:UPLOADED]->(i)
      `, {
        imageId,
        userId,
        title: analysis.title || '',
        description: analysis.description || '',
        fullUrl: imageData.fullUrl,
        previewUrl: imageData.previewUrl,
        graphUrl: imageData.graphUrl,
        pHash: imageData.pHash || null,
        width: imageData.width,
        height: imageData.height
      });

      // Create attribute relationships
      if (analysis.attributes && analysis.attributes.length > 0) {
        log('Creating attribute relationships: %O', analysis.attributes);
        try {
          for (const attr of analysis.attributes) {
            await createAttributeRelationship(tx, imageId, attr);
          }
        } catch (error) {
          log('Failed to create attribute relationships: %O', {
            error: error.message,
            code: error.code,
            attributes: analysis.attributes,
            imageId
          });
          throw error;
        }
      }
    });

    log('Successfully saved image: %O', {
      imageId,
      userId,
      attributeCount: analysis.attributes?.length || 0
    });

    return { id: imageId };
  } catch (error) {
    log('Error in saveImageData: %O', {
      error: error.message,
      code: error.code,
      imageId: fixedId,
      userId
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
    const result = await session.run(`
      MATCH (i:Image {id: $imageId})
      OPTIONAL MATCH (i)<-[:UPLOADED]-(u:User)
      OPTIONAL MATCH (i)-[r:HAS_ATTRIBUTE]->(a:Attribute)
      WITH i, u, collect({
        category: a.category,
        value: a.value,
        context: a.context,
        prominence: a.prominence,
        reasoning: a.reasoning
      }) as attributes
      RETURN {
        id: i.id,
        title: i.title,
        description: i.description,
        fullUrl: i.fullUrl,
        previewUrl: i.previewUrl,
        graphUrl: i.graphUrl,
        width: i.width,
        height: i.height,
        pHash: i.pHash,
        createdAt: i.createdAt,
        userId: i.userId,
        uploadedBy: {
          id: u.id,
          name: u.name,
          email: u.email
        },
        attributes: attributes
      } as image
    `, { imageId });

    if (!result.records[0]) {
      return null;
    }

    const image = result.records[0].get('image');
    return {
      ...image,
      createdAt: image.createdAt ? new Date(image.createdAt) : null,
      uploadedBy: image.uploadedBy?.id ? image.uploadedBy : null
    };
  } finally {
    await session.close();
  }
}

/**
 * Migrate existing attribute nodes to use 'category' instead of 'type'
 * @returns {Promise<number>} Number of nodes updated
 */
export async function migrateAttributeNodes() {
  const driver = await getDriver();
  const session = driver.session();

  try {
    const result = await session.executeWrite(tx => tx.run(`
      MATCH (a:Attribute)
      WHERE a.type IS NOT NULL
      WITH a, a.type as oldType
      SET a.category = oldType
      REMOVE a.type
      RETURN count(a) as updated
    `));

    const updated = neo4j.integer.toNumber(result.records[0].get('updated'));
    log(`Migrated ${updated} attribute nodes from 'type' to 'category'`);
    return updated;
  } catch (error) {
    log('Error migrating attribute nodes:', error);
    throw error;
  } finally {
    await session.close();
  }
}
