param([switch]$SkipDeploy = $false)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

function Write-ColorOutput {
    param($Color, $Message)
    $prevColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $Color
    Write-Output $Message
    $host.UI.RawUI.ForegroundColor = $prevColor
}

function Test-RequiredTools {
    Write-Host "`nVerifying required tools..."
    $tools = @("node", "docker", "gcloud")
    foreach ($tool in $tools) {
        try {
            $null = Get-Command $tool -ErrorAction Stop
            Write-ColorOutput "Green" "✓ $tool is installed"
        } catch {
            Write-ColorOutput "Red" "❌ $tool is not installed"
            return $false
        }
    }
    return $true
}

function Test-GCloudConfig {
    Write-Host "`nVerifying Google Cloud configuration..."
    try {
        $ProjectId = gcloud config get-value project 2>$null
        if (-not $ProjectId) {
            Write-ColorOutput "Red" "❌ No project configured"
            return $false
        }
        Write-ColorOutput "Green" "✓ Project: $ProjectId"
        return $true
    } catch {
        Write-ColorOutput "Red" "❌ Config error: $_"
        return $false
    }
}

function Test-Environment {
    Write-Host "`nValidating environment..."
    try {
        $result = node "$ScriptDir/validate-env.js" --production
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "Red" "❌ Validation failed"
            return $false
        }
        Write-ColorOutput "Green" "✓ Validation passed"
        return $true
    } catch {
        Write-ColorOutput "Red" "❌ Error: $_"
        return $false
    }
}

function Test-DockerBuild {
    Write-Host "`nTesting Docker build..."
    try {
        docker build -t graph-starz .
        if ($LASTEXITCODE -ne 0) {
            Write-ColorOutput "Red" "❌ Build failed"
            return $false
        }
        Write-ColorOutput "Green" "✓ Build passed"
        return $true
    } catch {
        Write-ColorOutput "Red" "❌ Error: $_"
        return $false
    }
}

Write-Host "Starting tests at $(Get-Date)"
Write-Host "========================="

$testsPassed = $true

$toolsValid = Test-RequiredTools
if (-not $toolsValid) {
    $testsPassed = $false
    exit 1
}

$gcloudValid = Test-GCloudConfig
if (-not $gcloudValid) {
    $testsPassed = $false
    exit 1
}

$envValid = Test-Environment
if (-not $envValid) {
    $testsPassed = $false
    if (-not $SkipDeploy) { exit 1 }
}

$dockerValid = Test-DockerBuild
if (-not $dockerValid) {
    $testsPassed = $false
    if (-not $SkipDeploy) { exit 1 }
}

Write-Host "`nTest Results:"
Write-Host "============="
Write-Host "Tools: $(if ($toolsValid) { '✓' } else { '❌' })"
Write-Host "GCloud: $(if ($gcloudValid) { '✓' } else { '❌' })"
Write-Host "Env: $(if ($envValid) { '✓' } else { '❌' })"
Write-Host "Docker: $(if ($dockerValid) { '✓' } else { '❌' })"

if ($testsPassed) {
    Write-Host "`nAll tests passed!"
    exit 0
} else {
    Write-Host "`nSome tests failed."
    exit 1
}
