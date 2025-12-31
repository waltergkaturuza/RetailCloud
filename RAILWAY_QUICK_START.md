# 🚂 Railway Quick Start Guide

The fastest way to deploy your RetailCloud system to production.

## 🎯 Why Railway?

- ✅ **$5-10/month** starting cost
- ✅ **5-minute setup** 
- ✅ **All-in-one**: PostgreSQL, Redis, and app hosting
- ✅ **512MB RAM included** (enough for 50-100 users)
- ✅ **Free tier** available for testing
- ✅ **Auto HTTPS** and domain support

## 📦 What You'll Deploy

1. **Backend** (Django API) - Railway Web Service
2. **PostgreSQL** - Railway Database
3. **Redis** - Railway Redis (optional, but recommended)
4. **Frontend** - Vercel/Netlify (free) or Railway Static Site

## 🚀 Step-by-Step Deployment

### Step 1: Prepare Your Repository

1. Push your code to GitHub (if not already)
2. Ensure `backend/Dockerfile` exists (✅ already created)
3. Ensure `backend/.dockerignore` exists (✅ already created)

### Step 2: Create Railway Account

1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub
3. Click "New Project"

### Step 3: Add PostgreSQL Database

1. In your Railway project, click "**New**" → "**Database**" → "**Add PostgreSQL**"
2. Railway automatically creates the database
3. Note: Railway will provide connection variables automatically

### Step 4: Add Redis (Recommended)

1. Click "**New**" → "**Database**" → "**Add Redis**"
2. Note: Free tier includes 25MB (enough for small-medium apps)

### Step 5: Deploy Backend

1. Click "**New**" → "**GitHub Repo**"
2. Select your repository
3. Railway auto-detects the Dockerfile in `backend/` folder
4. **Set Root Directory**: Click on the service → Settings → Root Directory → Set to `backend`

### Step 6: Configure Environment Variables

In your backend service, go to "**Variables**" tab and add:

```bash
# Security
SECRET_KEY=your-secret-key-here
DEBUG=False
ALLOWED_HOSTS=your-app-name.railway.app,*.railway.app

# Database (Railway auto-provides these, use the reference variables)
DB_HOST=${{Postgres.PGHOST}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_PORT=${{Postgres.PGPORT}}

# Redis (Railway auto-provides these)
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}

# CORS (Update with your frontend URL)
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app

# Frontend URL
FRONTEND_URL=https://your-frontend.vercel.app

# Email (Required for production)
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# Payment Gateway (if using Stripe)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_ENABLED=True
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Important Notes:**
- Replace `your-secret-key-here` with a generated secret key (see below)
- Update `CORS_ALLOWED_ORIGINS` and `FRONTEND_URL` after deploying frontend
- For Gmail, use an [App Password](https://myaccount.google.com/apppasswords), not your regular password

### Step 7: Generate Secret Key

Run this command locally:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

Copy the output and paste it as `SECRET_KEY` in Railway.

### Step 8: Deploy Frontend

**Option A: Deploy to Vercel (Recommended - Free)**

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Import your repository
4. Set:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Output Directory**: `dist`
5. Add Environment Variable:
   - `VITE_API_URL` = `https://your-backend.railway.app/api`
6. Deploy

**Option B: Deploy to Railway Static Site**

1. In Railway, click "**New**" → "**GitHub Repo**"
2. Select your repository
3. Set Root Directory to `frontend`
4. Build Command: `npm install && npm run build`
5. Output Directory: `dist`
6. Add Environment Variable: `VITE_API_URL=https://your-backend.railway.app/api`

### Step 9: Update CORS Settings

After deploying frontend, update in Railway backend variables:
- `CORS_ALLOWED_ORIGINS` = your frontend URL
- `FRONTEND_URL` = your frontend URL

### Step 10: Run Migrations & Create Superuser

Railway will automatically run migrations on deployment (configured in Dockerfile).

To create a superuser, use Railway's CLI:

```bash
# Install Railway CLI
iwr https://railway.app/install.sh | iex

# Login
railway login

# Link to your project
railway link

# Run migrations (usually automatic)
railway run python manage.py migrate

# Create superuser
railway run python manage.py createsuperuser
```

Or use Railway's web terminal:
1. Go to your backend service
2. Click "**Deployments**" → Latest deployment → "**View Logs**" → "**Shell**"
3. Run commands there

### Step 11: Test Your Deployment

1. **Backend Health**: Visit `https://your-backend.railway.app/admin/`
2. **API Test**: Visit `https://your-backend.railway.app/api/`
3. **Frontend**: Visit your frontend URL
4. **Login**: Test login functionality

## 💰 Pricing Estimate

### Starter Setup (~$10/month):
- Backend Service: **$5/month** (512MB RAM, 1GB disk)
- PostgreSQL: **$5/month** (1GB storage)
- Redis: **Free** (25MB tier) or **$3/month** (100MB)
- Frontend (Vercel): **Free**
- **Total: ~$10/month**

### Scaling:
- **100 users**: $15-20/month
- **500 users**: $25-35/month
- **1000+ users**: $40-60/month

## 🔧 Troubleshooting

### Backend won't start
- Check logs in Railway dashboard
- Verify all environment variables are set
- Check `DEBUG=False` and `ALLOWED_HOSTS` includes your Railway domain

### Database connection errors
- Verify database variables use Railway's reference syntax: `${{Postgres.PGHOST}}`
- Check database service is running

### CORS errors
- Verify `CORS_ALLOWED_ORIGINS` includes your frontend URL (no trailing slash)
- Restart backend service after updating CORS settings

### Static files not loading
- Gunicorn serves static files automatically in production
- Check `STATIC_ROOT` setting

### Migration errors
- Check logs for specific error
- You can run migrations manually via Railway CLI or web terminal

## 🔐 Security Checklist

Before going live:
- [ ] `SECRET_KEY` is a random, secure value
- [ ] `DEBUG=False`
- [ ] `ALLOWED_HOSTS` includes your domains
- [ ] HTTPS enabled (automatic on Railway)
- [ ] CORS origins configured correctly
- [ ] Email backend configured
- [ ] Database credentials are secure (handled by Railway)

## 📊 Monitoring

Railway provides:
- Real-time logs
- Metrics (CPU, Memory, Network)
- Deployment history

For additional monitoring, consider:
- **Sentry** - Error tracking (free tier available)
- **UptimeRobot** - Uptime monitoring (free)
- **LogTail** - Advanced log aggregation

## 🎉 Next Steps

1. ✅ Deploy to Railway
2. ✅ Configure custom domain (optional, in Railway settings)
3. ✅ Set up monitoring
4. ✅ Configure backups (Railway auto-backups included)
5. ✅ Test thoroughly
6. ✅ Go live! 🚀

## 📚 Resources

- [Railway Docs](https://docs.railway.app)
- [Django Deployment Guide](https://docs.djangoproject.com/en/4.2/howto/deployment/)
- [Vercel Docs](https://vercel.com/docs)

---

**Need Help?** Check Railway's Discord or documentation.

