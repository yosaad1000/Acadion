# 🚀 GitHub Pages Setup Guide

## Step-by-Step Instructions

### 1. Push Your Changes
First, make sure all changes are committed and pushed:

```bash
git add .
git commit -m "Fix repository name references for GitHub Pages"
git push origin main
```

### 2. Enable GitHub Pages

1. **Go to your repository**: https://github.com/yosaad1000/Acadion
2. **Click on "Settings"** (top menu bar)
3. **Scroll down to "Pages"** (left sidebar)
4. **Under "Source"**, select **"GitHub Actions"**
5. **Click "Save"**

### 3. Trigger the Workflow

The GitHub Actions workflow should automatically trigger when you push changes to the `docs/` folder. If it doesn't:

1. Go to the **"Actions"** tab in your repository
2. Click on **"Deploy Documentation to GitHub Pages"**
3. Click **"Run workflow"** → **"Run workflow"**

### 4. Check Deployment Status

1. Go to **"Actions"** tab
2. Look for the **"Deploy Documentation to GitHub Pages"** workflow
3. Wait for it to complete (green checkmark)

### 5. Access Your Documentation

Once deployed, your documentation will be available at:
**https://yosaad1000.github.io/Acadion/**

## Troubleshooting

### If GitHub Pages is Not Working:

1. **Check Repository Settings**:
   - Make sure the repository is **public** (GitHub Pages requires public repos for free accounts)
   - Verify Pages is enabled and set to "GitHub Actions"

2. **Check Workflow Permissions**:
   - Go to Settings → Actions → General
   - Under "Workflow permissions", select **"Read and write permissions"**
   - Check **"Allow GitHub Actions to create and approve pull requests"**

3. **Manual Workflow Trigger**:
   - Go to Actions tab
   - Click "Deploy Documentation to GitHub Pages"
   - Click "Run workflow" button

### If the Workflow Fails:

1. **Check the workflow logs** in the Actions tab
2. **Common issues**:
   - Repository might be private (upgrade to GitHub Pro or make it public)
   - Workflow permissions not set correctly
   - Jekyll build errors

### Alternative: Simple GitHub Pages Setup

If the workflow approach doesn't work, you can use the simpler approach:

1. **Go to Settings → Pages**
2. **Under "Source"**, select **"Deploy from a branch"**
3. **Select branch**: `main`
4. **Select folder**: `/docs`
5. **Click "Save"**

This will use Jekyll's default processing without the custom workflow.

## Expected Result

Once working, you'll have:
- **Main Documentation**: https://yosaad1000.github.io/Acadion/
- **Getting Started**: https://yosaad1000.github.io/Acadion/getting-started
- **API Documentation**: https://yosaad1000.github.io/Acadion/api-documentation
- **Architecture Guide**: https://yosaad1000.github.io/Acadion/architecture
- **Deployment Guide**: https://yosaad1000.github.io/Acadion/deployment
- **Contributing Guide**: https://yosaad1000.github.io/Acadion/contributing

## Need Help?

If you're still having issues:
1. Check if your repository is public
2. Verify the workflow ran successfully in the Actions tab
3. Make sure all files are committed and pushed
4. Try the alternative simple setup method above