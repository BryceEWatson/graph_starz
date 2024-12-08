'use server';

import Anthropic from '@anthropic-ai/sdk';

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
        description: 'Extract detailed metadata from the analyzed image. Each attribute should be atomic (single concept) to enable better connections between images.',
        input_schema: {
          type: 'object',
          properties: {
            style: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of distinct artistic styles present in the image. Each style should be a single, atomic term (e.g. ["impressionist", "modern"] not "impressionist with modern elements").'
            },
            title: {
              type: 'string',
              description: 'A concise, descriptive title for the image that captures its main subject or theme. Should be in title case, between 3-10 words.'
            },
            dominantColors: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of distinct colors in the image. Each color should be a single, specific term (e.g. ["navy blue", "crimson"] not "various shades of blue").'
            },
            objects: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of distinct objects or elements in the image. Each object should be a single, specific term (e.g. ["tree", "mountain"] not "tree near a mountain").'
            },
            mood: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of distinct moods or emotions conveyed by the image. Each mood should be a single term (e.g. ["peaceful", "mysterious"] not "peaceful and mysterious").'
            },
            composition: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of distinct compositional techniques used in the image. Each technique should be a single term (e.g. ["rule of thirds", "leading lines"] not "rule of thirds with leading lines").'
            },
            technique: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of distinct artistic or photographic techniques used. Each technique should be a single term (e.g. ["digital compositing", "color grading"] not "digital compositing with color grading").'
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

    if (!message?.content?.[0]) {
      throw new Error('Empty or invalid response from Anthropic API');
    }

    if (message.content[0].type !== 'tool_use') {
      throw new Error(`Unexpected response type from Anthropic API: ${message.content[0].type}`);
    }

    const toolUse = message.content[0];
    if (!toolUse?.name || toolUse.name !== 'extract_image_metadata') {
      throw new Error(`Unexpected tool use: ${toolUse?.name}`);
    }

    if (!toolUse?.input || typeof toolUse.input !== 'object') {
      throw new Error('Invalid or missing tool input');
    }

    // Ensure all array fields exist and are arrays
    const input = toolUse.input;
    const defaultArray = [];
    input.style = Array.isArray(input.style) ? input.style : defaultArray;
    input.technique = Array.isArray(input.technique) ? input.technique : defaultArray;
    input.mood = Array.isArray(input.mood) ? input.mood : defaultArray;
    input.composition = Array.isArray(input.composition) ? input.composition : defaultArray;
    input.dominantColors = Array.isArray(input.dominantColors) ? input.dominantColors : defaultArray;
    input.objects = Array.isArray(input.objects) ? input.objects : defaultArray;

    // Ensure string fields exist
    input.title = input.title || 'Untitled';
    input.description = input.description || '';

    return input;
  } catch (error) {
    console.error('Error in analyzeImage:', error);
    throw error;
  }
}
