# CI/CD Guidelines for Acadion

## Overview

Acadion uses a comprehensive CI/CD pipeline with GitHub Actions to automatically test, build, and deploy both frontend and backend components. The system is designed for reliability, speed, and ease of maintenance.

## Architecture

### Frontend (Vercel)
- **Platform**: Vercel serverless deployment
- **Production URL**: https://acadion-gamma.vercel.app
- **Environment**: Production environment variables managed via Vercel CLI
- **SSL**: Automatic HTTPS with Vercel's edge network

### Backend (AWS EC2)
- **Platform**: AWS EC2 instance with Docker containers
- **Production URL**: https://54.167.95.26
- **Environment**: Docker Compose with environment variables
- **SSL**: Nginx reverse proxy with self-signed certificate

## Workflows

### 1. Backend Deployment (`.github/workflows/deploy-to-ec2.yml`)

**Triggers:**
- Push to `main` branch (backend files only)
- Pull requests (backend files only)
- Manual dispatch

**Process:**
1. **Test Phase**: Python linting, tests, Docker build verification
2. **Deploy Phase**: SSH to EC2, pull latest code, rebuild containers
3. **Health Check**: Verify API endpoints are responding

**Key Features:**
- Only triggers on backend file changes
- Uses existing EC2 instance (no new instance creation)
- Zero-downtime deployment with Docker Compose
- Automatic environment variable injection

### 2. Frontend Deployment (`.github/workflows/deploy-frontend.yml`)

**Triggers:**
- Push to `main` branch (frontend files only)
- Pull requests (frontend files only)
- Manual dispatch

**Process:**
1. **Test Phase**: ESLint, TypeScript checking, build verification
2. **Preview Deploy**: For PRs, creates preview deployment
3. **Production Deploy**: For main branch, deploys to production
4. **Health Check**: Verify frontend is accessible

**Key Features:**
- Automatic preview deployments for PRs
- PR comments with preview links
- Production deployment to Vercel
- Build artifact caching for faster deployments

### 3. Full CI/CD Pipeline (`.github/workflows/ci-cd-full.yml`)

**Triggers:**
- Push to `main` branch (any files)
- Pull requests (any files)
- Manual dispatch

**Process:**
1. **Parallel Testing**: Tests both frontend and backend simultaneously
2. **Preview Deployment**: For PRs, deploys frontend preview
3. **Production Deployment**: For main branch, deploys both components
4. **Health Checks**: Verifies both frontend and backend
5. **Notification**: Reports deployment status

**Key Features:**
- Matrix strategy for parallel testing
- Comprehensive health checks
- Deployment status notifications
- Full system deployment coordination

## Environment Variables

### Required GitHub Secrets

#### AWS/EC2 Secrets
```
EC2_PRIVATE_KEY          # SSH private key for EC2 access
AWS_ACCESS_KEY_ID        # AWS access key (if needed)
AWS_SECRET_ACCESS_KEY    # AWS secret key (if needed)
```

#### Vercel Secrets
```
VERCEL_TOKEN            # Vercel CLI token
VERCEL_ORG_ID          # Vercel organization ID
VERCEL_PROJECT_ID      # Vercel project ID
```

#### Application Secrets
```
SUPABASE_URL           # Supabase project URL
SUPABASE_KEY           # Supabase anon key
SUPABASE_SERVICE_KEY   # Supabase service role key
JWT_SECRET_KEY         # JWT signing secret
PINECONE_API_KEY       # Pinecone API key
PINECONE_ENVIRONMENT   # Pinecone environment
PINECONE_INDEX_NAME    # Pinecone index name
```

### Environment Configuration

#### Frontend (Vercel)
- `VITE_API_URL`: https://54.167.95.26 (HTTPS backend)
- `VITE_ENVIRONMENT`: production
- `VITE_SUPABASE_URL`: Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Supabase anon key

#### Backend (EC2)
- `SUPABASE_URL`: Supabase project URL
- `SUPABASE_KEY`: Supabase anon key
- `SUPABASE_SERVICE_KEY`: Supabase service role key
- `SECRET_KEY`: JWT signing secret
- `PINECONE_API_KEY`: Pinecone API key
- `PINECONE_ENVIRONMENT`: Pinecone environment
- `PINECONE_INDEX_NAME`: Pinecone index name
- `FACE_THRESHOLD`: 0.6
- `REDIS_URL`: redis://redis:6379

## Deployment Process

### Automatic Deployments

1. **Push to Main Branch**:
   - Triggers appropriate workflow based on changed files
   - Runs tests and builds
   - Deploys to production
   - Performs health checks
   - Reports status

2. **Pull Request**:
   - Runs tests for changed components
   - Creates preview deployment (frontend)
   - Comments on PR with preview links
   - Provides testing checklist

### Manual Deployments

1. **GitHub Actions UI**:
   - Go to Actions tab in GitHub
   - Select desired workflow
   - Click "Run workflow"
   - Choose branch and trigger

2. **Local Deployment Scripts**:
   - `deploy-backend.ps1`: Deploy backend only
   - `deploy-vercel.ps1`: Deploy frontend only
   - Use for emergency deployments or testing

## Monitoring and Troubleshooting

### Health Check Endpoints

- **Backend**: https://54.167.95.26/api/health
- **Frontend**: https://acadion-gamma.vercel.app

### Log Access

#### Backend Logs
```bash
# SSH to EC2
ssh -i acadion-key.pem ec2-user@54.167.95.26

# View container logs
cd acadion
docker-compose -f docker-compose.backend-only.yml logs -f

# View specific service logs
docker-compose -f docker-compose.backend-only.yml logs -f acadion-backend-1
```

#### Frontend Logs
```bash
# Vercel CLI logs
vercel logs https://acadion-gamma.vercel.app

# GitHub Actions logs
# Available in GitHub Actions tab
```

### Common Issues and Solutions

#### Backend Deployment Failures
1. **SSH Connection Issues**: Check EC2 instance status and security groups
2. **Docker Build Failures**: Check Dockerfile and dependencies
3. **Environment Variables**: Verify all required secrets are set
4. **Port Conflicts**: Ensure ports 8000 and 6379 are available

#### Frontend Deployment Failures
1. **Build Errors**: Check TypeScript errors and dependencies
2. **Vercel Token**: Verify VERCEL_TOKEN is valid and has permissions
3. **Environment Variables**: Check Vercel project settings
4. **API Connection**: Verify VITE_API_URL points to correct backend

#### Health Check Failures
1. **Backend**: Check if containers are running and healthy
2. **Frontend**: Verify deployment completed and DNS propagated
3. **SSL Issues**: Check certificate validity and nginx configuration
4. **CORS Errors**: Verify CORS headers in nginx configuration

## Best Practices

### Code Quality
- All code must pass linting and type checking
- Tests should be written for new features
- Docker builds must succeed before deployment
- No direct pushes to main branch (use PRs)

### Deployment Safety
- Always test in preview environment first
- Monitor health checks after deployment
- Keep rollback procedures ready
- Use feature flags for risky changes

### Security
- Never commit secrets to repository
- Use GitHub Secrets for sensitive data
- Regularly rotate API keys and tokens
- Keep dependencies updated

### Performance
- Use build caching where possible
- Optimize Docker images for faster builds
- Monitor deployment times and optimize
- Use parallel testing strategies

## Rollback Procedures

### Backend Rollback
```bash
# SSH to EC2
ssh -i acadion-key.pem ec2-user@54.167.95.26

# Navigate to project
cd acadion

# Checkout previous commit
git log --oneline -10  # Find previous commit
git checkout <previous-commit-hash>

# Rebuild and restart
docker-compose -f docker-compose.backend-only.yml down
docker-compose -f docker-compose.backend-only.yml up -d --build
```

### Frontend Rollback
```bash
# Using Vercel CLI
vercel rollback https://acadion-gamma.vercel.app

# Or redeploy previous commit
git checkout <previous-commit-hash>
cd frontend
vercel --prod
```

## Maintenance

### Regular Tasks
- Monitor deployment success rates
- Update dependencies monthly
- Review and rotate secrets quarterly
- Check EC2 instance health and costs
- Monitor Vercel usage and limits

### Scaling Considerations
- EC2 instance can be upgraded for more traffic
- Vercel automatically scales frontend
- Consider load balancer for multiple backend instances
- Monitor database performance and scaling needs

This CI/CD setup provides a robust, automated deployment pipeline that ensures code quality, deployment reliability, and system health monitoring.