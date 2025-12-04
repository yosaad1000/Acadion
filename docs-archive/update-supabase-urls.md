# Update Supabase OAuth Configuration

## 🔧 Required Supabase Settings

Go to your Supabase Dashboard: https://supabase.com/dashboard/project/scijpejtvneuqbhkoxuz

### 1. Authentication → Settings → URL Configuration

**Site URL:**
```
https://acadion-gamma.vercel.app
```

**Redirect URLs (add all of these):**
```
https://acadion-gamma.vercel.app/auth/callback
https://acadion-yosaad1000s-projects.vercel.app/auth/callback
https://acadion-9g7wh5bd1-yosaad1000s-projects.vercel.app/auth/callback
http://localhost:5173/auth/callback
http://localhost:3000/auth/callback
```

### 2. Authentication → Providers → Google

Make sure Google OAuth is enabled and configured with:

**Authorized redirect URIs:**
```
https://scijpejtvneuqbhkoxuz.supabase.co/auth/v1/callback
```

### 3. Google Cloud Console (if needed)

If you need to update Google OAuth settings:

1. Go to: https://console.cloud.google.com/
2. Select your project
3. Go to: APIs & Services → Credentials
4. Edit your OAuth 2.0 Client ID
5. Add to "Authorized redirect URIs":
   ```
   https://scijpejtvneuqbhkoxuz.supabase.co/auth/v1/callback
   ```

## 🧪 Testing

After updating these settings:

1. **Clear browser cache** on your friend's device
2. **Try OAuth login** from an incognito window
3. **Check the redirect URL** in the browser address bar during OAuth flow
4. **Verify** it goes to `https://acadion-gamma.vercel.app/auth/callback`

## 🚨 Common Issues

- **Cache**: Clear browser cache and cookies
- **URL mismatch**: Ensure all URLs match exactly (no trailing slashes)
- **Case sensitivity**: URLs are case-sensitive
- **HTTPS**: All production URLs must use HTTPS

The fix in the code will ensure everyone gets redirected to the same production URL regardless of which Vercel URL they're accessing from.