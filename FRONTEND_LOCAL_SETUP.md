# Frontend Local Development Setup

This guide shows how to run the frontend locally while keeping the backend in Docker.

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Docker and Docker Compose

## Quick Start

### Option 1: Using the Setup Script (Windows)

```bash
# Run the automated setup script
./run-frontend-local.bat
```

### Option 2: Using the Setup Script (Linux/Mac)

```bash
# Make the script executable (Linux/Mac only)
chmod +x run-frontend-local.sh

# Run the automated setup script
./run-frontend-local.sh
```

### Option 3: Manual Setup

1. **Start Backend Services (Docker)**
   ```bash
   docker-compose -f docker-compose.backend-only.yml up -d
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd frontend
   npm install
   ```

3. **Start Frontend Development Server**
   ```bash
   npm run dev
   ```

## Access URLs

- **Frontend**: http://localhost:5173 (Vite dev server)
- **Backend API**: http://localhost:8000
- **Redis**: localhost:6379

## Stopping Services

1. **Stop Frontend**: Press `Ctrl+C` in the terminal running the frontend
2. **Stop Backend**: 
   ```bash
   docker-compose -f docker-compose.backend-only.yml down
   ```

## Troubleshooting

### Port Conflicts
- If port 5173 is busy, Vite will automatically use the next available port
- If port 8000 is busy, stop other services or change the backend port in docker-compose.backend-only.yml

### Database Connection Issues
- Make sure you've run the database migration scripts in Supabase
- Check that the Supabase URL and keys are correct in `frontend/src/lib/supabase.ts`

### Authentication Issues
- Run the `database/fix_loading_issue.sql` script in Supabase SQL console first
- Clear browser cache and localStorage
- Check browser console for errors

## Development Benefits

Running frontend locally provides:
- ✅ Hot reload for instant changes
- ✅ Better debugging with source maps
- ✅ Faster development cycle
- ✅ Access to browser dev tools
- ✅ No Docker build time for frontend changes

## File Structure

```
├── docker-compose.backend-only.yml  # Backend + Redis only
├── run-frontend-local.bat          # Windows setup script
├── run-frontend-local.sh           # Linux/Mac setup script
└── frontend/
    ├── src/
    ├── package.json
    └── vite.config.ts
```