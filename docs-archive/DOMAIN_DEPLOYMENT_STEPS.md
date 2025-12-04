# 🚀 Domain Deployment Steps for acadion.online

## ✅ Current Status
- ✅ Main domain DNS: `acadion.online` → `54.167.95.26`
- ❌ API subdomain DNS: `api.acadion.online` → needs setup
- ❌ SSL certificates: not configured
- ❌ Frontend API URL: still using HTTP

## 🎯 Step 1: Add API Subdomain DNS

**Go to your domain registrar and add:**

```
Type: A
Name: api
Value: 54.167.95.26
TTL: 300
```

**Test with:** `nslookup api.acadion.online`
Should return: `54.167.95.26`

## 🎯 Step 2: Setup SSL Certificates

Run the SSL setup workflow:

1. Go to **GitHub → Actions**
2. Find **"Setup Domain SSL (acadion.online)"**
3. Click **"Run workflow"**
4. Wait for completion

**Or manually via SSH:**
```bash
ssh -i acadion-key.pem ec2-user@54.167.95.26
chmod +x /tmp/setup-existing-domain.sh
./tmp/setup-existing-domain.sh acadion.online
```

## 🎯 Step 3: Deploy Backend

Run the backend deployment:

1. Go to **GitHub → Actions**
2. Find **"Deploy Backend to EC2"**
3. Click **"Run workflow"**
4. Wait for completion

## 🎯 Step 4: Update Frontend API URL

**Login to Vercel:**
```bash
vercel login
```

**Update environment variable:**
```bash
cd frontend
vercel env rm VITE_API_URL production --yes
echo 'https://api.acadion.online' | vercel env add VITE_API_URL production
vercel --prod
```

## 🎯 Step 5: Test Everything

**Backend API:**
```bash
curl https://api.acadion.online/api/health
```

**Frontend:**
- Visit: `https://acadion-gamma.vercel.app`
- Check browser console for HTTPS API calls
- Test login/signup functionality

## 🚨 Troubleshooting

### DNS Issues
- **Wait 5-60 minutes** for DNS propagation
- **Test with:** `nslookup acadion.online` and `nslookup api.acadion.online`
- **Both should return:** `54.167.95.26`

### SSL Issues
- **Check certificates:** `sudo certbot certificates`
- **Renew if needed:** `sudo certbot renew`
- **Restart nginx:** `sudo systemctl restart nginx`

### Backend Issues
- **Check logs:** `ssh ec2-user@54.167.95.26 'docker-compose logs'`
- **Restart services:** `docker-compose restart`

### Frontend Issues
- **Check environment:** `vercel env ls`
- **Redeploy:** `vercel --prod`

## 🎉 Expected Final Result

- **Frontend:** `https://acadion-gamma.vercel.app` (using HTTPS API)
- **Backend:** `https://api.acadion.online` (with SSL certificate)
- **No mixed content errors**
- **All API calls over HTTPS**

---

**Next:** Once DNS is updated, run the GitHub workflows or follow the manual steps above.