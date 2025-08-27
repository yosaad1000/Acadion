Write-Host "Starting Student Management System - Frontend Only (Local)" -ForegroundColor Green
Write-Host "========================================================" -ForegroundColor Green

Write-Host ""
Write-Host "Step 1: Starting backend services (Docker)..." -ForegroundColor Yellow
docker-compose -f docker-compose.backend-only.yml up -d

Write-Host ""
Write-Host "Step 2: Waiting for backend to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host ""
Write-Host "Step 3: Installing frontend dependencies..." -ForegroundColor Yellow
Set-Location frontend
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error installing dependencies. Please check your Node.js installation." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Step 4: Starting frontend development server..." -ForegroundColor Yellow
Write-Host "Frontend will be available at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "Backend API will be available at: http://localhost:8000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the frontend server" -ForegroundColor Magenta
Write-Host ""

npm run dev

Write-Host ""
Write-Host "Frontend stopped. To stop backend services, run:" -ForegroundColor Yellow
Write-Host "docker-compose -f docker-compose.backend-only.yml down" -ForegroundColor Cyan