# ✅ Deployment Checklist

Use this checklist before deploying your RetailCloud system to production.

## 📋 Pre-Deployment

### Code Preparation
- [ ] All code committed to Git repository
- [ ] Production Dockerfile created and tested
- [ ] `.dockerignore` file created
- [ ] `requirements.txt` includes `gunicorn` and `psycopg2-binary`
- [ ] Environment variables documented

### Security
- [ ] Generate new `SECRET_KEY` (never use default)
- [ ] Set `DEBUG=False` in production environment
- [ ] Configure `ALLOWED_HOSTS` with your domain(s)
- [ ] Update `CORS_ALLOWED_ORIGINS` with frontend URL(s)
- [ ] Review and remove any hardcoded credentials
- [ ] Enable HTTPS/SSL (automatic on Railway/Render)

### Database
- [ ] PostgreSQL database created and accessible
- [ ] Database migrations tested locally
- [ ] Backup strategy planned
- [ ] Database connection string verified

### Redis
- [ ] Redis instance created (if using Celery/caching)
- [ ] Redis connection verified

### Email Configuration
- [ ] Email backend configured (SMTP)
- [ ] Email credentials set in environment variables
- [ ] Test email sending functionality
- [ ] Gmail App Password created (if using Gmail)

### Payment Gateway (if applicable)
- [ ] Stripe/PayPal keys configured
- [ ] Webhook endpoints configured
- [ ] Test payment flow

## 🚀 Deployment Steps

### Platform Setup
- [ ] Account created on deployment platform (Railway/Render/etc.)
- [ ] PostgreSQL service added
- [ ] Redis service added (if needed)
- [ ] Backend service created

### Environment Variables
Set these in your deployment platform:

**Required:**
- [ ] `SECRET_KEY` - Django secret key
- [ ] `DEBUG=False`
- [ ] `ALLOWED_HOSTS` - Your domain(s)
- [ ] `DB_HOST` - Database host (usually auto-provided)
- [ ] `DB_NAME` - Database name (usually auto-provided)
- [ ] `DB_USER` - Database user (usually auto-provided)
- [ ] `DB_PASSWORD` - Database password (usually auto-provided)
- [ ] `DB_PORT` - Database port (usually auto-provided)
- [ ] `REDIS_HOST` - Redis host (usually auto-provided)
- [ ] `REDIS_PORT` - Redis port (usually auto-provided)
- [ ] `CORS_ALLOWED_ORIGINS` - Frontend URL(s)
- [ ] `FRONTEND_URL` - Frontend URL for email links

**Email (Required for production):**
- [ ] `EMAIL_BACKEND` - `django.core.mail.backends.smtp.EmailBackend`
- [ ] `EMAIL_HOST` - SMTP host
- [ ] `EMAIL_PORT` - SMTP port (usually 587)
- [ ] `EMAIL_USE_TLS=True`
- [ ] `EMAIL_HOST_USER` - SMTP username
- [ ] `EMAIL_HOST_PASSWORD` - SMTP password/app password
- [ ] `DEFAULT_FROM_EMAIL` - Sender email address

**Payment Gateway (Optional):**
- [ ] `STRIPE_PUBLISHABLE_KEY`
- [ ] `STRIPE_SECRET_KEY`
- [ ] `STRIPE_ENABLED=True`
- [ ] `STRIPE_WEBHOOK_SECRET`

### Backend Deployment
- [ ] Repository connected to deployment platform
- [ ] Build command verified (if needed)
- [ ] Start command configured (Gunicorn)
- [ ] Port configuration correct (8000 or platform-assigned)
- [ ] Service deployed successfully
- [ ] Logs checked for errors

### Frontend Deployment
- [ ] Frontend built (`npm run build`)
- [ ] Frontend deployed (Vercel/Netlify/Railway)
- [ ] API URL updated in frontend config
- [ ] Frontend URL added to backend CORS settings

### Post-Deployment
- [ ] Database migrations ran successfully
- [ ] Create superuser: `python manage.py createsuperuser`
- [ ] Test login functionality
- [ ] Test API endpoints
- [ ] Verify static files are served correctly
- [ ] Test email sending
- [ ] Check error logs
- [ ] Test payment flow (if applicable)

## 🔍 Testing Checklist

### Functionality Tests
- [ ] User registration/login
- [ ] Dashboard loads
- [ ] Inventory management
- [ ] POS functionality
- [ ] Sales reporting
- [ ] Customer management
- [ ] Purchase orders
- [ ] Financial reports

### Performance Tests
- [ ] Page load times acceptable (< 2s)
- [ ] API response times acceptable (< 500ms)
- [ ] Database queries optimized
- [ ] Static files loading correctly

### Security Tests
- [ ] HTTPS working correctly
- [ ] CORS working correctly
- [ ] Authentication required for protected endpoints
- [ ] No sensitive data in error messages
- [ ] Rate limiting working (if implemented)

## 📊 Monitoring Setup

- [ ] Error tracking configured (Sentry, LogTail, etc.)
- [ ] Uptime monitoring (UptimeRobot, Pingdom, etc.)
- [ ] Log aggregation setup
- [ ] Performance monitoring (optional)

## 🔄 Backup & Maintenance

- [ ] Database backup schedule configured
- [ ] Backup restoration tested
- [ ] Update procedure documented
- [ ] Rollback procedure documented

## 📝 Documentation

- [ ] Deployment procedure documented
- [ ] Environment variables documented
- [ ] Troubleshooting guide created
- [ ] Support contacts listed

## ✅ Final Steps

- [ ] All tests passing
- [ ] Performance acceptable
- [ ] Security verified
- [ ] Monitoring active
- [ ] Team notified of deployment
- [ ] Documentation updated

---

**Deployment Date:** _______________

**Deployed By:** _______________

**Platform:** _______________

**Environment:** Production

**Notes:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________


