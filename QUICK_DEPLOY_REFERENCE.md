# 🚀 Quick Deployment Reference

## Generated SECRET_KEY

**⚠️ IMPORTANT**: Use this SECRET_KEY in Railway environment variables:

```
r9e8@nm*qit8v*ospzteherej2ht9v_s9)eqxz+^0gkfsz+r_)
```

Or generate a new one:
```bash
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

## Railway Deployment Checklist

### 1. Railway Setup (5 minutes)
- [ ] Sign up at railway.app
- [ ] Create new project from GitHub
- [ ] Set Root Directory to `backend`
- [ ] Add PostgreSQL database
- [ ] Add Redis database

### 2. Environment Variables (Copy-paste ready)

**Security:**
```
SECRET_KEY=r9e8@nm*qit8v*ospzteherej2ht9v_s9)eqxz+^0gkfsz+r_)
DEBUG=False
ALLOWED_HOSTS=*.railway.app
```

**Database (Use Railway References):**
```
DB_HOST=${{Postgres.PGHOST}}
DB_NAME=${{Postgres.PGDATABASE}}
DB_USER=${{Postgres.PGUSER}}
DB_PASSWORD=${{Postgres.PGPASSWORD}}
DB_PORT=${{Postgres.PGPORT}}
```

**Redis (Use Railway References):**
```
REDIS_HOST=${{Redis.REDISHOST}}
REDIS_PORT=${{Redis.REDISPORT}}
```

**CORS (Update after frontend deploy):**
```
CORS_ALLOWED_ORIGINS=https://your-frontend.vercel.app
FRONTEND_URL=https://your-frontend.vercel.app
```

**Email (Required):**
```
EMAIL_BACKEND=django.core.mail.backends.smtp.EmailBackend
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USE_TLS=True
EMAIL_HOST_USER=your-email@gmail.com
EMAIL_HOST_PASSWORD=your-gmail-app-password
DEFAULT_FROM_EMAIL=noreply@yourdomain.com
```

### 3. Deploy & Test
- [ ] Deploy backend (automatic on Railway)
- [ ] Note backend URL (e.g., `your-app.railway.app`)
- [ ] Create superuser: `railway run python manage.py createsuperuser`
- [ ] Test backend: Visit `https://your-app.railway.app/admin/`

### 4. Frontend Deployment (Vercel)
- [ ] Sign up at vercel.com
- [ ] Import GitHub repo
- [ ] Set Root Directory: `frontend`
- [ ] Build Command: `npm install && npm run build`
- [ ] Output Directory: `dist`
- [ ] Environment Variable: `VITE_API_URL=https://your-backend.railway.app/api`
- [ ] Deploy

### 5. Final Steps
- [ ] Update CORS in Railway with frontend URL
- [ ] Test login from frontend
- [ ] Verify API connection
- [ ] Go live! 🎉

## Quick Commands

### Generate SECRET_KEY
```bash
cd backend
python -c "from django.core.management.utils import get_random_secret_key; print(get_random_secret_key())"
```

### Railway CLI Commands
```bash
# Install
iwr https://railway.app/install.sh | iex

# Login & Link
railway login
railway link

# Run commands
railway run python manage.py migrate
railway run python manage.py createsuperuser
```

### Test Backend
```bash
# Health check
curl https://your-app.railway.app/admin/

# API test
curl https://your-app.railway.app/api/
```

## Cost
- Backend: $5/month
- PostgreSQL: $5/month
- Redis: Free (25MB)
- Frontend: Free (Vercel)
- **Total: ~$10/month**

## Support Docs
- Full Guide: `RAILWAY_DEPLOYMENT_STEPS.md`
- Deployment Checklist: `DEPLOYMENT_CHECKLIST.md`
- Platform Comparison: `DEPLOYMENT_SUMMARY.md`

