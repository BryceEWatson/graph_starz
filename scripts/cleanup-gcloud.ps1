Write-Host "Cleaning up extra GCloud components..."

function Write-ColorOutput {
    param(
        [string]$Color,
        [string]$Message
    )
    $prevColor = $host.UI.RawUI.ForegroundColor
    $host.UI.RawUI.ForegroundColor = $Color
    Write-Host $Message
    $host.UI.RawUI.ForegroundColor = $prevColor
}

# Clean up in reverse order of creation to handle dependencies
try {
    # 1. Remove forwarding rule
    Write-Host "Removing forwarding rule..."
    gcloud compute forwarding-rules delete graph-starz-https-fwd --global --quiet 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "Green" "✓ Removed forwarding rule"
    }

    # 2. Remove HTTPS proxy
    Write-Host "Removing HTTPS proxy..."
    gcloud compute target-https-proxies delete graph-starz-https-proxy --global --quiet 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "Green" "✓ Removed HTTPS proxy"
    }

    # 3. Remove SSL certificate
    Write-Host "Removing SSL certificate..."
    gcloud compute ssl-certificates delete graph-starz-cert --global --quiet 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "Green" "✓ Removed SSL certificate"
    }

    # 4. Remove URL map
    Write-Host "Removing URL map..."
    gcloud compute url-maps delete graph-starz-urlmap --global --quiet 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "Green" "✓ Removed URL map"
    }

    # 5. Remove backend service
    Write-Host "Removing backend service..."
    gcloud compute backend-services delete graph-starz-backend --global --quiet 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "Green" "✓ Removed backend service"
    }

    # 6. Remove NEG
    Write-Host "Removing network endpoint group..."
    gcloud compute network-endpoint-groups delete graph-starz-neg --region=us-west1 --quiet 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-ColorOutput "Green" "✓ Removed network endpoint group"
    }

    Write-ColorOutput "Green" "`n✓ Cleanup completed successfully"
} catch {
    Write-ColorOutput "Red" "❌ Error during cleanup: $_"
    exit 1
}
