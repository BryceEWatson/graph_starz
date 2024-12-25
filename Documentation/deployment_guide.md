# Graph Starz Deployment Guide

## Overview
This guide details the process for deploying Graph Starz to Google Cloud Platform using Docker and Cloud Run.

## Prerequisites
1. Local Development Environment:
   - Node.js and npm installed
   - Docker Desktop installed
   - Google Cloud SDK installed
   - Access to Google Cloud project

2. Google Cloud Setup:
   - Project selected: `gcloud config set project YOUR_PROJECT_ID`
   - Docker configuration: `gcloud auth configure-docker`
   - Required APIs enabled:
     - Cloud Run
     - Container Registry
     - Secret Manager
     - Cloud Logging

3. Domain Configuration:
   - Domain: graphstarz.com
   - DNS Configuration:
     - A Record: Points to 35.197.106.239
     - Name Servers: Google Domains (ns-cloud-a1.googledomains.com)
     - TTL: 300 seconds (5 minutes)
   - Important Note: Domain is configured directly via A record, not using Cloud Run domain mapping
   - DNS Management: Managed by Google Cloud DNS
     - Hostmaster: cloud-dns-hostmaster.google.com
     - Refresh: 6 hours
     - Retry: 1 hour
     - Expire: 3 days

## Deployment Process

### 1. Validating Secrets

Before starting deployment, validate all required secrets:

```bash
# List all secrets in project
gcloud secrets list

# Verify required secrets exist and are accessible
npm run validate-secrets
```

Required secrets (must match .env.example):
- NEO4J_URI (external Neo4j instance)
- NEO4J_USER
- NEO4J_PASSWORD
- GOOGLE_CLOUD_PROJECT
- GOOGLE_APPLICATION_CREDENTIALS
- GCS_BUCKET_NAME
- GOOGLE_CLIENT_ID
- GOOGLE_CLIENT_SECRET
- ANTHROPIC_API_KEY
- NEXTAUTH_SECRET
- FRONTEND_URL (https://graphstarz.com)

The deployment will fail if any required secrets are missing or inaccessible.

### 2. Testing Docker Build

```bash
# Run Docker test script
./scripts/test-docker.ps1

# This will:
# 1. Validate all secrets
# 2. Build production Docker image
# 3. Run container with test configuration
# 4. Verify health checks and initialization
```

### 3. Deploying to Cloud Run

```bash
# Test deployment first
./scripts/test-deploy-cloud-run.ps1

# Deploy to production
./scripts/test-deploy-cloud-run.ps1 -Production -SkipDeploy:$false
```

The deployment script will:
1. Validate all required secrets
2. Build and test Docker image
3. Push to Container Registry
4. Deploy to Cloud Run
5. Verify domain configuration
6. Check service health

Note: The domain configuration uses a static IP through Google Cloud, not Cloud Run's domain mapping. DO NOT create additional domain mappings as this may conflict with the existing setup.

### 4. Verifying Deployment

1. Check Health Endpoint:
```bash
curl https://api.graphstarz.com/api/health
```

2. Check Application Status:
```bash
# Check initialization status
curl -X POST https://api.graphstarz.com/api/init

# Expected response:
{
  "initialized": true,
  "inProgress": false,
  "result": {
    "success": true,
    "gcs": { "success": true, "message": "Firebase Storage connection verified" },
    "neo4j": { "success": true, "errors": [] },
    "images": { "success": true, "processed": 2, "skipped": 0, "errors": 0 },
    "auth": { "success": true, "errors": [], "testUser": { "id": "test-user-1" } }
  }
}
```

3. Monitor Logs:
```bash
# View application logs
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=graph-starz" --limit=50

# Filter for errors
gcloud logging read "resource.type=cloud_run_revision AND severity>=ERROR" --limit=20
```

### 5. Troubleshooting

#### Image Processing Issues
If image processing fails during initialization:
1. Check Anthropic API access
2. Verify Firebase Storage permissions
3. Check Neo4j connection and indices
4. Review error logs for specific failure points

#### Error Message Format
All error messages should follow these guidelines:
- No colons before error variables: `"Error $_"` not `"Error: $_"`
- Use string concatenation: `"Failed to test $endpoint $_"`
- Always capture full error object with `-ErrorAction Stop`

#### Common Issues

1. Neo4j Connection:
```powershell
# Test Neo4j connection
$uri = (Get-Secret NEO4J_URI).Value
$user = (Get-Secret NEO4J_USER).Value
$pass = (Get-Secret NEO4J_PASSWORD).Value
Test-Neo4jConnection -Uri $uri -User $user -Password $pass
```

2. Firebase Storage:
```powershell
# Test Firebase Storage
$bucket = (Get-Secret GCS_BUCKET_NAME).Value
Test-GcsConnection -BucketName $bucket
```

3. Anthropic API:
```powershell
# Test Anthropic API
$key = (Get-Secret ANTHROPIC_API_KEY).Value
Test-AnthropicConnection -ApiKey $key
```

### 6. Maintenance

#### Regular Tasks
1. Monitor error rates and response times
2. Check initialization status daily
3. Review and clean up old Docker images
4. Verify backup retention policy

#### Backup Procedures
1. Database backups are automated daily
2. Docker images are tagged with timestamps
3. Previous deployment is preserved as backup
4. Configuration is version controlled

### 7. Security Notes

1. Secret Management:
   - All secrets are managed through Google Secret Manager
   - Service account has minimal required permissions
   - Secrets are never exposed in Docker images
   - Secret names follow standard format (no project paths)

2. Error Handling:
   - Errors are logged with appropriate context
   - Stack traces are sanitized for production
   - Error messages don't expose sensitive information
   - Failed operations are properly rolled back

3. Monitoring:
   - Error rates are monitored through Cloud Monitoring
   - Initialization status is checked regularly
   - API response times are tracked
   - Resource usage is monitored

Remember: Always run initialization check after deployment and monitor logs for any issues.

## Rollback Procedure

If deployment fails or issues are found:

1. Check deployment status:
```bash
gcloud run services describe graph-starz
```

2. List available revisions:
```bash
gcloud run revisions list --service graph-starz
```

3. Rollback to previous revision:
```bash
gcloud run services rollback graph-starz --to-revision=REVISION_ID
```

## Troubleshooting

1. Secret Access Issues:
   - Verify service account permissions
   - Check secret versions are latest
   - Validate secret names match .env.example

2. Database Connection:
   - Check Neo4j URI is accessible
   - Verify database credentials
   - Test connection from local environment

3. Domain/SSL Issues:
   - Current Configuration:
     - A Record: 35.197.106.239
     - Name Servers: Google Cloud DNS
   - Troubleshooting Steps:
     - Verify A record is correct: `nslookup graphstarz.com`
     - Check DNS propagation: `nslookup -type=NS graphstarz.com`
     - Test domain resolution: `curl -I https://graphstarz.com`
   - Note: Do not modify domain mappings in Cloud Run as domain is configured via direct IP

4. Container Issues:
   - Check container logs
   - Verify resource limits
   - Test locally with test-docker.ps1
