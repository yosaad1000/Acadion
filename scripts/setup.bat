@echo off
echo 🚀 Setting up Student Management Platform...

REM Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker is not installed. Please install Docker first.
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose is not installed. Please install Docker Compose first.
    exit /b 1
)

REM Create environment file if it doesn't exist
if not exist backend\.env (
    echo 📝 Creating environment file...
    copy backend\.env.example backend\.env
    echo ✅ Environment file created. Please edit backend\.env with your configuration.
)

REM Build and start services
echo 🔨 Building and starting services...
docker-compose up --build -d

echo ⏳ Waiting for services to start...
timeout /t 10 /nobreak >nul

echo ✅ Services are running!
echo.
echo 🌐 Access the application:
echo    Web App: http://localhost:3000
echo    API Docs: http://localhost:8000/docs
echo.
echo 📱 For mobile development:
echo    cd mobile ^&^& npm install ^&^& npx expo start