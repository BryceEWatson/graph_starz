'use server';

import { getDriver } from './client.js';

function normalizeAttribute(attr) {
  if (!attr || typeof attr !== 'string') {
    return '';
  }
  // Convert to lowercase and trim whitespace
  return attr.toLowerCase().trim();
}

export async function saveImageData(imageData, analysis, userId) {
  if (!userId) {
    throw new Error('userId is required');
  }
  if (!imageData) {
    throw new Error('imageData is required');
  }
  if (!analysis) {
    throw new Error('analysis is required');
  }

  console.log('Saving image data to Neo4j...');
  console.log('User ID:', userId);
  console.log('Image metadata:', JSON.stringify(imageData.metadata, null, 2));
  console.log('Analysis:', JSON.stringify(analysis, null, 2));
  console.log('Title from analysis:', analysis.title);
  console.log('Title from metadata:', imageData.metadata.title);

  const driver = await getDriver();
  const session = driver.session();

  try {
    // First transaction: Create index if it doesn't exist
    console.log('Creating index if not exists...');
    await session.executeWrite(async (tx) => {
      await tx.run(`
        CREATE INDEX image_phash_idx IF NOT EXISTS
        FOR (i:Image) ON (i.pHash)
      `);
    });

    // Second transaction: Check for duplicates and save image data
    console.log('Checking for duplicates and saving image data...');
    const result = await session.executeWrite(async (tx) => {
      // Check for similar images using database-level comparison
      console.log('Checking for similar images with pHash:', imageData.metadata.pHash);
      const similarImage = await tx.run(`
        MATCH (i:Image)
        WHERE i.pHash IS NOT NULL
        WITH i, $pHash as targetHash,
          // Convert hex strings to binary strings
          reduce(acc="", h1 IN split(i.pHash, "") | 
            acc + CASE h1
              WHEN "0" THEN "0000" WHEN "1" THEN "0001" WHEN "2" THEN "0010" WHEN "3" THEN "0011"
              WHEN "4" THEN "0100" WHEN "5" THEN "0101" WHEN "6" THEN "0110" WHEN "7" THEN "0111"
              WHEN "8" THEN "1000" WHEN "9" THEN "1001" WHEN "a" THEN "1010" WHEN "b" THEN "1011"
              WHEN "c" THEN "1100" WHEN "d" THEN "1101" WHEN "e" THEN "1110" WHEN "f" THEN "1111"
              ELSE "0000" END) as hash1Bin,
          reduce(acc="", h2 IN split($pHash, "") | 
            acc + CASE h2
              WHEN "0" THEN "0000" WHEN "1" THEN "0001" WHEN "2" THEN "0010" WHEN "3" THEN "0011"
              WHEN "4" THEN "0100" WHEN "5" THEN "0101" WHEN "6" THEN "0110" WHEN "7" THEN "0111"
              WHEN "8" THEN "1000" WHEN "9" THEN "1001" WHEN "a" THEN "1010" WHEN "b" THEN "1011"
              WHEN "c" THEN "1100" WHEN "d" THEN "1101" WHEN "e" THEN "1110" WHEN "f" THEN "1111"
              ELSE "0000" END) as hash2Bin
        WITH i, reduce(distance = 0, idx IN range(0, size(hash1Bin)-1) |
          distance + CASE WHEN substring(hash1Bin, idx, 1) <> substring(hash2Bin, idx, 1) THEN 1 ELSE 0 END) as distance
        WHERE distance <= $threshold
        RETURN i.id
        LIMIT 1
      `, {
        pHash: imageData.metadata.pHash,
        threshold: 3
      });

      if (similarImage.records.length > 0) {
        const similarId = similarImage.records[0].get('i.id');
        console.log('Found similar image:', similarId);
        return { id: similarId, isNew: false };
      }

      // Create unique ID for the image
      const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      console.log('Creating new image with ID:', imageId);

      // Normalize all attributes (ensure arrays exist and handle null/undefined)
      const style = (analysis.style || []).map(normalizeAttribute).filter(Boolean);
      const technique = (analysis.technique || []).map(normalizeAttribute).filter(Boolean);
      const mood = (analysis.mood || []).map(normalizeAttribute).filter(Boolean);
      const composition = (analysis.composition || []).map(normalizeAttribute).filter(Boolean);
      const colors = (analysis.dominantColors || []).map(normalizeAttribute).filter(Boolean);
      const objects = (analysis.objects || []).map(normalizeAttribute).filter(Boolean);

      // Create image node with metadata in a single query
      const queryResult = await tx.run(`
        // Match user
        MATCH (u:User {id: $userId})
        WITH u
        WHERE u IS NOT NULL

        // Create image node
        CREATE (i:Image {
          id: $imageId,
          title: $title,
          description: $description,
          originalName: $originalName,
          width: $width,
          height: $height,
          pHash: $pHash,
          thumbnailUrl: $thumbnailUrl,
          previewUrl: $previewUrl,
          fullUrl: $fullUrl,
          uploadedAt: $uploadedAt,
          createdAt: datetime()
        })

        // Create relationships
        WITH i, u
        CREATE (u)-[:UPLOADED]->(i)

        // Create style relationships
        WITH i
        FOREACH (styleName IN $style |
          MERGE (s:Style {name: styleName})
          CREATE (i)-[:HAS_STYLE]->(s)
        )

        // Create technique relationships
        WITH i
        FOREACH (techniqueName IN $technique |
          MERGE (t:Technique {name: techniqueName})
          CREATE (i)-[:USES_TECHNIQUE]->(t)
        )

        // Create mood relationships
        WITH i
        FOREACH (moodName IN $mood |
          MERGE (m:Mood {name: moodName})
          CREATE (i)-[:HAS_MOOD]->(m)
        )

        // Create composition relationships
        WITH i
        FOREACH (compositionName IN $composition |
          MERGE (c:Composition {name: compositionName})
          CREATE (i)-[:HAS_COMPOSITION]->(c)
        )

        // Create color relationships
        WITH i
        FOREACH (colorName IN $colors |
          MERGE (c:Color {name: colorName})
          CREATE (i)-[:HAS_COLOR]->(c)
        )

        // Create object relationships
        WITH i
        FOREACH (objectName IN $objects |
          MERGE (o:Object {name: objectName})
          CREATE (i)-[:CONTAINS_OBJECT]->(o)
        )

        RETURN i.id as id
      `, {
        imageId,
        userId,
        title: analysis.title || 'Untitled Image',
        description: analysis.description || '',
        originalName: imageData.metadata.originalName,
        width: imageData.metadata.width,
        height: imageData.metadata.height,
        pHash: imageData.metadata.pHash,
        thumbnailUrl: imageData.urls.thumbnail,
        previewUrl: imageData.urls.preview,
        fullUrl: imageData.urls.full,
        uploadedAt: imageData.metadata.uploadedAt,
        style,
        technique,
        mood,
        composition,
        colors,
        objects
      });

      console.log('Neo4j query result:', JSON.stringify(queryResult.records, null, 2));
      return { id: imageId, isNew: true };
    });

    console.log('Successfully saved image data:', JSON.stringify(result, null, 2));
    return result;
  } catch (error) {
    console.error('Error saving image data to Neo4j:', error);
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Check if a similar image exists based on perceptual hash
 * @param {string} pHash - Perceptual hash to check
 * @returns {Promise<string|null>} Image ID if similar image exists, null otherwise
 */
export async function findSimilarImage(pHash) {
  const driver = await getDriver();
  const session = driver.session();

  try {
    const result = await session.executeRead(async (tx) => {
      // Use index and database-level comparison
      const response = await tx.run(`
        MATCH (i:Image)
        WHERE i.pHash IS NOT NULL 
        WITH i, $pHash as targetHash,
          // Convert hex strings to binary strings
          reduce(acc="", h1 IN split(i.pHash, "") | 
            acc + CASE h1
              WHEN "0" THEN "0000" WHEN "1" THEN "0001" WHEN "2" THEN "0010" WHEN "3" THEN "0011"
              WHEN "4" THEN "0100" WHEN "5" THEN "0101" WHEN "6" THEN "0110" WHEN "7" THEN "0111"
              WHEN "8" THEN "1000" WHEN "9" THEN "1001" WHEN "a" THEN "1010" WHEN "b" THEN "1011"
              WHEN "c" THEN "1100" WHEN "d" THEN "1101" WHEN "e" THEN "1110" WHEN "f" THEN "1111"
              ELSE "0000" END) as hash1Bin,
          reduce(acc="", h2 IN split($pHash, "") | 
            acc + CASE h2
              WHEN "0" THEN "0000" WHEN "1" THEN "0001" WHEN "2" THEN "0010" WHEN "3" THEN "0011"
              WHEN "4" THEN "0100" WHEN "5" THEN "0101" WHEN "6" THEN "0110" WHEN "7" THEN "0111"
              WHEN "8" THEN "1000" WHEN "9" THEN "1001" WHEN "a" THEN "1010" WHEN "b" THEN "1011"
              WHEN "c" THEN "1100" WHEN "d" THEN "1101" WHEN "e" THEN "1110" WHEN "f" THEN "1111"
              ELSE "0000" END) as hash2Bin
        WITH i, reduce(distance = 0, idx IN range(0, size(hash1Bin)-1) |
          distance + CASE WHEN substring(hash1Bin, idx, 1) <> substring(hash2Bin, idx, 1) THEN 1 ELSE 0 END) as distance
        WHERE distance <= $threshold
        RETURN i.id, i.pHash, distance
        ORDER BY distance
        LIMIT 1
      `, {
        pHash,
        threshold: 3
      });

      return response.records.length > 0 ? response.records[0].get('i.id') : null;
    });

    return result;
  } finally {
    await session.close();
  }
}

export async function ensureUserExists(email, name, providerId) {
  const driver = await getDriver();
  const session = driver.session();

  try {
    const result = await session.run(`
      MERGE (u:User {id: $providerId})
      ON CREATE SET 
        u.email = $email,
        u.name = $name,
        u.createdAt = datetime()
      ON MATCH SET
        u.lastLoginAt = datetime(),
        u.email = $email,
        u.name = $name
      RETURN u.id as userId, u.email as email
    `, {
      providerId,
      email,
      name
    });
    
    console.log('User ensure result:', result.records[0]?.get('email'));
    return providerId;
  } finally {
    await session.close();
  }
}

export async function getImageById(imageId) {
  const driver = await getDriver();
  const session = driver.session();

  try {
    const result = await session.executeRead(async (tx) => {
      const imageQuery = await tx.run(
        `MATCH (i:Image {id: $imageId})
         OPTIONAL MATCH (i)-[:HAS_ATTRIBUTE]->(a:Attribute)
         RETURN i, collect(DISTINCT {name: a.name, value: a.value}) as attributes`,
        { imageId }
      );

      if (imageQuery.records.length === 0) {
        return null;
      }

      const record = imageQuery.records[0];
      const image = record.get('i').properties;
      const attributes = record.get('attributes');

      return {
        ...image,
        attributes
      };
    });

    return result;
  } finally {
    await session.close();
  }
}
