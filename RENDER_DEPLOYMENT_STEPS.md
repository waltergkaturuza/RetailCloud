# 🎨 Render Deployment Guide - Complete Steps

Render is a great alternative to Railway and **DOES support Redis**. Here's how to deploy your RetailCloud system to Render.

## ✅ What Render Supports

- ✅ **PostgreSQL** - Managed database (included)
- ✅ **Redis** - Available as add-on (Free tier available: 25MB)
- ✅ **Web Services** - For your Django backend
- ✅ **Static Sites** - For your frontend (free)
- ✅ **Environment Variables** - Easy configuration
- ✅ **Auto-deploy from GitHub** - Automatic deployments

## 💰 Pricing (Similar to Railway)

- **Web Service**: $7/month (Free tier available for testing)
- **PostgreSQL**: $7/month (Free tier: 90 days)
- **Redis**: Free (25MB) or $10/month (100MB)
- **Static Site (Frontend)**: Free
- **Total**: ~$14/month (or free for testing)

---

## 🚀 Step-by-Step Deployment

### Step 1: Sign Up for Render

1. Go to [render.com](https://render.com)
2. Sign up with **GitHub** (recommended)
3. Verify your email

### Step 2: Create PostgreSQL Database

1. In Render Dashboard, click **"New +"** → **"PostgreSQL"**
2. Configure:
   - **Name**: `retailcloud-db` (or any name)
   - **Database**: `retailcloud` (or any name)
   - **User**: `retailcloud` (or any name)
   - **Region**: Choose closest to you
   - **PostgreSQL Version**: 15 (recommended)
   - **Plan**: Free (for testing) or Starter ($7/month)
3. Click **"Create Database"**
4. **Save the connection string** - you'll need it later!

### Step 3: Create Redis Instance (Optional but Recommended)

**Note**: Render calls it **"Key Value"** (it's Redis-compatible - uses Valkey 8)

1. In Render Dashboard, click **"New +"** → **"Key Value"**
2. Configure:
   - **Name**: `retailcloud-redis`
   - **Region**: Same as database
   - **Plan**: Free (25MB) or Starter ($10/month)
   - **Maxmemory Policy**: `allkeys-lru` (optional)
3. Click **"Create Key Value"**
4. **Note the connection details** - you'll need them later!

**After creation**, get connection info:
- Go to your Key Value service
- Click **"Connect"** or check **"Info"** tab
- Copy the **Internal Redis URL** or connection details

### Step 4: Create Web Service (Backend)

1. In Render Dashboard, click **"New +"** → **"Web Service"**
2. Connect your GitHub repository:
   - **Public Git repository**: Select "Connect account" if not connected
   - **Repository**: Select `RetailCloud` (or your repo name)
3. Configure the service:
   - **Name**: `retailcloud-backend` (or any name)
   - **Region**: Same as database
   - **Branch**: `main` (or your main branch)
   - **Root Directory**: `backend` ⚠️ **Important: Set this!**
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `Dockerfile.render` (or see note below)
   - **Build Command**: Leave empty (Docker handles it)
   - **Start Command**: Leave empty (uses Dockerfile CMD)

   **⚠️ Important Note**: 
   - When Root Directory is set to `backend`, Render's build context IS the `backend/` directory
   - We need to use `Dockerfile.render` which expects files at root (not `backend/` prefix)
   - OR you can copy `Dockerfile.render` to `Dockerfile` temporarily for Render

4. **Instance Type**:
   - **Free**: 512MB RAM (for testing)
   - **Starter**: $7/month, 512MB RAM (recommended)

5. Click **"Advanced"** to configure environment variables (or do it later)

### Step 5: Configure Environment Variables

In your Web Service, go to **"Environment"** tab and add:

#### Security (Required)
```
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=retailcloud-backend.onrender.com,yourdomain.com
```

Generate SECRET_KEY:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

#### Database (Required)
Get these from your PostgreSQL service → "Connections" tab:
```
DB_HOST=your-postgres-host.onrender.com
DB_NAME=retailcloud
DB_USER=retailcloud
DB_PASSWORD=your-postgres-password
DB_PORT=5432
```

**OR** use the connection string format:
```
DATABASE_URL=postgresql://user:password@host:port/database
```

And add individual variables:
```
DB_HOST=your-postgres-host.onrender.com
DB_NAME=retailcloud
DB_USER=retailcloud
DB_PASSWORD=your-password
DB_PORT=5432
```

#### Redis (If using)
Get these from your Redis service → "Connections" tab:
```
REDIS_HOST=your-redis-host.onrender.com
REDIS_PORT=6379
REDIS_PASSWORD=your-redis-password (if set)
```

If Redis URL is provided, parse it:
```
REDIS_URL=redis://:password@host:port
```

#### CORS & Frontend (Update after deploying frontend)
```
CORS_ALLOWED_ORIGINS=https://your-frontend.onrender.com
FRONTEND_URL=https://your-frontend.onrender.com
```

#### Email (Required for production)
```
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

### Step 6: Deploy Backend

1. After setting environment variables, Render will automatically start building
2. Watch the build logs for any errors
3. Once deployed, note your service URL: `https://retailcloud-backend.onrender.com`

### Step 7: Create Superuser

After first deployment:

1. Go to your Web Service → **"Shell"** tab (or use SSH)
2. Run:
```bash
python manage.py createsuperuser
```
3. Follow prompts to create admin user

**OR** use Render's Logs → "Shell" option to run commands

### Step 8: Deploy Frontend

1. In Render Dashboard, click **"New +"** → **"Static Site"**
2. Configure:
   - **Name**: `retailcloud-frontend`
   - **Repository**: Same GitHub repo
   - **Branch**: `main`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
3. **Environment Variables**:
   - Add: `VITE_API_URL=https://retailcloud-backend.onrender.com/api`
4. Click **"Create Static Site"**
5. Render will build and deploy automatically

### Step 9: Update Backend CORS Settings

After frontend is deployed:

1. Go to Backend Web Service → **"Environment"** tab
2. Update:
   ```
   CORS_ALLOWED_ORIGINS=https://retailcloud-frontend.onrender.com
   FRONTEND_URL=https://retailcloud-frontend.onrender.com
   ```
3. Render will automatically redeploy

### Step 10: Test Your Deployment

1. **Backend Admin**: `https://retailcloud-backend.onrender.com/admin/`
2. **API Test**: `https://retailcloud-backend.onrender.com/api/`
3. **Frontend**: `https://retailcloud-frontend.onrender.com`

---

## 🔧 Differences from Railway

| Feature | Railway | Render |
|---------|---------|--------|
| **PostgreSQL** | Included in project | Separate service |
| **Redis** | Add-on service | Separate service |
| **Configuration** | railway.json or UI | UI only (no config file) |
| **Environment Variables** | Reference variables | Direct values or URLs |
| **Free Tier** | Limited | 90 days for PostgreSQL |
| **Auto-deploy** | ✅ Yes | ✅ Yes |

---

## 📝 Notes

- Render uses **DATABASE_URL** format but you can also use individual DB_* variables
- Redis connection uses **REDIS_URL** or individual REDIS_HOST/REDIS_PORT
- Free tier PostgreSQL expires after 90 days (but you can recreate or upgrade)
- Static sites are always free
- Render auto-deploys on every git push

---

## 🆘 Troubleshooting

### Build Fails
- Check Root Directory is set to `backend`
- Verify Dockerfile exists at `backend/Dockerfile`
- Check build logs for errors

### Database Connection Errors
- Verify DATABASE_URL or individual DB_* variables
- Check PostgreSQL service is running
- Verify credentials match

### Redis Connection Errors
- Verify REDIS_URL or REDIS_HOST/REDIS_PORT
- Check Redis service is running
- Free tier Redis might have connection limits

### 404 Errors
- Check ALLOWED_HOSTS includes your Render domain
- Verify service is running (not just built)
- Check logs for startup errors

---

**Ready to deploy?** Follow the steps above and you'll have your system running on Render! 🚀

