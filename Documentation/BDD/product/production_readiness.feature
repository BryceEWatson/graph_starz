Feature: Production Deployment
  As a developer
  I want to deploy Graph Starz to production on Google Cloud
  So that users can access the application securely

  Background:
    Given I have access to the Google Cloud project
    And I have Docker installed locally
    And I have the gcloud CLI configured

  @implemented @file:scripts/prod-deploy-cloud-run.ps1
  Scenario: Secret Validation
    Given I am preparing for deployment
    When I run the secret validation check
    Then it should:
      | Check               | Description                                    | Implementation                    |
      | Required Secrets    | Verify all required secrets exist             | Get-RequiredSecrets function      |
      | Secret Access       | Confirm service account can access secrets    | gcloud secrets access             |
      | Secret Names        | Match environment variable requirements       | $requiredSecrets array            |
      | Type Safety         | Ensure secrets are properly typed             | [hashtable] type enforcement      |
    And the following secrets must be present:
      | Secret Name                    | Description                                  | Status      |
      | NEO4J_URI                     | External Neo4j database connection URI       | Implemented |
      | NEO4J_USER                    | Neo4j database username                      | Implemented |
      | NEO4J_PASSWORD                | Neo4j database password                      | Implemented |
      | GOOGLE_CLIENT_ID              | Google OAuth client ID                       | Implemented |
      | GOOGLE_CLIENT_SECRET          | Google OAuth client secret                   | Implemented |
      | ANTHROPIC_API_KEY             | Anthropic API key for AI services           | Implemented |
      | GCS_BUCKET_NAME               | Google Cloud Storage bucket name            | Implemented |
      | NEXTAUTH_SECRET               | NextAuth.js session encryption key          | Implemented |
      | FRONTEND_URL                  | Base URL for frontend application           | Implemented |
    And the deployment should fail if any required secrets are missing or improperly typed

  @implemented @file:Dockerfile
  Scenario: Docker Container Build
    Given I have a Dockerfile in the project root
    When I build the Docker image
    Then it should:
      | Step                | Description                                          | Implementation                          |
      | Build Stage         | Use multi-stage build for optimization              | FROM node:20-alpine AS builder          |
      | Cache Management    | Optimize dependency caching                         | YARN_CACHE_FOLDER mount                 |
      | Environment         | Handle build vs runtime environment variables       | ARG vs ENV usage                        |
      | Security           | Avoid exposing secrets in final image               | Multi-stage build separation            |
      | Verification       | Validate required directories and builds            | Test directory checks, build validation |
    And the build should fail if any critical checks fail

  @implemented @file:scripts/prod-deploy-cloud-run.ps1
  Scenario: Cloud Run Deployment
    Given I have a validated Docker image
    When I deploy to Cloud Run
    Then it should:
      | Step               | Description                                          | Implementation                          |
      | Image Push         | Push image to Google Container Registry             | docker push with versioning             |
      | Backup            | Create backup of current deployment                  | Automatic backup tag creation           |
      | Version Control   | Use timestamp-based versioning                      | yyyy-MM-dd-HH-mm-ss format              |
      | Cleanup           | Remove old images after successful push             | Image cleanup after verification         |
      | Validation        | Verify deployment success                           | Service health checks                    |
    And the deployment should maintain zero-downtime
    And the deployment should preserve previous version as backup

  @implemented @file:scripts/prod-deploy-cloud-run.ps1
  Scenario: Runtime Configuration
    Given the application is deployed
    When the application starts
    Then it should:
      | Check              | Description                                          | Implementation                          |
      | Environment       | Load correct environment variables                   | Runtime environment variable checks      |
      | API Keys          | Verify API access at runtime                        | Function-level validation                |
      | Connections       | Test database and service connections               | Health check endpoints                   |
      | Initialization    | Verify image processing initialization              | /api/init endpoint                       |
    And the application should fail gracefully if configuration is invalid
    And the initialization process should:
      | Step              | Description                                          | Implementation                          |
      | Firebase         | Verify Firebase Storage connection                   | Test bucket access                      |
      | Neo4j            | Test Neo4j connection and indices                    | Create required indices                 |
      | Image Processing | Process and analyze test images                      | Process sample images                   |
      | Authentication   | Create test user account                             | Create and verify test user             |
    And the initialization should report detailed status for each component
    And the initialization should be idempotent and safe to retry

  @implemented @file:scripts/prod-deploy-cloud-run.ps1
  Scenario: Error Handling and Logging
    Given the application is running in production
    When errors occur during operation
    Then it should:
      | Check              | Description                                          | Implementation                          |
      | Error Format      | Use consistent error message format                 | Standard error response structure        |
      | Error Context     | Include relevant context with errors                | Stack traces and error details           |
      | Error Recovery    | Attempt to recover from transient errors            | Retry mechanisms for API calls           |
      | Error Logging     | Log errors with appropriate severity                | Cloud Logging integration                |
    And error messages should follow the PowerShell guidelines:
      | Rule              | Description                                          | Example                                 |
      | Message Format    | No colons before error variables                    | "Error $_" not "Error: $_"              |
      | Variable Usage    | Use string concatenation                            | "Failed to test $endpoint $_"           |
      | Error Objects     | Capture full error object                           | -ErrorAction Stop                       |
    And all errors should be properly logged to Cloud Logging
