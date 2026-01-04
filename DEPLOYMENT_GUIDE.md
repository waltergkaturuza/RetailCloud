# 🚀 Deployment Guide - RetailCloud Shop Management System

## Platform Comparison

### Recommended Platforms (Cost, Speed, Memory)

| Platform | Monthly Cost | Setup Difficulty | Memory | Speed | Best For |
|----------|--------------|------------------|--------|-------|----------|
| **Railway** ⭐ | $5-20 | ⭐ Easy | 512MB-2GB | ⭐⭐⭐ Fast | **Best overall value** |
| **Render** | $7-25 | ⭐ Easy | 512MB-2GB | ⭐⭐⭐ Good | Similar to Railway |
| **Fly.io** | $3-15 | ⭐⭐ Medium | Pay-per-use | ⭐⭐⭐ Excellent | Global distribution |
| **DigitalOcean App Platform** | $12-25 | ⭐⭐ Medium | 512MB-2GB | ⭐⭐⭐ Good | Familiar ecosystem |
| **Vercel + Railway** | $0-15 | ⭐ Easy | Varies | ⭐⭐⭐ Fast | Frontend + Backend split |

### My Recommendation: **Railway** 🎯

**Why Railway?**
- ✅ **Lowest cost** for small-medium scale ($5/month starter plan)
- ✅ **Fastest setup** (connects to GitHub, auto-detects Docker)
- ✅ **All-in-one**: PostgreSQL, Redis, and app deployment
- ✅ **512MB RAM included** (can scale to 2GB+ if needed)
- ✅ **Free tier** available for testing
- ✅ **Automatic HTTPS** and domain support

---

## 🚂 Railway Deployment (Recommended)

### Step 1: Prepare Your Code

1. **Create a production-ready Dockerfile for backend** (already exists, but we'll optimize it)
2. **Add a frontend build configuration**
3. **Create environment variable template**

### Step 2: Deploy to Railway

1. **Sign up** at [railway.app](https://railway.app)
2. **Create a New Project**
3. **Add Services**:
   - PostgreSQL Database
   - Redis
   - Backend (from GitHub repo)
   - Frontend (Static site or separate service)

### Step 3: Configure Environment Variables

Set these in Railway's environment variables:

```bash
# Django Settings
SECRET_KEY=your-secret-key-here  # Generate: python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
DEBUG=False
ALLOWED_HOSTS=your-app.railway.app,yourdomain.com

# Database (auto-provided by Railway PostgreSQL service)
DB_HOST=${{Postgres.PGHOST}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_PORT=${{Postgres.PGPORT}}

# Redis (auto-provided by Railway Redis service)
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}

# CORS (add your frontend URL)
CORS_ALLOWED_ORIGINS=https://your-frontend.railway.app,https://yourdomain.com

# Email (optional but recommended)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-app-password

# Stripe (if using payments)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_ENABLED=True
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Step 4: Update Dockerfile for Production

Update `backend/Dockerfile` to use production-ready server (Gunicorn):

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    postgresql-client \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy project
COPY . .

# Collect static files
RUN python manage.py collectstatic --noinput || true

# Expose port
EXPOSE 8000

# Run migrations and start server with Gunicorn
CMD python manage.py migrate && gunicorn retail_saas.wsgi:application --bind 0.0.0.0:8000 --workers 2 --timeout 120
```

### Step 5: Deploy Frontend

**Option A: Static Site (Recommended for Vite)**
- Build frontend: `npm run build`
- Deploy `dist` folder to Railway Static Site or Vercel/Netlify

**Option B: Nginx Container**
- Create a Dockerfile for frontend serving with Nginx

---

## 🎨 Render Deployment (Alternative)

### Pros:
- Free tier available
- Managed PostgreSQL included
- Simple deployment

### Steps:

1. **Create Account** at [render.com](https://render.com)

2. **Create PostgreSQL Database**:
   - New → PostgreSQL
   - Copy connection string

3. **Create Web Service**:
   - New → Web Service
   - Connect GitHub repo
   - Build Command: `cd backend && pip install -r requirements.txt && python manage.py collectstatic --noinput`
   - Start Command: `cd backend && gunicorn retail_saas.wsgi:application --bind 0.0.0.0:$PORT`

4. **Add Redis** (if needed):
   - New → Redis

5. **Deploy Frontend**:
   - New → Static Site
   - Build Command: `npm install && npm run build`
   - Publish Directory: `frontend/dist`

---

## ✈️ Fly.io Deployment (For Global Performance)

### Best For: Multi-region deployment, high performance

### Steps:

1. **Install Fly CLI**: `powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"`

2. **Initialize**: `fly launch` in project root

3. **Deploy**: `fly deploy`

4. **Add PostgreSQL**: `fly postgres create`
5. **Add Redis**: `fly redis create`

### Cost: Pay-per-use, typically $3-15/month for small apps

---

## 🔧 Production Optimizations Needed

Before deploying, make these changes:

### 1. Update Django Settings for Production

Add to `backend/retail_saas/settings.py`:

```python
# Security settings for production
if not DEBUG:
    SECURE_SSL_REDIRECT = True
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'
    
    # Static files
    STATIC_ROOT = BASE_DIR / 'staticfiles'
    STATIC_URL = '/static/'
    
    # Media files (consider using S3 or similar)
    MEDIA_ROOT = BASE_DIR / 'media'
    MEDIA_URL = '/media/'
```

### 2. Update Frontend API URL

Update `frontend/src/config/api.ts` (or similar) to use production API URL:

```typescript
export const API_URL = import.meta.env.VITE_API_URL || 'https://your-backend.railway.app/api';
```

### 3. Update CORS Settings

In Django settings, update `CORS_ALLOWED_ORIGINS` with your frontend URL:

```python
CORS_ALLOWED_ORIGINS = [
    "https://your-frontend.railway.app",
    "https://yourdomain.com",
]
```

### 4. Database Migrations

Ensure migrations run automatically on deployment (already in Dockerfile CMD).

---

## 💰 Cost Breakdown (Railway)

### Starter Plan (~$5-10/month):
- **Backend Service**: $5/month (512MB RAM, 1GB disk)
- **PostgreSQL**: $5/month (1GB storage)
- **Redis**: Free tier (25MB) or $3/month (100MB)
- **Frontend**: Free (static hosting on Vercel/Netlify)
- **Total**: ~$10-13/month

### As You Scale:
- More RAM: +$5-10/month per GB
- More DB storage: +$5/month per 10GB
- **Estimated 100 users**: ~$15-20/month
- **Estimated 1000 users**: ~$30-50/month

---

## 🚀 Quick Start: Railway Deployment

### 1. Install Railway CLI (Optional)

```powershell
# Windows PowerShell
iwr https://railway.app/install.sh | iex
```

### 2. Login and Deploy

```bash
railway login
railway init
railway up
```

### 3. Add PostgreSQL

In Railway dashboard: New → PostgreSQL → Add to project

### 4. Add Redis

In Railway dashboard: New → Redis → Add to project

### 5. Configure Environment Variables

In Railway dashboard: Variables tab → Add all required variables

### 6. Deploy Frontend

- Option A: Deploy to Vercel (free)
- Option B: Create separate Railway service for frontend

---

## 📊 Performance Expectations

### Railway (512MB RAM):
- ✅ Handles 50-100 concurrent users
- ✅ Fast response times (<200ms)
- ✅ Good for small-medium businesses
- ⚠️ May need upgrade at 500+ users

### Scaling Tips:
1. **Database**: Use connection pooling (pgBouncer)
2. **Caching**: Leverage Redis for frequently accessed data
3. **CDN**: Use CloudFlare for static assets
4. **Celery Workers**: Run separately for background tasks

---

## 🔐 Security Checklist

Before going live:

- [ ] Set `DEBUG=False` in production
- [ ] Generate new `SECRET_KEY` (never commit)
- [ ] Configure `ALLOWED_HOSTS`
- [ ] Enable HTTPS (automatic on Railway/Render)
- [ ] Set up proper CORS origins
- [ ] Configure email backend
- [ ] Set up database backups
- [ ] Use environment variables for secrets
- [ ] Enable Django security middleware
- [ ] Set up monitoring/logging

---

## 📝 Next Steps

1. **Choose a platform** (Railway recommended)
2. **Set up environment variables**
3. **Deploy backend**
4. **Deploy frontend**
5. **Configure domain** (optional)
6. **Test thoroughly**
7. **Set up monitoring** (Sentry, LogTail, etc.)

---

## 🆘 Troubleshooting

### Common Issues:

1. **Database connection errors**: Check environment variables match Railway's provided values
2. **Static files 404**: Run `collectstatic` during build
3. **CORS errors**: Update `CORS_ALLOWED_ORIGINS` with frontend URL
4. **Memory issues**: Upgrade RAM in Railway dashboard

### Support:
- Railway Docs: https://docs.railway.app
- Render Docs: https://render.com/docs
- Fly.io Docs: https://fly.io/docs

---

**Recommended Path**: Start with Railway ($10/month), scale as needed! 🚀


