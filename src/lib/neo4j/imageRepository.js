'use server';

import { getDriver } from './client.js';

export async function saveImageData(imageData, analysis, userId) {
  const driver = await getDriver();
  const session = driver.session();

  try {
    const result = await session.executeWrite(async (tx) => {
      // First check if image already exists
      const existingImage = await tx.run(
        `MATCH (i:Image {originalName: $originalName}) 
         RETURN i`,
        { originalName: imageData.metadata.originalName }
      );

      if (existingImage.records.length > 0) {
        return { id: existingImage.records[0].get('i').properties.id, isNew: false };
      }

      // Create unique ID for the image
      const imageId = `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create image node with metadata
      await tx.run(
        `MATCH (u:User {id: $userId})
         CREATE (i:Image {
          id: $imageId,
          originalName: $originalName,
          title: $title,
          description: $description,
          width: $width,
          height: $height,
          originalFormat: $format,
          style: $style,
          mood: $mood,
          composition: $composition,
          technique: $technique,
          createdAt: datetime()
         })
         CREATE (u)-[:UPLOADED {timestamp: datetime()}]->(i)
         RETURN i`,
        {
          userId,
          imageId,
          originalName: imageData.metadata.originalName,
          title: analysis.title,
          description: analysis.description,
          width: imageData.metadata.width,
          height: imageData.metadata.height,
          format: imageData.metadata.format,
          style: analysis.style,
          mood: analysis.mood,
          composition: analysis.composition,
          technique: analysis.technique
        }
      );

      // Create and link color nodes
      for (const color of analysis.dominantColors) {
        await tx.run(
          `MERGE (c:Color {name: $color})
           WITH c
           MATCH (i:Image {id: $imageId})
           MERGE (i)-[:HAS_COLOR]->(c)`,
          { color, imageId }
        );
      }

      // Create and link object nodes
      for (const object of analysis.objects) {
        await tx.run(
          `MERGE (o:Object {name: $object})
           WITH o
           MATCH (i:Image {id: $imageId})
           MERGE (i)-[:CONTAINS]->(o)`,
          { object, imageId }
        );
      }

      return { id: imageId, isNew: true };
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
