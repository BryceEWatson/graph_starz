# API Endpoints

## Core Endpoints

### Health Check
```
GET /health
```
Response:
```json
{
    "status": "healthy",
    "timestamp": "2024-12-02T20:00:00.000Z",
    "environment": "development",
    "version": "1.0.0"
}
```

### Authentication Status
```
GET /auth/status
```
Response:
```json
{
    "authenticated": false,
    "message": "Authentication not implemented yet",
    "timestamp": "2024-12-02T20:00:00.000Z"
}
```

### Graph Data
```
GET /graph
```
Response:
```json
{
    "users": [
        {
            "userId": "user123",
            "createdAt": "2024-12-02T20:00:00.000Z",
            "lastLogin": "2024-12-02T20:00:00.000Z",
            "images": [
                {
                    "imageId": "image123",
                    "uploadedAt": "2024-12-02T20:00:00.000Z",
                    "url": "https://storage.googleapis.com/sample/image1.jpg",
                    "status": "processed",
                    "attributes": [
                        {
                            "type": "object",
                            "value": "mountain"
                        },
                        {
                            "type": "technique",
                            "value": "oil_painting"
                        }
                    ]
                }
            ]
        }
    ],
    "root": "root"
}
```

### Upload Status
```
GET /upload/status
```
Response:
```json
{
    "status": "ready",
    "maxFileSize": "10MB",
    "supportedTypes": ["image/jpeg", "image/png"],
    "timestamp": "2024-12-02T20:00:00.000Z"
}
```

## Response Validation

During local deployment (`Backend/scripts/local-deploy.ps1`), all endpoint responses are automatically saved as JSON files in the `Backend/test-results` directory:
- `health.json`
- `auth.json`
- `graph.json`
- `upload.json`

These files serve as both documentation and validation of the API responses. The deployment script will fail if any endpoint returns an unexpected response structure.

## Graph Data Structure

The graph endpoint returns a nested structure that matches the Neo4j database schema defined in `graph_structure.md`:

1. Users are the top-level entities, each containing:
   - Basic user information (userId, timestamps)
   - Array of uploaded images

2. Each image contains:
   - Basic image information (imageId, url, status)
   - Array of attributes

3. Attributes are simple type-value pairs that can be shared across images

4. The root node is referenced but not expanded since it's a static entity

This structure allows the frontend to:
1. Display the complete graph for a user
2. Show relationships between images and attributes
3. Support filtering and visualization features
