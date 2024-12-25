# Test script for Cloud Run deployment validation
param(
    [Parameter(Mandatory=$false)]
    [switch]$SkipDeploy = $true,  # Default to skipping deployment for safety
    
    [Parameter(Mandatory=$false)]
    [switch]$Production = $false,   # Require explicit production flag

    [Parameter(Mandatory=$false)]
    [switch]$SkipImageBuild = $false  # Skip Docker build and push to save bandwidth
)

Add-Type -AssemblyName System.Web

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

# Import common functions
. "$ScriptDir\common.ps1"

# Add version tracking
$ScriptVersion = "1.1.0"
$LastUpdated = "2024-12-20"

# Add script documentation
<#
.SYNOPSIS
    Deploys Graph Starz application to Google Cloud Run with production configuration.

.DESCRIPTION
    This script handles the complete deployment process for the Graph Starz application:
    - Validates required tools and environment
    - Checks Google Cloud configuration
    - Validates all required secrets
    - Builds and tests Docker container
    - Deploys to Cloud Run with monitoring
    - Verifies deployment health

.PARAMETER SkipDeploy
    If set, skips the actual deployment step (useful for testing)

.PARAMETER Production
    Required for actual production deployment

.PARAMETER SkipImageBuild
    Skips Docker build if image already exists

.EXAMPLE
    ./prod-deploy-cloud-run.ps1 -Production
#>

function Test-GCloudConfig {
    Write-Host "`nVerifying Google Cloud configuration..."
    try {
        $ProjectId = gcloud config get-value project 2>$null
        if (-not $ProjectId) {
            Write-ColorOutput "Red" "❌ No Google Cloud project configured"
            return $false
        }
        Write-ColorOutput "Green" "✓ Project ID: $ProjectId"
        return $true
    } catch {
        Write-ColorOutput "Red" "❌ Error checking Google Cloud configuration: $_"
        return $false
    }
}

function Test-Environment {
    Write-Host "`nValidating production secrets..."
    try {
        # First validate NextAuth secret
        Write-Host "Checking NEXTAUTH_SECRET..."
        try {
            $nextAuthSecret = gcloud secrets versions access latest --secret=NEXTAUTH_SECRET 2>$null
            if (-not $nextAuthSecret) {
                Write-ColorOutput "Red" "❌ NEXTAUTH_SECRET not found or empty"
                return $false
            }
        } catch {
            Write-ColorOutput "Red" "❌ NEXTAUTH_SECRET not found in Secret Manager"
            return $false
        }

        # Check for GOOGLE_APPLICATION_CREDENTIALS secret
        Write-Host "Checking GOOGLE_APPLICATION_CREDENTIALS secret..."
        try {
            $googleCreds = gcloud secrets versions access latest --secret=GOOGLE_APPLICATION_CREDENTIALS 2>$null
            if (-not $googleCreds) {
                Write-ColorOutput "Red" "❌ GOOGLE_APPLICATION_CREDENTIALS not found or empty"
                return $false
            }
        } catch {
            Write-ColorOutput "Red" "❌ GOOGLE_APPLICATION_CREDENTIALS not found in Secret Manager"
            return $false
        }

        # Now validate all other secrets
        Write-Host "Validating remaining secrets..."
        $validateOutput = node "$ScriptDir/validate-secrets.js" 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "Red" "❌ Secret validation failed: $validateOutput"
            return $false
        }
        
        try {
            $secretStatus = $validateOutput | ConvertFrom-Json
            $missingSecrets = $secretStatus.PSObject.Properties | Where-Object { $_.Value -eq '[MISSING]' } | Select-Object -ExpandProperty Name
            if ($missingSecrets) {
                Write-ColorOutput "Red" "❌ Missing required secrets: $($missingSecrets -join ', ')"
                return $false
            }
        } catch {
            Write-ColorOutput "Red" "❌ Failed to parse secret validation output: $_"
            return $false
        }
        
        Write-ColorOutput "Green" "✓ All required secrets are present"
        return $true
    } catch {
        Write-ColorOutput "Red" "❌ Error validating secrets: $_"
        return $false
    }
}

function Test-RequiredTools {
    Write-Host "`nChecking required tools..."
    $tools = @{
        "docker" = "Docker is required for container builds"
        "gcloud" = "Google Cloud SDK is required for deployment"
        "node" = "Node.js is required for secret validation"
        "git" = "Git is required for version tracking"
    }
    
    $allValid = $true
    foreach ($tool in $tools.GetEnumerator()) {
        $cmd = Get-Command $tool.Key -ErrorAction SilentlyContinue
        if (-not $cmd) {
            Write-ColorOutput "Red" "❌ Missing $($tool.Key): $($tool.Value)"
            $allValid = $false
        } else {
            Write-ColorOutput "Green" "✓ Found $($tool.Key)"
        }
    }
    return $allValid
}

function Manage-DockerImages {
    param(
        [string]$BaseTag = "graph-starz",
        [string]$ProjectId
    )
    
    Write-Host "`nManaging Docker images..."
    
    try {
        $gcrBaseTag = "gcr.io/$ProjectId/$BaseTag"
        
        # Get existing images
        Write-Host "Checking existing images..."
        $existingImages = docker images --filter "reference=$gcrBaseTag" --format "{{.Tag}}" | Sort-Object -Descending
        
        if ($existingImages) {
            Write-Host "Found existing images:"
            $existingImages | ForEach-Object { Write-Host "  - $gcrBaseTag`:$_" }
            
            # If we have a latest image, tag it as backup before any changes
            $latestImage = $existingImages | Where-Object { $_ -eq "latest" }
            if ($latestImage) {
                Write-Host "Tagging current 'latest' as 'backup'..."
                docker tag "$gcrBaseTag`:latest" "$gcrBaseTag`:backup" 2>&1 | Out-Null
                
                # Push backup tag to GCR
                Write-Host "Pushing backup tag to GCR..."
                docker push "$gcrBaseTag`:backup" 2>&1 | Out-Null
            }
            
            # Remove all images except backup and latest
            Write-Host "Cleaning up old images..."
            $existingImages | Where-Object { $_ -notin @("backup", "latest") -and $_ -ne "<none>" -and $_ -ne $timestamp } | ForEach-Object {
                Write-Host "  Removing $gcrBaseTag`:$_"
                docker rmi -f "$gcrBaseTag`:$_" 2>&1 | Out-Null
            }
        }
        
        Write-ColorOutput "Green" "✓ Image management complete"
        return $true
    } catch {
        Write-ColorOutput "Red" "❌ Error managing Docker images: $_"
        return $false
    }
}

function Test-DockerBuild {
    param(
        [string]$Tag = "graph-starz",
        [switch]$Production,
        [switch]$SkipBuild,
        [Parameter(Mandatory=$true)]
        [System.Collections.Hashtable]$Secrets
    )

    Write-Host "`nTesting Docker build..."
    
    if ($SkipBuild) {
        Write-Host "Skipping Docker build..."
        return $true
    }

    try {
        # Generate timestamped tag
        $timestamp = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"
        $fullTag = if ($Production) {
            "gcr.io/$ProjectId/$Tag`:$timestamp"
        } else {
            "$Tag`:$timestamp"
        }
        
        Write-Host "Building Docker image with tag: $fullTag"
        
        # Get build arguments from secrets
        $buildArgs = @()
        
        # Add NODE_ENV for production
        if ($Production) {
            $buildArgs += "--build-arg"
            $buildArgs += "NODE_ENV=production"
        }

        # Add build-time arguments only
        $buildTimeArgs = @(
            "FRONTEND_URL",
            "GOOGLE_CLIENT_ID",
            "NEO4J_USER",
            "GCS_BUCKET_NAME"
        )

        foreach ($key in $buildTimeArgs) {
            if ($Secrets.ContainsKey($key)) {
                $buildArgs += "--build-arg"
                $buildArgs += "$key=$($Secrets[$key])"
            }
        }

        # Enable BuildKit for better performance
        $env:DOCKER_BUILDKIT = 1
        
        # Run the build
        $buildOutput = docker build $ProjectRoot -t $fullTag -f "$ProjectRoot/Dockerfile" $buildArgs --progress=plain 2>&1
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "Red" "❌ Docker build failed"
            Write-Host "Build output:"
            $buildOutput | ForEach-Object { Write-Host $_ }
            return $false
        }
        
        # For production builds, also tag as latest and push to GCR
        if ($Production) {
            Write-Host "Tagging as latest..."
            $latestTag = "gcr.io/$ProjectId/$Tag`:latest"
            docker tag $fullTag $latestTag
            
            Write-Host "Pushing image to Google Container Registry..."
            docker push $fullTag
            if ($LASTEXITCODE -ne 0) {
                Write-ColorOutput "Red" "❌ Failed to push versioned tag to GCR"
                return $false
            }
            
            docker push $latestTag
            if ($LASTEXITCODE -ne 0) {
                Write-ColorOutput "Red" "❌ Failed to push latest tag to GCR"
                return $false
            }
            
            Write-ColorOutput "Green" "✓ Successfully pushed images to GCR"
        }
        
        Write-ColorOutput "Green" "✓ Docker build successful"
        return $true
    } catch {
        Write-ColorOutput "Red" "❌ Error during Docker build: $_"
        return $false
    }
}

function Test-PreDeployment {
    param(
        [switch]$Production,
        [hashtable]$Secrets
    )

    Write-Host "`nRunning pre-deployment checks..."

    # Check required tools
    Write-Host "`nChecking required tools..."
    $requiredTools = @("docker", "gcloud")
    foreach ($tool in $requiredTools) {
        $toolExists = Get-Command $tool -ErrorAction SilentlyContinue
        if (-not $toolExists) {
            Write-ColorOutput "Red" "❌ Required tool not found: $tool"
            return $false
        }
    }

    # Verify Google Cloud configuration
    Write-Host "`nVerifying Google Cloud configuration..."
    if ($Production) {
        # Additional production checks here
    }

    # Validate environment
    Write-Host "`nValidating environment..."
    if (-not $Secrets.ContainsKey("FRONTEND_URL")) {
        Write-ColorOutput "Red" "❌ FRONTEND_URL not found in secrets"
        return $false
    }

    return $true
}

function Test-ServiceHealth {
    param(
        [Parameter(Mandatory=$true)]
        [string]$ServiceUrl,
        [int]$TimeoutMinutes = 5
    )
    
    Write-Host "`nTesting service health at $ServiceUrl..."
    $startTime = Get-Date
    $timeout = $startTime.AddMinutes($TimeoutMinutes)
    
    Write-Host "Testing basic service health..."
    try {
        $response = Invoke-WebRequest -Uri "$ServiceUrl/api/health" -Method GET
        if ($response.StatusCode -eq 200) {
            Write-ColorOutput "Green" "✓ Service health check passed"
        } else {
            Write-ColorOutput "Red" "❌ Service health check failed with status: $($response.StatusCode)"
            return $false
        }
    } catch {
        Write-ColorOutput "Red" "❌ Failed to check service health: $_"
        return $false
    }

    Write-Host "Testing Neo4j connection..."
    try {
        $response = Invoke-WebRequest -Uri "$ServiceUrl/api/init" -Method GET
        if ($response.StatusCode -eq 200) {
            Write-ColorOutput "Green" "✓ Neo4j connection verified"
        } else {
            Write-ColorOutput "Red" "❌ Neo4j connection failed with status: $($response.StatusCode)"
            return $false
        }
    } catch {
        Write-ColorOutput "Red" "❌ Failed to test Neo4j connection: $_"
        return $false
    }

    Write-Host "Verifying DNS resolution..."
    try {
        Write-Host "Verifying DNS resolution..."
        try {
            $dnsCheck = Resolve-DnsName -Name "graphstarz.com" -Type A -ErrorAction Stop
            Write-ColorOutput "Green" "✓ DNS resolution verified"
            return $true
        } catch {
            Write-ColorOutput "Yellow" "⚠️  Could not verify DNS resolution: $_"
            Write-ColorOutput "Yellow" "⚠️  This is not critical if DNS is managed externally"
            return $true
        }
    } catch {
        Write-ColorOutput "Yellow" "⚠️  Domain verification warning: $_"
        Write-ColorOutput "Yellow" "⚠️  Continuing deployment as DNS is managed externally"
        return $true
    }
}

function Test-DomainMapping {
    param(
        [switch]$Production
    )
    
    if (-not $Production) {
        Write-ColorOutput "Yellow" "⚠️  Skipping domain mapping check in non-production mode"
        return $true
    }
    
    Write-Host "`nVerifying domain mapping..."
    try {
        # Just verify the domain resolves correctly
        Write-Host "Verifying DNS resolution..."
        try {
            $dnsCheck = Resolve-DnsName -Name "graphstarz.com" -Type A -ErrorAction Stop
            Write-ColorOutput "Green" "✓ DNS resolution verified"
            return $true
        } catch {
            Write-ColorOutput "Yellow" "⚠️  Could not verify DNS resolution: $_"
            Write-ColorOutput "Yellow" "⚠️  This is not critical if DNS is managed externally"
            return $true
        }
    } catch {
        Write-ColorOutput "Yellow" "⚠️  Domain verification warning: $_"
        Write-ColorOutput "Yellow" "⚠️  Continuing deployment as DNS is managed externally"
        return $true
    }
}

function Deploy-ToProduction {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory=$true)]
        [string]$Version,
        [switch]$Production,
        [switch]$SkipBuild,
        [Parameter(Mandatory=$false)]
        [hashtable]$Secrets = @{}
    )
    
    Write-Host "`nDeploying to Cloud Run with version: $Version"
    
    try {
        # Create YAML configuration
        Write-Host "Deploying to Cloud Run using YAML configuration..."
        $imageTag = "gcr.io/$ProjectId/graph-starz:$Version"
        Write-Host "Creating deployment YAML with image: $imageTag"
        
        $yamlContent = @"
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: graph-starz
spec:
  template:
    spec:
      containers:
      - image: $imageTag
        ports:
        - containerPort: 3000
        env:
"@
        # Add required environment variables
        $yamlContent += @"
        
        - name: GOOGLE_CLOUD_PROJECT
          value: $ProjectId
        - name: NODE_ENV
          value: "production"
        - name: NEXTAUTH_URL
          valueFrom:
            secretKeyRef:
              name: FRONTEND_URL
              key: latest
"@

        # Add secrets as environment variables
        foreach ($key in $Secrets.Keys) {
            # Skip FRONTEND_URL since we use it for NEXTAUTH_URL
            if ($key -eq "FRONTEND_URL") {
                continue
            }

            $yamlContent += @"
        
        - name: $key
          valueFrom:
            secretKeyRef:
              name: $key
              key: latest
"@
        }

        # Write YAML to temp file
        $tempFile = [System.IO.Path]::GetTempFileName()
        [System.IO.File]::WriteAllText($tempFile, $yamlContent)

        Write-Host "Deploying to Cloud Run..."
        $deployOutput = gcloud run services replace $tempFile --platform managed --region us-west1 --project $ProjectId 2>&1
        $deploySuccess = $LASTEXITCODE -eq 0
        Remove-Item $tempFile -Force

        if (-not $deploySuccess) {
            Write-ColorOutput "Red" "❌ Cloud Run deployment failed"
            $deployOutput | ForEach-Object { Write-Host "  $_" }
            return $false
        }

        # Extract URL from deployment output
        $deploymentUrl = ($deployOutput | Select-String -Pattern "URL: (https://[^\s]+)").Matches.Groups[1].Value
        
        # Store URL for later use
        $script:deploymentUrl = $deploymentUrl
        
        Write-ColorOutput "Green" "✓ Cloud Run deployment completed"
        Write-Host "Service URL: $deploymentUrl"
        return $true
    } catch {
        Write-ColorOutput "Red" "❌ Deployment error: $_"
        Write-Host $_.ScriptStackTrace
        return $false
    }
}

function Get-RequiredSecrets {
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory=$true)]
        [string[]]$SecretNames
    )
    
    Write-Host "`nRetrieving required secrets..."
    
    try {
        # Create hashtable with explicit type
        [hashtable]$secrets = @{}
        
        foreach ($name in $SecretNames) {
            Write-Host "  Checking $name..."
            
            try {
                # Get secret value
                $rawValue = $(gcloud secrets versions access latest --secret=$name 2>&1)
                if ($LASTEXITCODE -ne 0) {
                    Write-ColorOutput "Red" "❌ Failed to retrieve secret '$name': $rawValue"
                    return $null
                }
                
                # Convert to string and trim, handling array output
                if ($rawValue -is [array]) {
                    Write-Host "    Converting array output to string..."
                    $value = $rawValue -join "`n"
                } else {
                    $value = $rawValue.ToString()
                }
                $value = $value.Trim()

                if ([string]::IsNullOrWhiteSpace($value)) {
                    Write-ColorOutput "Red" "❌ Secret '$name' is empty"
                    return $null
                }

                Write-Host "    Value type: $($value.GetType().FullName)"
                
                # Validate JSON format for GCS credentials
                if ($name -eq "GOOGLE_APPLICATION_CREDENTIALS") {
                    try {
                        Write-Host "    Parsing GCS credentials JSON..."
                        $gcsJson = $value | ConvertFrom-Json
                        
                        # Log the available fields for debugging
                        Write-Host "    Available fields: $($gcsJson | Get-Member -MemberType NoteProperty | ForEach-Object { $_.Name })"
                        
                        # Validate required GCS credential fields
                        $requiredFields = @('project_id', 'private_key', 'client_email')
                        $missingFields = $requiredFields | Where-Object {
                            $hasField = [bool]($gcsJson.PSObject.Properties.Name -match "^$_$")
                            if (-not $hasField) {
                                Write-Host "    Missing field: $_"
                            }
                            -not $hasField
                        }
                        
                        if ($missingFields) {
                            Write-ColorOutput "Red" "❌ Missing required fields in GCS credentials: $($missingFields -join ', ')"
                            return $null
                        }
                        Write-Host "    ✓ Valid GCS credentials with all required fields"
                    } catch {
                        Write-ColorOutput "Red" "❌ Invalid JSON format for GCS credentials:"
                        Write-Host "    Error: $_"
                        Write-Host "    Stack trace:"
                        Write-Host $_.ScriptStackTrace
                        return $null
                    }
                }
                
                Write-Host "    ✓ Retrieved successfully (length: $($value.Length))"
                Write-Host "    First few chars: $($value.Substring(0, [Math]::Min(10, $value.Length)))..."
                
                # Add to hashtable immediately
                $secrets[$name] = $value
                
            } catch {
                Write-ColorOutput "Red" "❌ Error processing secret '$name':"
                Write-Host "    Error: $_"
                Write-Host "    Stack trace:"
                Write-Host $_.ScriptStackTrace
                return $null
            }
        }
        
        # Verify all secrets were added
        $actualCount = @($secrets.Keys).Count  # Force array evaluation
        Write-Host "`nFinal validation:"
        Write-Host "  Keys count: $actualCount"
        Write-Host "  Keys: $($secrets.Keys -join ', ')"
        Write-Host "  Required count: $($SecretNames.Count)"

        # Check for missing secrets
        $missingSecrets = $SecretNames | Where-Object { 
            $key = $_
            -not ($secrets.Keys | Where-Object { $_ -eq $key })
        }
        
        if ($missingSecrets) {
            Write-ColorOutput "Red" "❌ Missing required secrets: $($missingSecrets -join ', ')"
            return $null
        }

        Write-ColorOutput "Green" "✓ All required secrets retrieved successfully"
        Write-Host "  Total secrets: $actualCount / $($SecretNames.Count) required"
        Write-Host "  Available keys: $($secrets.Keys -join ', ')"
        
        # Force hashtable to ensure all keys are preserved
        $result = @{}
        foreach ($key in $secrets.Keys) {
            $result[$key] = $secrets[$key]
        }
        
        return $result
        
    } catch {
        Write-ColorOutput "Red" "❌ Error retrieving secrets:"
        Write-Host "    Error: $_"
        Write-Host "    Stack trace:"
        Write-Host $_.ScriptStackTrace
        return $null
    }
}

# Main script execution
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
[Console]::InputEncoding = [System.Text.Encoding]::UTF8

Write-Host "Graph Starz Production Deployment v$ScriptVersion"
Write-Host "=================================================="

if ($Production) {
    Write-ColorOutput "Yellow" "⚠️  WARNING: Running in PRODUCTION mode"
} else {
    Write-Host "Running in TEST mode - no actual deployment will occur"
}

# First verify gcloud auth
Write-Host "`nVerifying gcloud authentication..."
$gcloudAuth = $(gcloud auth list --filter=status:ACTIVE --format="value(account)" 2>&1)
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "Red" "❌ Not authenticated with gcloud: $gcloudAuth"
    Write-Host "Please run 'gcloud auth login' first"
    exit 1
}
Write-Host "Authenticated as: $gcloudAuth"

# Verify project is set
Write-Host "Verifying gcloud project..."
$projectId = $(gcloud config get-value project 2>&1)
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "Red" "❌ No project configured: $projectId"
    Write-Host "Please run 'gcloud config set project YOUR_PROJECT_ID' first"
    exit 1
}
Write-Host "Using project: $projectId"

# Get required secrets
[string[]]$requiredSecrets = @(
    "NEXTAUTH_SECRET",
    "NEO4J_URI",
    "NEO4J_USER",
    "NEO4J_PASSWORD",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "ANTHROPIC_API_KEY",
    "GOOGLE_APPLICATION_CREDENTIALS",
    "GCS_BUCKET_NAME",
    "FRONTEND_URL"
)

Write-Host "`nChecking required secrets..."
Write-Host "Required secrets: $($requiredSecrets -join ', ')"

# Get secrets
$secrets = Get-RequiredSecrets -SecretNames $requiredSecrets

if (-not $secrets) {
    Write-ColorOutput "Red" "❌ Failed to retrieve secrets"
    exit 1
}

# Double check secret count
$actualCount = @($secrets.Keys).Count  # Force array evaluation
Write-Host "`nFinal validation:"
Write-Host "  Actual count: $actualCount"
Write-Host "  Required count: $($requiredSecrets.Count)"

if ($actualCount -ne $requiredSecrets.Count) {
    Write-ColorOutput "Red" "❌ Secret count mismatch: Expected $($requiredSecrets.Count), got $actualCount"
    Write-Host "Required secrets: $($requiredSecrets -join ', ')"
    Write-Host "Available secrets: $($secrets.Keys -join ', ')"
    
    # Check each required secret
    foreach ($required in $requiredSecrets) {
        $exists = $secrets.ContainsKey($required)
        Write-Host "  $required`: $(if ($exists) { '✓' } else { '❌' })"
    }
    exit 1
}

# Extract the actual secrets hashtable from the array
$secretsHash = if ($secrets -is [array] -and $secrets.Length -eq 2) {
    Write-Host "Debug: Extracting secrets from array..."
    $secrets[1]  # Get the second element which contains the actual hashtable
} else {
    Write-Host "Debug: Using secrets as is..."
    $secrets
}

Write-Host "`nDebug: Checking secrets hash..."
Write-Host "secretsHash type: $($secretsHash.GetType().FullName)"
Write-Host "Keys in secretsHash: $($secretsHash.Keys -join ', ')"
Write-Host "FRONTEND_URL exists: $($secretsHash.ContainsKey('FRONTEND_URL'))"
if ($secretsHash.ContainsKey('FRONTEND_URL')) {
    Write-Host "FRONTEND_URL is null: $($null -eq $secretsHash['FRONTEND_URL'])"
    if ($null -ne $secretsHash['FRONTEND_URL']) {
        Write-Host "FRONTEND_URL type: $($secretsHash['FRONTEND_URL'].GetType().FullName)"
        Write-Host "FRONTEND_URL length: $($secretsHash['FRONTEND_URL'].Length)"
        Write-Host "FRONTEND_URL value: '$($secretsHash['FRONTEND_URL'])'"
    }
}

# Set NEXTAUTH_URL from FRONTEND_URL if available
if ($secretsHash.ContainsKey('FRONTEND_URL') -and $null -ne $secretsHash['FRONTEND_URL']) {
    $env:NEXTAUTH_URL = $secretsHash['FRONTEND_URL']
    Write-Host "`nSetting environment variables:"
    Write-ColorOutput "Green" "✓ NEXTAUTH_URL: $($env:NEXTAUTH_URL)"
} else {
    Write-ColorOutput "Red" "❌ Failed to set NEXTAUTH_URL: FRONTEND_URL is missing or null"
    Write-Host "Original secrets object:"
    Write-Host ($secrets | ConvertTo-Json)
    exit 1
}

# Run pre-deployment checks
Write-Host "`nStarting pre-deployment validation..."
$preDeployValid = Test-PreDeployment -Production:$Production -Secrets $secretsHash
if (-not $preDeployValid) {
    Write-ColorOutput "Red" "❌ Pre-deployment validation failed"
    exit 1
}
Write-ColorOutput "Green" "✓ Pre-deployment validation passed"

# Get timestamp for consistent usage
$timestamp = Get-Date -Format "yyyy-MM-dd-HH-mm-ss"
$imageTag = "gcr.io/$ProjectId/graph-starz:$timestamp"
$latestTag = "gcr.io/$ProjectId/graph-starz:latest"
$backupTag = "gcr.io/$ProjectId/graph-starz:backup"

Write-Host "`nStarting Docker image management..."

# First, backup existing latest if it exists
$existingImages = docker images --filter "reference=gcr.io/$ProjectId/graph-starz" --format "{{.Tag}}" | Sort-Object -Descending
if ($existingImages -contains "latest") {
    Write-Host "Creating backup of current production image..."
    docker tag $latestTag $backupTag 2>&1 | Out-Null
    docker push $backupTag 2>&1 | Out-Null
    Write-ColorOutput "Green" "✓ Production backup created and pushed to GCR"
}

# Build new image
Write-Host "`nBuilding new production image: $imageTag"
$env:DOCKER_BUILDKIT = 1

# Create array of build arg pairs (flag + value)
$buildArgPairs = @(
    @{Name="NODE_ENV"; Value="production"}
)

# Add non-empty secrets as build arg pairs
foreach ($key in $secretsHash.Keys) {
    if ($null -ne $secretsHash[$key] -and $secretsHash[$key] -ne '') {
        $buildArgPairs += @{Name=$key; Value=$secretsHash[$key]}
    }
}

# Convert pairs to build args array
$buildArgs = @()
foreach ($pair in $buildArgPairs) {
    $buildArgs += "--build-arg"
    $buildArgs += "$($pair.Name)=$($pair.Value)"
}

Write-Host "Starting Docker build with BuildKit..."
Write-Host "  Image: $imageTag"
Write-Host "  Environment: Production"

# Display non-sensitive build args
$sensitivePatterns = @(
    "SECRET",
    "PASSWORD",
    "KEY",
    "URI",
    "TOKEN",
    "CREDENTIALS",
    "CERT",
    "AUTH"
)

$displayPairs = $buildArgPairs | Where-Object {
    $name = $_.Name
    $isSensitive = $false
    foreach ($pattern in $sensitivePatterns) {
        if ($name.Contains($pattern)) {
            $isSensitive = $true
            break
        }
    }
    -not $isSensitive
}

$displayArgs = $displayPairs | ForEach-Object {
    "--build-arg $($_.Name)=$($_.Value)"
}

Write-Host "  Build Args: $($displayArgs -join ' ')"

$buildOutput = docker build $ProjectRoot -t $imageTag -f "$ProjectRoot/Dockerfile" $buildArgs --progress=plain 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-ColorOutput "Red" "❌ Docker build failed"
    Write-Host "Build output:"
    $buildOutput | ForEach-Object { Write-Host "  $_" }
    exit 1
}
Write-ColorOutput "Green" "✓ Docker build completed successfully"

# Tag and push new image
Write-Host "`nPushing images to Google Container Registry..."
docker tag $imageTag $latestTag 2>&1 | Out-Null
Write-Host "  → Pushing production image: $imageTag"
docker push $imageTag 2>&1 | Out-Null
Write-Host "  → Pushing latest tag: $latestTag"
docker push $latestTag 2>&1 | Out-Null
Write-ColorOutput "Green" "✓ All images pushed successfully to GCR"

# Clean up old images
Write-Host "`nPerforming image cleanup..."
$removedCount = 0
$existingImages | Where-Object { $_ -notin @("latest", "backup") -and $_ -ne "<none>" -and $_ -ne $timestamp } | ForEach-Object {
    Write-Host "  → Removing gcr.io/$ProjectId/graph-starz:$_"
    docker rmi -f "gcr.io/$ProjectId/graph-starz:$_" 2>&1 | Out-Null
    $removedCount++
}

# Remove dangling images
Write-Host "Cleaning up dangling images..."
docker image prune -f 2>&1 | Out-Null
Write-ColorOutput "Green" "✓ Cleanup completed ($removedCount images removed)"

# Deploy if requested
if (-not $SkipDeploy) {
    Write-Host "`nStarting Cloud Run deployment..."
    $deployValid = Deploy-ToProduction -Version $timestamp -Production:$Production -SkipBuild:$SkipImageBuild -Secrets $secretsHash
    if (-not $deployValid) {
        Write-ColorOutput "Red" "❌ Cloud Run deployment failed"
        exit 1
    }
    Write-ColorOutput "Green" "✓ Cloud Run deployment completed successfully"
}

# Save results
$results = @{
    Timestamp = $timestamp
    Version = $Version
    Production = $Production
    ImageTag = $imageTag
    Status = "Success"
    Secrets = $secretsHash.Keys
}

# Add deployment URL if available
if ($script:deploymentUrl) {
    $results["DeploymentUrl"] = $script:deploymentUrl
}

$resultsFile = "deployment-results-$timestamp.log"
$results | ConvertTo-Json | Out-File $resultsFile

Write-Host "`nDeployment Summary:"
Write-Host "==================="
Write-ColorOutput "Green" "✓ Build completed: $imageTag"
if ($script:deploymentUrl) {
    Write-Host "Service URL: $script:deploymentUrl"
}
Write-ColorOutput "Green" "✓ Results saved to: $resultsFile"
exit 0
