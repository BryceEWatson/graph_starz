# Graph Starz Backend

Node.js backend server for the Graph Starz application.

## Prerequisites

- Docker Desktop
- Node.js 18+ (for local development)
- Yarn package manager
- Neo4j database running in Docker (see ../Neo4j/README.md)

## Environment Setup

1. Copy the environment example file:
   ```bash
   cp .env.example .env
   ```

2. Update the `.env` file with your configuration:
   - Set your Neo4j password
   - Modify other variables as needed

## Local Deployment

1. Ensure Neo4j is running first:
   ```powershell
   cd ../Neo4j
   ./local-deploy.ps1
   ```

2. Deploy the backend:
   ```powershell
   cd scripts
   ./local-deploy.ps1
   ```

## API Endpoints

- `POST /auth` - Authentication endpoint
- `POST /upload` - Protected endpoint for uploading images
- `GET /graph` - Protected endpoint for getting graph data
- `GET /images/:id` - Public endpoint for getting a specific image by ID
- `GET /health` - Basic health check
- `GET /health/ready` - Readiness check with dependency status
