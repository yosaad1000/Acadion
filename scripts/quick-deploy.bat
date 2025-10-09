@echo off
REM Quick deployment script for development/testing (Windows)
setlocal enabledelayedexpansion

echo 🚀 Quick Deploy - Attendify
echo This script will build and deploy locally for testing

REM Check if .env exists
if not exist ".env" (
    echo 📝 Creating .env from example...
    copy .env.production.example .env
    echo ⚠️  Please edit .env with your actual values before running again
    exit /b 1
)

REM Set default values
if "%DOCKER_USERNAME%"=="" set DOCKER_USERNAME=justs44d
if "%VERSION%"=="" set VERSION=latest

echo Building with:
echo   Username: %DOCKER_USERNAME%
echo   Version: %VERSION%

REM Build images locally
echo 🏗️ Building images...
docker build -f Dockerfile.backend -t %DOCKER_USERNAME%/attendify-backend:%VERSION% .
if errorlevel 1 (
    echo ❌ Backend build failed
    exit /b 1
)

docker build -f Dockerfile.frontend -t %DOCKER_USERNAME%/attendify-frontend:%VERSION% .
if errorlevel 1 (
    echo ❌ Frontend build failed
    exit /b 1
)

REM Deploy locally
echo 🚀 Starting services...
docker-compose -f docker-compose.deploy.yml up -d

echo ⏳ Waiting for services to start...
timeout /t 15 /nobreak >nul

REM Check status
echo 📊 Service status:
docker-compose -f docker-compose.deploy.yml ps

echo.
echo ✅ Quick deployment completed!
echo 🌐 Access your application:
echo   Frontend: http://localhost
echo   Backend: http://localhost:8000
echo   API Docs: http://localhost:8000/docs
echo.
echo 📋 Useful commands:
echo   View logs: docker-compose -f docker-compose.deploy.yml logs -f
echo   Stop: docker-compose -f docker-compose.deploy.yml down