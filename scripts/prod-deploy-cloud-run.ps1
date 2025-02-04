# Production deployment script for Graph Starz
<#
ENVIRONMENT CONFIGURATION GUIDE
-------------------------------
- Credential Loading: Matches src/lib/config/env.js
- Production: Secrets mounted at /etc/secrets/gcs-credentials
- Test: Uses mocked credentials from __mocks__/test-credentials.json
#>
param(
    [switch]$Production,
    [switch]$SkipDeploy,
    [switch]$SkipImageBuild
)

$ErrorActionPreference = "Stop"

# Required secrets for the application (removed GCS credentials since we use service identity)
$RequiredSecrets = @(
    "ANTHROPIC_API_KEY",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "NEO4J_URI",
    "NEO4J_USER",
    "NEO4J_PASSWORD",
    "GCS_BUCKET_NAME",
    "NEXTAUTH_SECRET",
    "AUTO_WHITELISTED_EMAILS",
    "FRONTEND_URL"
)

function Write-Status {
    param($Message, [switch]$err, [switch]$Warning)
    
    $symbol = if ($err) { "❌" } elseif ($Warning) { "⚠️" } else { "✓" }
    $color = if ($err) { "Red" } elseif ($Warning) { "Yellow" } else { "Green" }
    
    Write-Host -ForegroundColor $color "$symbol $Message"
}

# Validate environment and get project ID
$ProjectId = $(gcloud config get-value project 2>$null)
if (-not $ProjectId) {
    Write-Status "No Google Cloud project configured. Run 'gcloud config set project YOUR_PROJECT_ID'" -err
    exit 1
}

# Get all required secrets
$Secrets = @{}
foreach ($secret in $RequiredSecrets) {
    $value = gcloud secrets versions access latest --secret=$secret 2>$null
    if (-not $value) {
        Write-Status "Missing required secret: $secret" -err
        exit 1
    }
    $Secrets[$secret] = $value
}
Write-Status "All required secrets verified"

if (-not $SkipImageBuild) {
    # Build and push Docker image
    $timestamp = Get-Date -Format "yyyyMMddHHmmss"
    $imageTag = "gcr.io/$ProjectId/graph-starz:$timestamp"
    
    # Build args
    $buildArgs = @(
        "build",
        "--progress=plain",
        "-t", $imageTag,
        "-t", "gcr.io/$ProjectId/graph-starz:latest"
    )
    
    # Add build args for secrets
    foreach ($key in $Secrets.Keys) {
        $buildArgs += "--build-arg"
        $buildArgs += "$key=$($Secrets[$key])"
    }
    
    # Build image
    Write-Host "`nBuilding Docker image..."
    $env:DOCKER_BUILDKIT = "1"
    docker @buildArgs . 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Docker build failed" -err
        exit 1
    }
    Write-Status "Docker image built successfully"
    
    # Push image
    Write-Host "`nPushing image to registry..."
    docker push $imageTag
    docker push "gcr.io/$ProjectId/graph-starz:latest"
    Write-Status "Image pushed to registry"
}

if (-not $SkipDeploy) {
    # Deploy to Cloud Run
    Write-Host "`nDeploying to Cloud Run..."
    # Format secrets as KEY=KEY:latest
    $secretsArg = ($RequiredSecrets | ForEach-Object { "$_=$_`:latest" }) -join ","
    
    $deployArgs = @(
        "run", "deploy", "graph-starz",
        "--image=$imageTag",
        "--platform=managed",
        "--region=us-west1",
        "--port=3000",
        "--memory=512Mi",
        "--cpu=1000m",
        "--max-instances=100",
        "--service-account=111362895851-compute@developer.gserviceaccount.com",
        "--set-env-vars=GOOGLE_CLOUD_PROJECT=$ProjectId,NODE_ENV=production,NEXTAUTH_URL=https://graphstarz.com",
        "--set-secrets=$secretsArg"
    )
    
    # Debug output
    Write-Host "Full deploy command:"
    Write-Host "gcloud $($deployArgs -join ' ')"
    
    # Use splatting operator @ to properly expand array arguments
    gcloud @deployArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Status "Deployment failed" -err
        exit 1
    }
    Write-Status "Deployment completed"
    
    # Allow public access (also fix splatting here)
    $policyArgs = @(
        "run", "services", "add-iam-policy-binding", "graph-starz",
        "--region=us-west1",
        "--member=allUsers",
        "--role=roles/run.invoker"
    )
    gcloud @policyArgs 2>&1
    
    # Get service URL (fix splatting here too)
    $describeArgs = @(
        "run", "services", "describe", "graph-starz",
        "--platform=managed",
        "--region=us-west1",
        "--format=value(status.url)"
    )
    $serviceUrl = gcloud @describeArgs 2>$null
    
    if ($serviceUrl) {
        # Simple health check
        try {
            $response = Invoke-WebRequest -Uri "$serviceUrl/api/health" -TimeoutSec 30
            if ($response.StatusCode -eq 200) {
                Write-Status "Service is healthy at $serviceUrl"
            } else {
                Write-Status "Service returned status code $($response.StatusCode)" -Warning
            }
        } catch {
            Write-Status "Deployment failed: $($_.Exception.Message)" -err
            exit 1
        }
    }
}

Write-Status "Deployment process completed"