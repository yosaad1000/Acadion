@echo off
echo Starting Integration Tests in Docker...

REM Check if .env file exists
if not exist "backend\.env" (
    echo Error: backend\.env file not found. Please create it from backend\.env.example
    exit /b 1
)

REM Clean up any existing test containers
echo Cleaning up existing test containers...
docker-compose -f docker-compose.test.yml down -v

REM Build and start test environment
echo Building and starting test environment...
docker-compose -f docker-compose.test.yml up --build --abort-on-container-exit

REM Check exit code
if %ERRORLEVEL% equ 0 (
    echo Integration tests completed successfully!
) else (
    echo Integration tests failed!
)

REM Clean up
echo Cleaning up test containers...
docker-compose -f docker-compose.test.yml down -v

REM Copy test reports if they exist
if exist "test_reports\integration_test_report.txt" (
    echo Test report available at: test_reports\integration_test_report.txt
    type test_reports\integration_test_report.txt
)

exit /b %ERRORLEVEL%