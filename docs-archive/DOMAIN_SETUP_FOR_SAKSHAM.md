# 🚀 Domain Setup Instructions for Saksham

Hey Saksham! We need to set up your domain to fix the HTTPS mixed content issue that's blocking our frontend from calling the backend. Here's everything you need to do:

## 🎯 The Problem
- Frontend is on HTTPS (Vercel): `https://acadion-gamma.vercel.app`
- Backend is on HTTP (EC2): `http://54.167.95.26:8000`
- Browsers block HTTPS → HTTP calls (mixed content policy)

## 🌐 The Solution
Use your domain to serve both frontend and backend over HTTPS with proper SSL certificates.

---

## 📋 Step 1: Domain Configuration

### What I need from you:
1. **Domain name** - What's the exact domain you bought? (e.g., `acadion.com`, `myapp.io`)
2. **DNS Access** - Can you access the DNS settings where you bought it?

### DNS Records to Add:
Once you tell me the domain, add these A records in your DNS provider:

```
Type: A
Name: @ (or root/blank)
Value: 54.167.95.26
TTL: 300 (or Auto)

Type: A  
Name: api
Value: 54.167.95.26
TTL: 300 (or Auto)
```

This will give us:
- `https://yourdomain.com` → Frontend
- `https://api.yourdomain.com` → Backend API

---

## 🔧 Step 2: Server Setup

### You'll need access to the EC2 server:
**Option A: I can give you the PEM file separately** (more secure)
**Option B: You can use GitHub Actions** (easier, but limited)

### If using PEM file (recommended):
1. I'll send you `acadion-key.pem` securely
2. SSH into server: `ssh -i acadion-key.pem ec2-user@54.167.95.26`
3. Run the setup script (I'll create this for your specific domain)

### If using GitHub Actions only:
The workflows can deploy, but you'll need the PEM for initial SSL setup.

---

## 🛠️ Step 3: Run Setup Script

Once you have your domain name, I'll customize this script for you:

```bash
# On EC2 server
chmod +x setup-existing-domain.sh
./setup-existing-domain.sh yourdomain.com
```

This script will:
- ✅ Install nginx and certbot
- ✅ Configure SSL certificates (Let's Encrypt - FREE!)
- ✅ Set up reverse proxy for API
- ✅ Configure HTTPS redirects
- ✅ Set up auto-renewal for certificates

---

## 📱 Step 4: Update Frontend Configuration

After domain setup, update the API URL:

```bash
# Remove old API URL
vercel env rm VITE_API_URL --yes

# Add new HTTPS API URL (replace with your domain)
echo 'https://api.yourdomain.com' | vercel env add VITE_API_URL production

# Redeploy frontend
vercel --prod
```

---

## 🔄 Step 5: GitHub Workflow Updates

### You have collaborator access, so you can:
- ✅ Push code changes
- ✅ Trigger GitHub Actions workflows
- ✅ Update workflow files
- ✅ Access repository secrets (if I give you access)

### Workflow updates needed:
I'll update the deployment workflows to use your domain instead of the IP address.

---

## 🧪 Step 6: Testing

After setup, test these URLs:
- `https://yourdomain.com` → Should show frontend
- `https://api.yourdomain.com/api/health` → Should return backend health check
- `https://yourdomain.com/api/health` → Alternative API endpoint

---

## 🔐 Security & Access

### PEM File:
**Yes, you'll need the PEM file separately** for:
- Initial server access
- SSL certificate setup
- Manual deployments
- Troubleshooting

### GitHub Secrets:
You have access to trigger workflows, but I need to give you access to repository secrets for:
- `EC2_PRIVATE_KEY`
- `SUPABASE_*` keys
- `PINECONE_*` keys

---

## 📞 Next Steps

**Reply with:**
1. **Your domain name** (exact spelling)
2. **Confirmation you can access DNS settings**
3. **Preferred method**: PEM file access OR GitHub Actions only

**I'll then:**
1. Customize all scripts for your domain
2. Update GitHub workflows
3. Send you the PEM file (if needed)
4. Create domain-specific deployment instructions

---

## 🚨 Important Notes

- **DNS propagation** takes 5-60 minutes
- **Let's Encrypt** certificates are FREE and auto-renew
- **Backup plan**: If domain setup fails, we can use ngrok temporarily
- **Testing**: Always test both HTTP→HTTPS redirect and API endpoints

---

## 🎉 Expected Result

After completion:
- ✅ Frontend: `https://yourdomain.com` (HTTPS)
- ✅ Backend: `https://api.yourdomain.com` (HTTPS)  
- ✅ No more mixed content errors
- ✅ Proper SSL certificates
- ✅ Auto-renewing certificates
- ✅ Professional domain setup

**Let's get this fixed! 🚀**

---

*Created by: Your teammate*  
*Date: $(date)*  
*Status: Waiting for domain details*