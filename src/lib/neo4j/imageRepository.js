'use server';

import { getDriver } from './client.js';

export async function saveImageData(imageData, analysis, userId) {
  const driver = await getDriver();
  const session = driver.session();

  try {
    // First transaction: Create index if it doesn't exist
    await session.executeWrite(async (tx) => {
      await tx.run(`
        CREATE INDEX image_phash_idx IF NOT EXISTS
        FOR (i:Image) ON (i.pHash)
      `);
    });

    // Second transaction: Check for duplicates and save image data
    const result = await session.executeWrite(async (tx) => {
      // Check for similar images using database-level comparison
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
        return { id: similarImage.records[0].get('i.id'), isNew: false };
      }

      // Create unique ID for the image
      const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create image node with metadata in a single query
      await tx.run(`
        MATCH (u:User {id: $userId})
        CREATE (i:Image {
          id: $imageId,
          originalName: $originalName,
          title: $title,
          description: $description,
          width: $width,
          height: $height,
          style: $style,
          technique: $technique,
          mood: $mood,
          composition: $composition,
          createdAt: datetime(),
          thumbnailUrl: $thumbnailUrl,
          previewUrl: $previewUrl,
          fullUrl: $fullUrl,
          pHash: $pHash
        })
        CREATE (u)-[:UPLOADED {timestamp: datetime()}]->(i)
        WITH i
        UNWIND $colors as color
        MERGE (c:Color {name: color})
        CREATE (i)-[:HAS_COLOR]->(c)
        WITH i
        UNWIND $objects as object
        MERGE (o:Object {name: object})
        CREATE (i)-[:CONTAINS]->(o)
        RETURN i.id
      `, {
        userId,
        imageId,
        originalName: imageData.metadata.originalName,
        title: analysis.title,
        description: analysis.description,
        width: imageData.metadata.width,
        height: imageData.metadata.height,
        style: analysis.style,
        technique: analysis.technique,
        mood: analysis.mood,
        composition: analysis.composition,
        thumbnailUrl: imageData.images.find(img => img.size === 'thumbnail')?.publicUrl,
        previewUrl: imageData.images.find(img => img.size === 'preview')?.publicUrl,
        fullUrl: imageData.images.find(img => img.size === 'full')?.publicUrl,
        pHash: imageData.metadata.pHash,
        colors: analysis.dominantColors,
        objects: analysis.objects
      });

      return { id: imageId, isNew: true };
    });

    return result;
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

export async function getImageById(imageId) {
  const driver = await getDriver();
  const session = driver.session();

  try {
    const result = await session.executeRead(async (tx) => {
      const imageQuery = await tx.run(
        `MATCH (i:Image {id: $imageId})
         OPTIONAL MATCH (i)-[:HAS_COLOR]->(c:Color)
         OPTIONAL MATCH (i)-[:CONTAINS]->(o:Object)
         RETURN i,
                collect(DISTINCT c.name) as dominantColors,
                collect(DISTINCT o.name) as objects`,
        { imageId }
      );

      if (imageQuery.records.length === 0) {
        return null;
      }

      const record = imageQuery.records[0];
      const image = record.get('i').properties;

      return {
        ...image,
        dominantColors: record.get('dominantColors'),
        objects: record.get('objects')
      };
    });

    return result;
  } finally {
    await session.close();
  }
}
