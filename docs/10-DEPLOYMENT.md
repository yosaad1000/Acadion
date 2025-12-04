# 🚀 Deployment Architecture

## How Acadion is Deployed

### Production Setup

```
User Browser
    ↓
Vercel (Frontend)
    ↓
AWS EC2 (Backend)
    ↓
Supabase (Database)
```

### Frontend Deployment (Vercel)

**What is Vercel?**
- Cloud platform for frontend hosting
- Automatic HTTPS
- Global CDN (fast worldwide)
- Auto-deploys from GitHub

**Deployment Process:**
1. Push code to GitHub
2. Vercel detects changes
3. Builds React app (`npm run build`)
4. Deploys to edge network
5. Available at: acadion-gamma.vercel.app

**Environment Variables:**
- VITE_SUPABASE_URL
- VITE_SUPABASE_ANON_KEY
- VITE_API_URL (backend URL)

### Backend Deployment (AWS EC2)

**What is EC2?**
- Virtual server in the cloud
- Runs Ubuntu Linux
- Hosts FastAPI backend

**Deployment Process:**
1. SSH into EC2 server
2. Pull latest code from GitHub
3. Build Docker image
4. Run container with docker-compose
5. Nginx reverse proxy handles requests

**Docker Setup:**
```yaml
# docker-compose.yml
services:
  backend:
    build: .
    ports:
      - "8000:8000"
    env_file:
      - .env
  
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    
    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
    }
}
```

### Database (Supabase)

**What is Supabase?**
- Managed PostgreSQL database
- Built-in authentication
- Real-time subscriptions
- Auto-generated REST API

**Connection:**
- Backend connects via SUPABASE_URL
- Uses service_role key for admin access
- Frontend uses anon key for user access

### CI/CD Pipeline (GitHub Actions)

**File:** `.github/workflows/deploy.yml`

**Automated Process:**
1. Code pushed to main branch
2. GitHub Actions triggers
3. Runs tests
4. Builds Docker image
5. Deploys to EC2
6. Vercel auto-deploys frontend

**Benefits:**
- No manual deployment
- Consistent process
- Automatic testing
- Fast iterations
