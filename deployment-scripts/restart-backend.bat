@echo off
echo Restarting backend with Supabase authentication...

echo Stopping backend containers...
docker-compose -f docker-compose.backend-only.yml down

echo Starting backend containers...
docker-compose -f docker-compose.backend-only.yml up -d

echo Waiting for backend to start...
timeout /t 10 /nobreak > nul

echo Backend restarted! 
echo Backend API: http://localhost:8000
echo Check logs with: docker-compose -f docker-compose.backend-only.yml logs -f backend