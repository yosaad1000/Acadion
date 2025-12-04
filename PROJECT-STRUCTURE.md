# 📁 Acadion Project Structure

Clean and organized project structure for better maintainability.

## 📂 Main Directories

### Core Application
- **`backend/`** - FastAPI backend application
- **`frontend/`** - React frontend application
- **`face-recognition-service/`** - Face recognition microservice

### Configuration & Deployment
- **`docker-configs/`** - All Docker and docker-compose files
- **`nginx-configs/`** - Nginx configuration files
- **`deployment-scripts/`** - Deployment and setup scripts (.ps1, .sh, .bat)
- **`terraform/`** - Infrastructure as Code

### Database & Scripts
- **`sql-scripts/`** - SQL scripts for Supabase (RLS fixes, diagnostics)
- **`database/`** - Database schemas and migrations
- **`supabase/`** - Supabase configuration

### Documentation & Testing
- **`docs/`** - Main documentation
- **`docs-archive/`** - Archived documentation and guides
- **`test-files/`** - Test scripts and files
- **`scripts/`** - Utility scripts

### CI/CD & Version Control
- **`.github/`** - GitHub Actions workflows
- **`.vercel/`** - Vercel deployment configuration

## 📄 Root Files

### Essential
- `README.md` - Main project documentation
- `QUICKSTART.md` - Quick start guide
- `PROJECT_SUMMARY.md` - Project overview
- `LICENSE` - Project license

### Configuration
- `.gitignore` - Git ignore rules
- `.env.clean` - Clean environment template
- `.env.production.example` - Production env example
- `package-lock.json` - NPM dependencies lock
- `sonar-project.properties` - SonarQube configuration

### Security
- `acadion-key.pem` - SSH key (should be in .gitignore)

## 🗂️ Organized Folders

### `sql-scripts/` Contains:
- RLS policy fixes
- Database diagnostic scripts
- Organization table fixes
- Test SQL scripts

### `docker-configs/` Contains:
- All docker-compose.yml variants
- All Dockerfiles
- .dockerignore

### `deployment-scripts/` Contains:
- PowerShell deployment scripts (.ps1)
- Bash deployment scripts (.sh)
- Batch files (.bat)
- Python deployment helpers (.py)
- SSL setup scripts
- EC2 deployment scripts

### `nginx-configs/` Contains:
- nginx.conf
- nginx-https-config.conf
- nginx-domain.conf
- nginx-config.conf

### `test-files/` Contains:
- Python test files
- HTML test files
- Test documentation
- Test deployment scripts

### `docs-archive/` Contains:
- Deployment guides
- Setup documentation
- Configuration guides
- Historical documentation

## 🎯 Benefits of This Structure

✅ **Clean Root Directory** - Only essential files at root level
✅ **Easy Navigation** - Related files grouped together
✅ **Better Maintainability** - Clear organization
✅ **Scalable** - Easy to add new files in appropriate folders
✅ **Professional** - Industry-standard project structure

## 📝 Notes

- Keep root directory clean - only essential files
- Add new SQL scripts to `sql-scripts/`
- Add new deployment scripts to `deployment-scripts/`
- Add new documentation to `docs/` or `docs-archive/`
- Docker files go in `docker-configs/`
- Test files go in `test-files/`
