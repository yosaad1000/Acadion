# Vercel Deployment Guide

This document explains how to deploy the Acadion frontend to Vercel Free Tier with optimizations.

## Quick Setup

### 1. Vercel Account Setup
1. Create a free account at [vercel.com](https://vercel.com)
2. Install Vercel CLI: `npm install -g vercel@latest`
3. Login: `vercel login`

### 2. Project Configuration
1. Import your GitHub repository to Vercel
2. Set the framework preset to "Vite"
3. Configure build settings:
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm ci`

### 3. Environment Variables
Configure these environment variables in your Vercel dashboard:

#### Required Variables
- `VITE_SUPABASE_URL`: Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY`: Your Supabase anonymous key

#### Optional Variables
- `VITE_API_URL`: Backend API URL (default: http://localhost:8000)
- `VITE_ENVIRONMENT`: Environment name (development/staging/production)
- `VITE_ENABLE_ANALYTICS`: Enable analytics (true/false)
- `VITE_ENABLE_DEBUG`: Enable debug mode (true/false)

### 4. GitHub Integration
The project includes automatic deployment via GitHub Actions:

1. Add these secrets to your GitHub repository:
   - `VERCEL_TOKEN`: Your Vercel API token
   - `VERCEL_ORG_ID`: Your Vercel organization ID
   - `VERCEL_PROJECT_ID`: Your Vercel project ID
   - `VITE_SUPABASE_URL`: Supabase URL
   - `VITE_SUPABASE_ANON_KEY`: Supabase anonymous key
   - `VITE_API_URL`: Backend API URL

2. Push to `main` branch for production deployment
3. Create pull requests for preview deployments

## Deployment Methods

### Automatic Deployment (Recommended)
- **Production**: Push to `main` branch
- **Preview**: Create pull request to `main` branch
- **Staging**: Push to `develop` branch

### Manual Deployment
```bash
# Using deployment script (Linux/Mac)
./frontend/scripts/deploy.sh production

# Using deployment script (Windows)
.\frontend\scripts\deploy.ps1 production

# Using Vercel CLI directly
cd frontend
vercel --prod
```

## Optimization Features

### Bundle Optimization
- **Code Splitting**: Automatic vendor and route-based splitting
- **Tree Shaking**: Removes unused code
- **Minification**: Terser minification with console removal
- **Compression**: Gzip compression enabled

### Performance Features
- **CDN**: Global edge network via Vercel
- **Caching**: Optimized cache headers for static assets
- **Image Optimization**: Automatic image optimization
- **HTTP/2**: Enabled by default

### Security Features
- **HTTPS**: Automatic SSL certificates
- **Security Headers**: XSS protection, content type sniffing prevention
- **CORS**: Configured for API integration

## Free Tier Limits

Vercel Free Tier includes:
- **Bandwidth**: 100GB/month
- **Build Minutes**: 6,000/month
- **Deployments**: Unlimited
- **Preview Deployments**: Unlimited
- **Custom Domains**: 1 per project

## Monitoring Usage

### Build Minutes
- Monitor in Vercel dashboard under "Usage"
- Optimize build times by:
  - Using `npm ci` instead of `npm install`
  - Enabling build caching
  - Minimizing dependencies

### Bandwidth
- Monitor in Vercel dashboard
- Optimize by:
  - Enabling compression
  - Using optimized images
  - Implementing proper caching

## Troubleshooting

### Build Failures
1. Check build logs in Vercel dashboard
2. Verify environment variables are set
3. Test build locally: `npm run build`
4. Check for TypeScript errors: `npm run type-check`

### Environment Issues
1. Verify `.env` files are properly configured
2. Check environment variable names (must start with `VITE_`)
3. Ensure required variables are set in Vercel dashboard

### Performance Issues
1. Analyze bundle size: `npm run build:analyze`
2. Check Core Web Vitals in Vercel dashboard
3. Use Vercel Analytics for detailed metrics

## Advanced Configuration

### Custom Domain
1. Add domain in Vercel dashboard
2. Configure DNS records as instructed
3. SSL certificate is automatically provisioned

### Preview Deployments
- Every pull request gets a unique preview URL
- Preview deployments use staging environment variables
- Automatic cleanup after PR is merged/closed

### Branch Deployments
- `main` → Production deployment
- `develop` → Staging deployment
- Feature branches → Preview deployments

## Support

For issues with Vercel deployment:
1. Check [Vercel Documentation](https://vercel.com/docs)
2. Review build logs in Vercel dashboard
3. Test locally with `npm run build` and `npm run preview`
4. Check GitHub Actions logs for CI/CD issues