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
      max_tokens: 4096,
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
          text: `Analyze this image focusing on specific, atomic details. You MUST identify at least 5 distinct attributes across different categories.

Required Analysis Steps:
1. First scan: Identify the most obvious visual elements (colors, objects, composition)
2. Second scan: Look for artistic techniques and stylistic choices
3. Third scan: Consider the mood and emotional impact
4. Final scan: Look for any subtle or unique details you might have missed

Primary Categories (try to use these whenever possible):
- color: Specific colors and tones (e.g., "azure", "mauve", "crimson")
- object: Physical elements and subjects (e.g., "humanoid_figure", "crystal_formation", "ornate_frame")
- composition: Layout and arrangement (e.g., "rule_of_thirds", "central_focus", "diagonal_lines")
- technique: Artistic methods and styles (e.g., "digital_painting", "photorealism", "chiaroscuro")
- mood: Emotional qualities (e.g., "ethereal", "ominous", "serene")
- style: Overall artistic approach (e.g., "impressionist", "surrealist", "minimalist")
- lighting: Light characteristics (e.g., "dramatic_shadows", "soft_glow", "rim_lighting")
- texture: Surface qualities (e.g., "rough_stone", "smooth_glass", "grainy_film")
- pattern: Repeating elements (e.g., "geometric_grid", "organic_swirls", "dotted_pattern")
- perspective: Viewpoint and depth (e.g., "birds_eye_view", "forced_perspective", "isometric")

Guidelines for attributes:
1. Be as specific as possible (e.g., "crimson" instead of "red")
2. Use underscores for multi-word terms (e.g., "digital_painting")
3. Focus on observable characteristics rather than interpretations
4. Consider the whole image, not just the main subject
5. Avoid using "other" as a category - try to fit attributes into the primary categories, or create a meaningful new category if truly needed
6. If creating a new category, make it specific and reusable (e.g., "movement", "symbolism", "time_period")

For each attribute, explain:
- Exactly where in the image this attribute appears
- Why you chose this specific term over similar alternatives
- How prominent or significant this element is (0-1 scale)

For the description:
1. Write at least 3-4 detailed sentences (aim for 300-500 characters)
2. Start with the main subject and its key characteristics
3. Describe the composition and how elements relate to each other
4. Include details about the mood, lighting, and artistic techniques
5. Mention any unique or subtle details that add depth to the image
6. Use specific, evocative language that brings the image to life
7. Consider both the technical and emotional aspects of the image`
        }]
      }],
      tools: [{
        name: 'extract_image_metadata',
        description: 'Extract detailed metadata from the analyzed image. Each attribute should be as specific and atomic as possible.',
        input_schema: {
          type: 'object',
          properties: {
            attributes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  category: {
                    type: 'string',
                    description: 'The category of the attribute. Use the most appropriate category from the primary list, or create a meaningful new category if truly needed. Avoid using "other".',
                    examples: [
                      'color',      // For specific colors and tones
                      'object',     // For physical elements and subjects
                      'composition',// For layout and arrangement
                      'technique',  // For artistic methods
                      'mood',       // For emotional qualities
                      'style',      // For overall artistic approach
                      'lighting',   // For light characteristics
                      'texture',    // For surface qualities
                      'pattern',    // For repeating elements
                      'perspective' // For viewpoint and depth
                    ]
                  },
                  value: {
                    type: 'string',
                    description: `The most specific, atomic value possible. Examples by category:
                      - style: impressionist, modern, abstract, pixel_art, voxel_art
                      - color: crimson, navy_blue, forest_green, mauve, periwinkle
                      - mood: peaceful, energetic, mysterious, melancholic
                      - technique: digital_painting, oil_painting, watercolor, vector_art
                      - object: tree, mountain, car, building (be as specific as possible)
                      - composition: rule_of_thirds, leading_lines, golden_ratio
                      These are just examples - use any specific term that best describes the element.`
                  },
                  context: {
                    type: 'string',
                    description: 'Where and how this attribute appears in the image',
                    examples: [
                      "Crimson appears in the sunset sky, creating a dramatic backdrop",
                      "Rule of thirds applied to position of the mountain peak",
                      "Digital painting technique evident in brush strokes on the character"
                    ]
                  },
                  prominence: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1,
                    description: 'How prominent this attribute is in the image (0-1)'
                  },
                  reasoning: {
                    type: 'string',
                    description: 'Why this specific term was chosen',
                    examples: [
                      "The red hue precisely matches crimson, being darker than scarlet but lighter than maroon",
                      "The composition clearly follows rule of thirds with key elements at intersection points",
                      "The brush strokes show characteristics unique to digital painting tools"
                    ]
                  }
                },
                required: ['category', 'value', 'context', 'prominence', 'reasoning']
              }
            },
            title: {
              type: 'string',
              description: 'A concise, descriptive title for the image that captures its main subject or theme. Should be in title case, between 3-10 words.'
            },
            description: {
              type: 'string',
              description: 'A detailed description of the image that captures its key visual elements and overall impact. Keep the description between 200-300 characters for optimal display. Focus on the most striking and important elements rather than trying to describe everything.',
              maxLength: 600
            }
          },
          required: ['attributes', 'title', 'description']
        }
      }],
      tool_choice: { type: 'tool', name: 'extract_image_metadata' }
    });

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

      // Parse and validate the tool output
      try {
        const metadata = typeof toolCall.output === 'string' ? JSON.parse(toolCall.output) : toolCall.output;

        // Validate the extracted metadata
        const validateMetadata = (metadata) => {
          if (!metadata.attributes || !Array.isArray(metadata.attributes)) {
            throw new Error('No attributes array in metadata');
          }

          if (metadata.attributes.length < 5) {
            throw new Error(`Insufficient attributes: got ${metadata.attributes.length}, need at least 5`);
          }

          // Count attributes by category
          const categoryCounts = metadata.attributes.reduce((counts, attr) => {
            counts[attr.category] = (counts[attr.category] || 0) + 1;
            return counts;
          }, {});

          // Check minimum requirements
          const requirements = {
            color: 1,
            object: 1,
            composition: 1,
            technique: 1,
            mood: 1
          };

          const missing = Object.entries(requirements)
            .filter(([category, min]) => (categoryCounts[category] || 0) < min)
            .map(([category]) => category);

          if (missing.length > 0) {
            throw new Error(`Missing required attributes for categories: ${missing.join(', ')}`);
          }

          return metadata;
        };

        toolOutput = validateMetadata(metadata);
      } catch (error) {
        console.error('Metadata validation failed:', error);
        throw new Error(`Invalid metadata: ${error.message}`);
      }
    }

    if (!toolOutput || typeof toolOutput !== 'object') {
      throw new Error('Invalid or missing tool output data');
    }

    // Ensure all array fields exist and are arrays
    const defaultArray = [];
    toolOutput.attributes = Array.isArray(toolOutput.attributes) ? toolOutput.attributes : defaultArray;

    // Ensure string fields exist
    toolOutput.title = toolOutput.title || 'Untitled';
    toolOutput.description = toolOutput.description || '';

    return toolOutput;
  } catch (error) {
    console.error('Error in analyzeImage:', error);
    throw error;
  }
}
