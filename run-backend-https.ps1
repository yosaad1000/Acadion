#!/usr/bin/env pwsh

# Run backend locally with HTTPS for development
Write-Host "🚀 Starting backend with HTTPS support..." -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "backend/main.py")) {
    Write-Host "❌ Please run this from the project root directory" -ForegroundColor Red
    exit 1
}

# Generate self-signed certificate for localhost
Write-Host "🔐 Generating self-signed certificate..." -ForegroundColor Yellow
if (!(Test-Path "backend/cert.pem")) {
    openssl req -x509 -newkey rsa:4096 -keyout backend/key.pem -out backend/cert.pem -days 365 -nodes -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"
    Write-Host "✅ Certificate generated" -ForegroundColor Green
} else {
    Write-Host "✅ Certificate already exists" -ForegroundColor Green
}

# Update main.py to use HTTPS
$mainPyContent = Get-Content "backend/main.py" -Raw
if ($mainPyContent -notmatch "ssl_keyfile") {
    Write-Host "📝 Updating main.py for HTTPS..." -ForegroundColor Yellow
    
    # Add HTTPS configuration to main.py
    $httpsConfig = @"

# HTTPS Configuration for development
import ssl
ssl_context = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
ssl_context.load_cert_chain('cert.pem', 'key.pem')
"@
    
    # Add to the end of main.py before if __name__ == "__main__"
    $updatedContent = $mainPyContent -replace '(if __name__ == "__main__":)', "$httpsConfig`n`n`$1"
    $updatedContent = $updatedContent -replace 'uvicorn.run\(app, host="0.0.0.0", port=8000\)', 'uvicorn.run(app, host="0.0.0.0", port=8000, ssl_keyfile="key.pem", ssl_certfile="cert.pem")'
    
    Set-Content "backend/main.py" $updatedContent
    Write-Host "✅ main.py updated for HTTPS" -ForegroundColor Green
}

# Start the backend
Write-Host "🚀 Starting HTTPS backend on https://localhost:8000..." -ForegroundColor Cyan
Set-Location backend
python -m uvicorn main:app --host 0.0.0.0 --port 8000 --ssl-keyfile key.pem --ssl-certfile cert.pem --reload

Write-Host ""
Write-Host "📋 Backend running at: https://localhost:8000" -ForegroundColor Green
Write-Host "📋 Update your frontend to use: VITE_API_URL=https://localhost:8000" -ForegroundColor Yellow