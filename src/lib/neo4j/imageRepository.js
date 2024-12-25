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
  console.log('Image data:', JSON.stringify({
    filename: imageData.filename,
    contentType: imageData.contentType,
    pHash: imageData.pHash
  }, null, 2));
  console.log('Analysis:', JSON.stringify(analysis, null, 2));
  console.log('Title from analysis:', analysis.title);

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
      console.log('Checking for similar images with pHash:', imageData.pHash);
      const similarImage = await tx.run(`
        MATCH (i:Image)
        WHERE i.pHash IS NOT NULL
        AND i.pHash = $pHash
        RETURN i.id as id
      `, { pHash: imageData.pHash });

      if (similarImage.records.length > 0) {
        console.log('Found similar image:', similarImage.records[0].get('id'));
        return { id: similarImage.records[0].get('id'), isDuplicate: true };
      }

      // Create image node
      console.log('Creating image node...');
      const imageResult = await tx.run(`
        CREATE (i:Image {
          id: randomUUID(),
          title: $title,
          description: $description,
          pHash: $pHash,
          filename: $filename,
          contentType: $contentType,
          createdAt: datetime(),
          updatedAt: datetime()
        })
        RETURN i.id as id
      `, {
        title: analysis.title,
        description: analysis.description,
        pHash: imageData.pHash,
        filename: imageData.filename,
        contentType: imageData.contentType
      });

      const imageId = imageResult.records[0].get('id');
      console.log('Created image node:', imageId);

      // Create relationships for all attributes
      console.log('Creating attribute relationships...');
      
      // Create style relationships
      for (const style of analysis.style || []) {
        const normalizedStyle = normalizeAttribute(style);
        if (normalizedStyle) {
          await tx.run(`
            MERGE (s:Style {name: $style})
            WITH s
            MATCH (i:Image {id: $imageId})
            MERGE (i)-[:HAS_STYLE]->(s)
          `, { style: normalizedStyle, imageId });
        }
      }

      // Create technique relationships
      for (const technique of analysis.technique || []) {
        const normalizedTechnique = normalizeAttribute(technique);
        if (normalizedTechnique) {
          await tx.run(`
            MERGE (t:Technique {name: $technique})
            WITH t
            MATCH (i:Image {id: $imageId})
            MERGE (i)-[:USES_TECHNIQUE]->(t)
          `, { technique: normalizedTechnique, imageId });
        }
      }

      // Create mood relationships
      for (const mood of analysis.mood || []) {
        const normalizedMood = normalizeAttribute(mood);
        if (normalizedMood) {
          await tx.run(`
            MERGE (m:Mood {name: $mood})
            WITH m
            MATCH (i:Image {id: $imageId})
            MERGE (i)-[:HAS_MOOD]->(m)
          `, { mood: normalizedMood, imageId });
        }
      }

      // Create color relationships
      for (const color of analysis.dominantColors || []) {
        const normalizedColor = normalizeAttribute(color);
        if (normalizedColor) {
          await tx.run(`
            MERGE (c:Color {name: $color})
            WITH c
            MATCH (i:Image {id: $imageId})
            MERGE (i)-[:HAS_COLOR]->(c)
          `, { color: normalizedColor, imageId });
        }
      }

      // Create object relationships
      for (const object of analysis.objects || []) {
        const normalizedObject = normalizeAttribute(object);
        if (normalizedObject) {
          await tx.run(`
            MERGE (o:Object {name: $object})
            WITH o
            MATCH (i:Image {id: $imageId})
            MERGE (i)-[:CONTAINS_OBJECT]->(o)
          `, { object: normalizedObject, imageId });
        }
      }

      // Create composition relationships
      for (const composition of analysis.composition || []) {
        const normalizedComposition = normalizeAttribute(composition);
        if (normalizedComposition) {
          await tx.run(`
            MERGE (c:Composition {name: $composition})
            WITH c
            MATCH (i:Image {id: $imageId})
            MERGE (i)-[:USES_COMPOSITION]->(c)
          `, { composition: normalizedComposition, imageId });
        }
      }

      // Create user relationship
      console.log('Creating user relationship...');
      await tx.run(`
        MATCH (i:Image {id: $imageId})
        MATCH (u:User {id: $userId})
        MERGE (u)-[:UPLOADED]->(i)
      `, { imageId, userId });

      return { id: imageId, isDuplicate: false };
    });

    return result;
  } catch (error) {
    console.error('Error saving image data:', error);
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
