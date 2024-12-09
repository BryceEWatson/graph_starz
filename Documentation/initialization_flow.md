# Initialization Flow Documentation

## Overview

The initialization process ensures that all required services are properly configured and that test data is loaded correctly. This document outlines the initialization flow, state management, and debugging procedures.

## Initialization Components

### 1. State Management (`/lib/init/initCache.js`)
- Maintains initialization state in memory
- Tracks initialization status, progress, results, and errors
- Implements rate limiting and timeout protection
- Prevents concurrent initialization attempts

### 2. API Endpoint (`/api/init/route.js`)
- Handles both GET and POST requests
- GET: Returns current state, triggers initialization if needed
- POST: Forces re-initialization if allowed
- Implements rate limiting via `canAttemptInitialization()`
- Returns detailed status and error information

### 3. Debug Interface (`/debug/init/page.js`)
- Provides visual interface for initialization status
- Shows current state, timestamps, and detailed results
- Allows manual re-initialization
- Auto-polls when initialization is in progress

## Initialization Sequence

### 1. Service Initialization Order

1. **Google Cloud Storage (GCS)**
   - Validates bucket access and permissions
   - Tests duplicate detection with sample image
   - Verifies URL generation
   - Initializes hash prefix cache

2. **Neo4j Database**
   - Verifies connection
   - Validates database access permissions
   - Creates required indexes
   - Creates test user if needed

3. **Auth System**
   - Validates OAuth provider configuration
   - Creates or updates test user
   - Verifies JWT functionality

4. **Image Processing**
   - Validates test images directory
   - Processes test images
   - Verifies image analysis pipeline

### 2. State Tracking

The initialization state includes:
- `initialized`: Boolean indicating if initialization is complete
- `inProgress`: Boolean indicating if initialization is running
- `result`: Detailed results from each initialization step
- `error`: Any error that occurred during initialization
- `lastInitTime`: Timestamp of last successful initialization
- `initStartTime`: Timestamp of current/last attempt

### 3. Rate Limiting

- Minimum interval between attempts: 5 seconds
- Maximum initialization time: 30 seconds
- Auto-reset if initialization times out
- Prevents concurrent initialization attempts

## Usage

### Development Mode

1. Start the application with:
   ```bash
   yarn clean:dev:debug
   ```

2. Access the debug panel at:
   ```
   http://localhost:3000/debug/init
   ```

3. Monitor initialization through:
   - Debug panel UI
   - Console logs (with DEBUG=app:init*)

### Production Mode

- Initialization is triggered via API only
- No debug panel available
- Logs available through your logging system
- Rate limiting still applies

## Error Handling

### Common Issues

1. **Timeout Errors**
   - Check service connectivity
   - Verify environment variables
   - Review service logs

2. **Rate Limiting**
   - Wait 5 seconds between attempts
   - Check for stuck "in progress" state
   - Use debug panel to monitor state

3. **Service-Specific Errors**
   - GCS: Check credentials and bucket permissions
   - Neo4j: Verify connection string and auth
   - Auth: Check OAuth provider configuration
   - Images: Verify test images directory exists

## Debugging

### Using the Debug Panel

1. **Status Monitoring**
   - Green: Successfully initialized
   - Yellow: Initialization in progress
   - Red: Initialization failed

2. **Manual Controls**
   - "Refresh Status": Updates current state
   - "Re-initialize": Forces new initialization
   - Auto-polls every 5 seconds during initialization

3. **Detailed Information**
   - Last initialization time
   - Current attempt start time
   - Full initialization results
   - Error messages if any

### Console Logging

Enable detailed logging with:
```bash
DEBUG=app:init* yarn clean:dev:debug
```

Log namespaces:
- `app:init`: Core initialization
- `app:init:api`: API endpoint
- `app:init:gcs`: GCS initialization
- `app:init:neo4j`: Database initialization
- `app:init:auth`: Auth system
- `app:init:images`: Image processing
