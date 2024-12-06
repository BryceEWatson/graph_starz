'use server';

import Anthropic from '@anthropic-ai/sdk';
import { imageToBase64 } from './imageProcessor.js';

if (!process.env.ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

console.log('Anthropic API Key:', process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not set');

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SUPPORTED_MIME_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif'];

function validateMimeType(mimeType) {
  console.log('Getting Anthropic MIME type for:', mimeType);
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Unsupported MIME type: ${mimeType}. Supported types are: ${SUPPORTED_MIME_TYPES.join(', ')}`);
  }
  return mimeType;
}

export async function analyzeImage(imageData, mimeType = 'image/webp') {
  console.log('Analyzing image...');
  try {
    const validatedMimeType = validateMimeType(mimeType);
    
    // Convert imageData to Buffer if needed
    let imageBuffer;
    if (Buffer.isBuffer(imageData)) {
      imageBuffer = imageData;
    } else if (typeof imageData === 'string') {
      // Assume base64 if string
      imageBuffer = Buffer.from(imageData, 'base64');
    } else if (imageData instanceof Uint8Array) {
      // Handle Uint8Array (common in Node.js streams and Sharp output)
      imageBuffer = Buffer.from(imageData);
    } else if (imageData && typeof imageData === 'object' && imageData.data) {
      // Handle object with data property (e.g., from Sharp or other image processors)
      if (Buffer.isBuffer(imageData.data)) {
        imageBuffer = imageData.data;
      } else if (imageData.data instanceof Uint8Array) {
        imageBuffer = Buffer.from(imageData.data);
      }
    }

    if (!imageBuffer) {
      throw new Error('Invalid image data: Could not convert to Buffer');
    }
    
    // Convert to base64
    const base64Image = imageBuffer.toString('base64');
    
    console.log('Sending request to Anthropic API...');
    const message = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20240620',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [{
          type: 'image',
          source: {
            type: 'base64',
            media_type: validatedMimeType,
            data: base64Image
          }
        }, {
          type: 'text',
          text: 'Analyze this image and provide detailed information about its content, style, and visual elements.'
        }]
      }],
      tools: [{
        name: 'extract_image_metadata',
        description: 'Extract detailed metadata from the analyzed image',
        input_schema: {
          type: 'object',
          properties: {
            style: {
              type: 'string',
              description: 'The dominant artistic style or genre of the image. Be specific but use commonly understood terms.'
            },
            title: {
              type: 'string',
              description: 'A concise, descriptive title for the image that captures its main subject or theme. Should be in title case, between 3-10 words.'
            },
            dominantColors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of dominant colors in the image. Use descriptive color terms that capture the nuance of the colors.'
            },
            objects: {
              type: 'array',
              items: { type: 'string' },
              description: 'Main objects, elements, or subjects in the image using common, general terms.'
            },
            mood: {
              type: 'string',
              description: 'The overall mood, atmosphere, or emotional quality of the image.'
            },
            composition: {
              type: 'string',
              description: 'The compositional structure or layout of the image.'
            },
            technique: {
              type: 'string',
              description: 'The primary artistic or photographic technique used in creating the image.'
            },
            description: {
              type: 'string',
              description: 'A detailed description of the image that captures its key visual elements and overall impact.'
            }
          },
          required: ['style', 'title', 'dominantColors', 'objects', 'mood', 'composition', 'technique', 'description']
        }
      }],
      tool_choice: { type: 'tool', name: 'extract_image_metadata' }
    });

    console.log('Anthropic API Response:', JSON.stringify(message, null, 2));

    if (message.content[0].type !== 'tool_use') {
      throw new Error('Unexpected response type from Anthropic API');
    }

    const toolUse = message.content[0];
    if (toolUse.name !== 'extract_image_metadata') {
      throw new Error(`Unexpected tool use: ${toolUse.name}`);
    }

    return toolUse.input;
  } catch (error) {
    console.error('Error in analyzeImage:', error);
    throw error;
  }
}
