# Workflow Separation Plan

## Current Problem
The `ci-cd-full.yml` workflow is doing too much:
- ✅ Testing backend and frontend
- ✅ Deploying backend to EC2
- ❌ Installing Vercel CLI on GitHub runner
- ❌ Deploying frontend to Vercel
- ❌ Mixed responsibilities

## Proposed Solution

### 1. `deploy-to-ec2.yml` (Backend Only) ✅
**Purpose**: Deploy only backend to EC2
**Triggers**: Changes to backend files
**Actions**:
- Test backend
- Build Docker image
- Deploy to EC2
- Health check EC2

### 2. `deploy-frontend.yml` (Frontend Only) ✅
**Purpose**: Deploy only frontend to Vercel
**Triggers**: Changes to frontend files
**Actions**:
- Test frontend
- Build frontend
- Deploy to Vercel
- Health check Vercel

### 3. `ci-cd-full.yml` (Orchestrator) 🔄
**Purpose**: Full system deployment
**Triggers**: Changes to any files, manual dispatch
**Actions**:
- Call backend workflow
- Call frontend workflow
- Comprehensive health checks
- Deployment summary

## Benefits

### Separation of Concerns:
- Backend deployment isolated
- Frontend deployment isolated
- Clear responsibilities

### Efficiency:
- Backend changes only trigger backend deployment
- Frontend changes only trigger frontend deployment
- Faster CI/CD cycles

### Debugging:
- Easier to debug specific deployment issues
- Clear logs per component
- Independent failure handling

### Maintenance:
- Easier to modify individual workflows
- Less complex workflows
- Better testability

## Implementation

### Option A: Keep Current Structure (Quick Fix)
- Rename `ci-cd-full.yml` to `deploy-full-stack.yml`
- Keep `deploy-to-ec2.yml` for backend only
- Keep `deploy-frontend.yml` for frontend only

### Option B: Workflow Composition (Advanced)
- Use workflow_call to compose workflows
- Create reusable workflow components
- More complex but more maintainable

## Recommendation
Use **Option A** for now - it's simpler and addresses your immediate concern about Vercel installation.