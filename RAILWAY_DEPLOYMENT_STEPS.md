# 🚂 Railway Deployment - Step by Step Guide

Follow these steps to deploy your RetailCloud system to Railway.

## Prerequisites

✅ Code is pushed to GitHub
✅ Dockerfile is ready (already configured)
✅ Environment variables documented

## Step 1: Sign Up for Railway

1. Go to [railway.app](https://railway.app)
2. Click "**Start a New Project**"
3. Sign up with **GitHub** (recommended for easy deployment)

## Step 2: Create a New Project

1. Click "**New Project**"
2. Select "**Deploy from GitHub repo**"
3. Select your repository: `RetailCloud`
4. Railway will detect the Dockerfile automatically

## Step 3: Configure Backend Service

### Set Root Directory

1. Click on the service that was created
2. Go to **Settings** tab
3. Set **Root Directory** to: `backend`
4. Railway will now look for the Dockerfile in the `backend/` folder

### Configure Start Command (Optional)

Railway will use the CMD from Dockerfile, but you can override it in Settings → Deploy → Start Command if needed.

## Step 4: Add PostgreSQL Database

1. In your Railway project, click "**+ New**"
2. Select "**Database**"
3. Select "**Add PostgreSQL**"
4. Railway will automatically create a PostgreSQL instance
5. **Note the service name** (usually "Postgres")

## Step 5: Add Redis (Recommended)

1. Click "**+ New**" again
2. Select "**Database**"
3. Select "**Add Redis**"
4. Railway will create a Redis instance
5. **Note the service name** (usually "Redis")

## Step 6: Configure Environment Variables

In your **backend service**, go to the **Variables** tab and add these:

### Security Settings (Required)

```bash
SECRET_KEY=r9e8@nm*qit8v*ospzteherej2ht9v_s9)eqxz+^0gkfsz+r_)
DEBUG=False
ALLOWED_HOSTS=*.railway.app,your-custom-domain.com
```

**⚠️ Important**: Replace the SECRET_KEY with a new one generated using:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Database Variables (Auto-provided by Railway)

Click "**Add Reference**" and select your PostgreSQL service, then add these:

```bash
DB_HOST=${{Postgres.PGHOST}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_PORT=${{Postgres.PGPORT}}
```

### Redis Variables (Auto-provided by Railway)

Click "**Add Reference**" and select your Redis service, then add:

```bash
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
```

### CORS & Frontend URL

```bash
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app
```

**Note**: Update these after deploying your frontend!

### Email Configuration (Required for Production)

```bash
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

**⚠️ For Gmail**: You need to:
1. Enable 2-Factor Authentication
2. Generate an App Password at: https://myaccount.google.com/apppasswords
3. Use the App Password (not your regular password)

### Payment Gateway (Optional - if using Stripe)

```bash
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_ENABLED=True
STRIPE_WEBHOOK_SECRET=whsec_...
```

## Step 7: Deploy Backend

1. Go to the **Deployments** tab
2. Railway should automatically start building and deploying
3. Watch the logs for any errors
4. Once deployed, note the **generated domain** (e.g., `your-app.railway.app`)

## Step 8: Create Superuser

After the first deployment, create a superuser:

### Option A: Using Railway CLI (Recommended)

1. Install Railway CLI:
   ```powershell
   iwr https://railway.app/install.sh | iex
   ```

2. Login:
   ```bash
   railway login
   ```

3. Link to your project:
   ```bash
   railway link
   ```

4. Run migrations and create superuser:
   ```bash
   railway run python manage.py migrate
   railway run python manage.py createsuperuser
   ```

### Option B: Using Railway Web Terminal

1. Go to your backend service
2. Click on the latest deployment
3. Click "**View Logs**" → "**Shell**"
4. Run:
   ```bash
   python manage.py migrate
   python manage.py createsuperuser
   ```

## Step 9: Deploy Frontend to Vercel (Recommended)

1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub
3. Click "**Add New**" → "**Project**"
4. Import your repository: `Shop Management`
5. Configure:
   - **Root Directory**: `frontend`
   - **Framework Preset**: Vite
   - **Build Command**: `npm install && npm run build`
   - **Output Directory**: `dist`
6. Add Environment Variable:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-backend.railway.app/api`
   (Replace with your actual Railway backend URL)
7. Click "**Deploy**"
8. Note your frontend URL (e.g., `your-app.vercel.app`)

## Step 10: Update CORS Settings

After deploying the frontend, update Railway environment variables:

1. Go back to Railway → Backend Service → Variables
2. Update:
   ```bash
   CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
   FRONTEND_URL=https://your-frontend.vercel.app
   ```
3. Railway will automatically redeploy

## Step 11: Test Your Deployment

1. **Backend Health Check**: Visit `https://your-backend.railway.app/admin/`
2. **API Test**: Visit `https://your-backend.railway.app/api/`
3. **Frontend**: Visit your Vercel URL
4. **Login**: Test login functionality
5. **API Connection**: Verify frontend can connect to backend

## Step 12: (Optional) Configure Custom Domain

### Backend Domain (Railway)

1. Go to Railway → Backend Service → Settings → Domains
2. Click "**Generate Domain**" or "**Add Domain**"
3. Follow instructions to configure DNS

### Frontend Domain (Vercel)

1. Go to Vercel → Project → Settings → Domains
2. Add your custom domain
3. Configure DNS as instructed

## Troubleshooting

### Backend won't start
- Check logs in Railway dashboard
- Verify all environment variables are set correctly
- Ensure `ALLOWED_HOSTS` includes your Railway domain
- Check that `DEBUG=False`

### Database connection errors
- Verify database variables use Railway's reference syntax: `${{Postgres.PGHOST}}`
- Check that PostgreSQL service is running
- Ensure database service name matches the reference

### CORS errors
- Verify `CORS_ALLOWED_ORIGINS` includes your frontend URL (no trailing slash)
- Restart backend service after updating CORS settings
- Check browser console for exact error

### Static files not loading
- Gunicorn serves static files automatically
- Check `STATIC_ROOT` setting in Django
- Verify `collectstatic` ran during build

### Migration errors
- Check deployment logs
- Run migrations manually: `railway run python manage.py migrate`
- Check for conflicting migrations

## Environment Variables Checklist

Before going live, verify you have:

- [ ] `SECRET_KEY` (random, secure value)
- [ ] `DEBUG=False`
- [ ] `ALLOWED_HOSTS` (includes Railway domain)
- [ ] Database variables (DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT)
- [ ] Redis variables (REDIS_HOST, REDIS_PORT)
- [ ] `CORS_ALLOWED_ORIGINS` (frontend URL)
- [ ] `FRONTEND_URL` (frontend URL)
- [ ] Email configuration (EMAIL_HOST, EMAIL_PORT, etc.)
- [ ] Payment gateway keys (if using Stripe/PayPal)

## Cost Estimate

### Monthly Costs:
- **Backend Service**: $5/month (512MB RAM)
- **PostgreSQL**: $5/month (1GB storage)
- **Redis**: Free (25MB tier) or $3/month (100MB)
- **Frontend (Vercel)**: Free
- **Total**: ~$10/month

## Next Steps

1. ✅ Deploy backend to Railway
2. ✅ Deploy frontend to Vercel
3. ✅ Configure environment variables
4. ✅ Test all functionality
5. ✅ Set up monitoring (Sentry, LogTail, etc.)
6. ✅ Configure backups
7. ✅ Go live! 🚀

---

**Need Help?** Check Railway's documentation: https://docs.railway.app


