'use server';

import Anthropic from '@anthropic-ai/sdk';

const SUPPORTED_MIME_TYPES = ['image/webp', 'image/jpeg', 'image/png', 'image/gif'];

function validateMimeType(mimeType) {
  console.log('Getting Anthropic MIME type for:', mimeType);
  if (!SUPPORTED_MIME_TYPES.includes(mimeType)) {
    throw new Error(`Unsupported MIME type: ${mimeType}. Supported types are: ${SUPPORTED_MIME_TYPES.join(', ')}`);
  }
  return mimeType;
}

export async function analyzeImage(imageData, mimeType = 'image/webp') {
  // Check for API key at runtime
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY environment variable is required');
  }

  // Initialize client with API key
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  console.log('Anthropic API Key:', process.env.ANTHROPIC_API_KEY ? 'Set' : 'Not set');

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

    // Handle both tool_use and tool_calls response types
    const content = message.content[0];
    if (content.type !== 'tool_use' && content.type !== 'tool_calls') {
      throw new Error(`Unexpected response type from Anthropic API: ${content.type}`);
    }

    let toolOutput;
    if (content.type === 'tool_use') {
      // Handle tool_use response type
      if (!content?.name || content.name !== 'extract_image_metadata') {
        throw new Error(`Unexpected tool use: ${content?.name}`);
      }
      toolOutput = content.input;
    } else {
      // Handle tool_calls response type
      const toolCalls = content.tool_calls;
      if (!Array.isArray(toolCalls) || toolCalls.length === 0) {
        throw new Error('No tool calls found in response');
      }

      const toolCall = toolCalls[0];
      if (!toolCall?.name || toolCall.name !== 'extract_image_metadata') {
        throw new Error(`Unexpected tool call: ${toolCall?.name}`);
      }

      if (!toolCall?.output) {
        throw new Error('Invalid or missing tool output');
      }

      // Parse the tool output
      try {
        toolOutput = typeof toolCall.output === 'string' ? JSON.parse(toolCall.output) : toolCall.output;
      } catch (parseError) {
        console.error('Failed to parse tool output:', parseError);
        throw new Error('Invalid tool output format');
      }
    }

    if (!toolOutput || typeof toolOutput !== 'object') {
      throw new Error('Invalid or missing tool output data');
    }

    // Ensure all array fields exist and are arrays
    const defaultArray = [];
    toolOutput.style = Array.isArray(toolOutput.style) ? toolOutput.style : defaultArray;
    toolOutput.technique = Array.isArray(toolOutput.technique) ? toolOutput.technique : defaultArray;
    toolOutput.mood = Array.isArray(toolOutput.mood) ? toolOutput.mood : defaultArray;
    toolOutput.composition = Array.isArray(toolOutput.composition) ? toolOutput.composition : defaultArray;
    toolOutput.dominantColors = Array.isArray(toolOutput.dominantColors) ? toolOutput.dominantColors : defaultArray;
    toolOutput.objects = Array.isArray(toolOutput.objects) ? toolOutput.objects : defaultArray;

    // Ensure string fields exist
    toolOutput.title = toolOutput.title || 'Untitled';
    toolOutput.description = toolOutput.description || '';

    console.log('Extracted metadata:', JSON.stringify(toolOutput, null, 2));
    return toolOutput;
  } catch (error) {
    console.error('Error in analyzeImage:', error);
    throw error;
  }
}
