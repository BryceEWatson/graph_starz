# Initialization Flow Documentation

## Overview

The initialization process ensures that all required services are properly configured and that test data is loaded correctly. This document outlines the flow, expectations, and testing procedures.

## Initialization Sequence

### 1. Environment Validation
- Checks for required environment variables:
  - `ANTHROPIC_API_KEY`
  - `GOOGLE_CLOUD_PROJECT`
  - `GOOGLE_APPLICATION_CREDENTIALS`
  - `GCS_BUCKET_NAME`
- Fails fast if any required variable is missing

### 2. Service Initialization

#### 2.1 Firebase Storage (GCS)
1. Validates bucket access and permissions
2. Tests duplicate detection with a sample image
3. Verifies URL generation
4. Initializes hash prefix cache (5-minute TTL)

#### 2.2 Neo4j Database
1. Verifies connection
2. Validates database access permissions
3. Creates required indexes for:
   - Image creation time
   - User properties
4. Creates test user if needed

### 3. Image Processing

#### 3.1 Test Images Directory
1. Validates existence of `test_images` directory
2. Checks for image files to process

#### 3.2 Per-Image Processing
For each image in the test directory:

1. **Duplicate Detection**
   - Checks Neo4j using inline Hamming distance calculation
   - Skips image if duplicate found (threshold: 3 bits)
   - No custom procedures required (AuraDB compatible)

2. **Image Processing** (if not duplicate)
   - Converts to WebP format
   - Creates three size variants:
     - Thumbnail (100px width)
     - Preview (400px width)
     - Full (2048px width)
   - Calculates perceptual hash

3. **GCS Upload**
   - Uses cached hash prefixes for duplicate detection
   - Uploads each size variant with unique filename
   - Stores perceptual hash in metadata
   - Returns public URLs

4. **Image Analysis**
   - Uses Anthropic API to analyze full-size image
   - Extracts metadata (style, objects, colors, etc.)
   - Validates extracted attributes

5. **Neo4j Storage**
   - Creates Image node with metadata
   - Links to User node
   - Dynamically creates and links attribute nodes
   - Attributes are created on demand, no predefined types

## Test Expectations

### Success Cases

1. **First Run (Empty Systems)**
   - All test images should be processed
   - Each image should have 3 size variants in GCS
   - Neo4j should have complete metadata
   - Success count should match number of images

2. **Subsequent Runs**
   - Should detect existing images
   - Skip count should match number of images
   - No new uploads to GCS
   - No new entries in Neo4j

### Error Cases

1. **Missing Environment Variables**
   - Should fail immediately with clear error
   - No partial initialization

2. **GCS Issues**
   - Should fail if bucket inaccessible
   - Should fail if upload permissions missing

3. **Neo4j Issues**
   - Should fail if database unreachable
   - Should fail if write permissions missing

4. **Image Processing Issues**
   - Should log error for problematic image
   - Should continue processing other images
   - Should report error count accurately

## Manual Testing Procedure

1. **Prerequisites Check**
   ```bash
   # Verify environment variables
   echo $ANTHROPIC_API_KEY
   echo $GOOGLE_CLOUD_PROJECT
   echo $GOOGLE_APPLICATION_CREDENTIALS
   echo $GCS_BUCKET_NAME
   ```

2. **Clean State Test**
   ```bash
   # Clear existing data
   yarn db:reset
   
   # Run initialization
   yarn clean:dev:debug
   
   # Expected: All images processed successfully
   ```

3. **Rerun Test**
   ```bash
   # Run initialization again
   yarn clean:dev:debug
   
   # Expected: All images skipped as duplicates
   ```

4. **Error Handling Test**
   ```bash
   # Test missing env var
   unset ANTHROPIC_API_KEY
   yarn clean:dev:debug
   # Expected: Clear error about missing API key
   
   # Test invalid image
   cp invalid.txt test_images/invalid.png
   yarn clean:dev:debug
   # Expected: Error for invalid image, success for valid ones
   ```

## Monitoring and Debugging

### Debug Logs
The initialization process uses the debug module with namespace `app:init*`:
- `app:init` - Main initialization flow
- `app:init:gcs` - GCS initialization and operations
- `app:init:images` - Image processing operations
- `app:init:api` - API initialization and calls

### Key Metrics
1. Processing counts:
   - Successfully processed images
   - Skipped duplicates
   - Errors encountered

2. Timing information:
   - Total initialization time
   - Per-image processing time
   - Service initialization times

## Rerunnability

The initialization process is designed to be idempotent:
- Safe to run multiple times
- Detects and skips duplicates
- Maintains data consistency between GCS and Neo4j
- No duplicate entries or orphaned data

### Reset Process
To reset the system for fresh initialization:
1. Use `yarn db:reset` to clear Neo4j data
2. Clear GCS bucket manually if needed
3. Remove or replace test images as needed

## Troubleshooting

### Common Issues

1. **Duplicate Detection Too Strict**
   - Check `SIMILARITY_THRESHOLD` in GCS code
   - Default: 3 (95% similarity required)
   - Adjust if needed for your use case

2. **Cache Issues**
   - GCS hash prefix cache TTL: 5 minutes
   - Clear browser cache if web UI issues
   - Restart server if needed

3. **Performance Issues**
   - Monitor Neo4j query times
   - Check GCS API quotas
   - Verify network connectivity

### Support

For issues or questions:
1. Check debug logs (`app:init*`)
2. Verify environment variables
3. Check service status (GCS, Neo4j)
4. Review error messages for specific guidance
