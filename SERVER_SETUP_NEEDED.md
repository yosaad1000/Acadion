# 🔧 Server Setup Required

## Current Status
✅ SSH key authentication is working  
✅ Docker is installed on the server  
✅ Deployment files are copied to `/home/ubuntu/attendify/`  
❌ User `ubuntu` needs to be added to the `docker` group  

## Required Action on Server

Someone with sudo access needs to run this command on `attendify.nitgoa.ac.in`:

```bash
# Add ubuntu user to docker group
sudo usermod -aG docker ubuntu

# Restart Docker service (if needed)
sudo systemctl restart docker

# Verify docker group membership
groups ubuntu
```

After this is done, the user will need to **log out and log back in** for the group changes to take effect.

## Alternative: Run with sudo

If adding to docker group is not preferred, you can run the deployment with sudo:

```bash
# On the server (attendify.nitgoa.ac.in)
cd /home/ubuntu/attendify
sudo docker compose -f docker-compose.deploy.yml pull
sudo docker compose -f docker-compose.deploy.yml up -d
```

## Once Fixed, Complete Deployment

After the docker group issue is resolved, run:

```bash
# From your local machine
ssh -i ~/.ssh/attendify_key ubuntu@attendify.nitgoa.ac.in "cd /home/ubuntu/attendify && docker compose -f docker-compose.deploy.yml pull && docker compose -f docker-compose.deploy.yml up -d"
```

## Files Already on Server

- ✅ `docker-compose.deploy.yml` - Docker Compose configuration
- ✅ `.env` - Environment variables with your Supabase/Pinecone credentials
- ✅ Docker images are available on DockerHub (`justs44d/attendify-backend` & `justs44d/attendify-frontend`)

## Expected Result

After deployment, your application will be available at:
- **Frontend**: http://attendify.nitgoa.ac.in
- **Backend API**: http://attendify.nitgoa.ac.in:8000
- **API Docs**: http://attendify.nitgoa.ac.in:8000/docs

## Contact Server Admin

Please contact the server administrator to:
1. Add `ubuntu` user to `docker` group
2. Or provide sudo access for Docker commands
3. Ensure ports 80, 443, and 8000 are open in firewall