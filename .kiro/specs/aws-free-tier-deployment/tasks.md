# AWS Free Tier Deployment - Simplified Plan

## Phase 1: Get It Working (MVP)

- [x] 1. Frontend Deployed to Vercel ✅
  - Frontend is live at: https://acadion-8rygmefra-yosaad1000s-projects.vercel.app
  - Need to add environment variables

- [ ] 2. Deploy Backend to EC2
  - Create simple EC2 t2.micro instance
  - Deploy FastAPI backend with Docker
  - Test API endpoints

- [ ] 3. Deploy Face Recognition Service
  - Deploy face-recognition-service to same EC2 or Lambda
  - Test face processing endpoints
  - Connect to backend

- [ ] 4. Connect Frontend to Backend
  - Update Vercel environment variables
  - Test end-to-end flow

## Phase 2: Basic Optimizations (Later)

- [ ] 5. Add Basic Monitoring
  - CloudWatch for basic health checks
  - Simple cost alerts

- [ ] 6. Security Basics
  - HTTPS setup
  - Basic security groups

- [ ] 7. CI/CD Pipeline
  - Simple GitHub Actions for deployment