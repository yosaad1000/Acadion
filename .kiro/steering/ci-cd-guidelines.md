# CI/CD Guidelines

## Core Principle

**ALWAYS use GitHub workflows when possible. Don't overcomplicate things with manual deployments.**

If you can accomplish something via GitHub Actions workflow, do it that way instead of manual SSH, SCP, or complex workarounds. The workflows are already set up and tested.

## Overview

Automated deployment pipeline using GitHub Actions for both frontend and backend components.

## Production Environment

### Frontend (Vercel)
- **URL**: https://acadion-gamma.vercel.app
- **Deployment**: Automatic on frontend changes
- **SSL**: Automatic HTTPS

### Backend (AWS EC2)
- **URL**: https://54.167.95.26
- **Deployment**: Automatic on backend changes
- **SSL**: Nginx reverse proxy

## Workflows

### Backend Deployment
- **Triggers**: Changes to `backend/**`, `docker-compose*.yml`
- **Process**: Test → Deploy to EC2 → Health Check
- **Features**: Zero-downtime deployment, automatic environment injection

### Frontend Deployment  
- **Triggers**: Changes to `frontend/**`
- **Process**: Test → Deploy to Vercel → Health Check
- **Features**: Preview deployments for PRs, automatic HTTPS

### Full Stack Deployment
- **Triggers**: Manual only (prevents conflicts)
- **Process**: Test both → Deploy both → Health Check both

## Required GitHub Secrets

### AWS/EC2
- `EC2_PRIVATE_KEY` - SSH private key for EC2 access

### Vercel
- `VERCEL_TOKEN` - Vercel CLI token
- `VERCEL_ORG_ID` - Organization ID
- `VERCEL_PROJECT_ID` - Project ID

### Application
- `SUPABASE_URL`, `SUPABASE_KEY`, `SUPABASE_SERVICE_KEY`
- `JWT_SECRET_KEY`
- `PINECONE_API_KEY`, `PINECONE_ENVIRONMENT`, `PINECONE_INDEX_NAME`

## Monitoring

### Health Check Endpoints
- **Backend**: https://54.167.95.26/api/health
- **Frontend**: https://acadion-gamma.vercel.app

### Log Access
```bash
# Backend logs via SSH
ssh -i acadion-key.pem ec2-user@54.167.95.26
docker-compose -f docker-compose.backend-only.yml logs -f

# Frontend logs via Vercel CLI
vercel logs https://acadion-gamma.vercel.app
```

### Manual Deployment
```bash
# Trigger via GitHub Actions UI or CLI
gh workflow run "Deploy Backend to EC2"
gh workflow run "Deploy Frontend to Vercel"
```

## Deployment Best Practices

### ✅ DO
- Use GitHub Actions workflows for all deployments
- Commit configuration changes and let workflows handle deployment
- Use `git push` to trigger automatic deployments
- Use `workflow_dispatch` for manual triggers when needed
- Update workflow files when deployment process changes

### ❌ DON'T
- Manually SSH into servers to deploy code
- Use SCP to copy files directly to production
- Bypass the established CI/CD pipeline
- Make manual configuration changes on servers
- Overcomplicate with custom deployment scripts when workflows exist

### When to Update Workflows
- When adding new services (like Nginx reverse proxy)
- When changing Docker configurations
- When adding new environment variables
- When modifying deployment steps

The workflows handle:
- Environment variable injection
- SSL certificate generation
- Service orchestration
- Health checks
- Rollback capabilities