# Quick Start Guide

Get your Retail SaaS system up and running in minutes!

## Prerequisites

- Python 3.10+
- PostgreSQL 12+
- Redis (optional, for Celery)
- Node.js 18+ (for frontend)

## Step 1: Backend Setup

```bash
# Navigate to backend directory
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On Linux/Mac:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Edit .env with your database credentials
```

## Step 2: Database Setup

```bash
# Create PostgreSQL database
createdb retail_saas

# Or using psql:
# psql -U postgres
# CREATE DATABASE retail_saas;

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Setup default modules and packages
python manage.py setup_modules
```

## Step 3: Run Backend

```bash
# Start development server
python manage.py runserver
```

Backend will be available at `http://localhost:8000`

## Step 4: Frontend Setup (Optional)

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will be available at `http://localhost:3000`

## Step 5: Access Admin Panel

1. Go to `http://localhost:8000/admin`
2. Login with your superuser credentials
3. You can now:
   - Create tenants (clients)
   - Manage modules and packages
   - View audit logs
   - Manage all data

## Creating Your First Tenant

1. **Via Admin Panel:**
   - Go to `/admin/core/tenant/add/`
   - Fill in company details
   - Set subscription status (trial/active)
   - Save

2. **Create Tenant Admin User:**
   - Go to `/admin/accounts/user/add/`
   - Create user with role "Tenant Admin"
   - Assign to the tenant

## Testing the API

```bash
# Login and get token
curl -X POST http://localhost:8000/api/auth/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "yourpassword", "tenant_slug": "your-tenant-slug"}'

# Use token for authenticated requests
curl -X GET http://localhost:8000/api/inventory/products/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "X-Tenant-ID: your-tenant-slug"
```

## Next Steps

1. **Create Products:** Use the inventory API to add products
2. **Setup Stock:** Create stock levels for your products
3. **Create Customers:** Add customer records
4. **Start Selling:** Use the POS API to process sales
5. **View Reports:** Access sales and inventory reports

## Docker Setup (Alternative)

If you prefer Docker:

```bash
# Build and start all services
docker-compose up -d

# Run migrations
docker-compose exec backend python manage.py migrate
docker-compose exec backend python manage.py setup_modules
docker-compose exec backend python manage.py createsuperuser
```

## Common Issues

### Database Connection Error
- Ensure PostgreSQL is running
- Check `.env` file has correct database credentials
- Verify database exists

### Module Import Errors
- Ensure virtual environment is activated
- Run `pip install -r requirements.txt` again
- Check Python version (3.10+)

### Port Already in Use
- Change port: `python manage.py runserver 8001`
- Or kill the process using the port

## Need Help?

- Check the main README.md for detailed documentation
- Review the API endpoints in the codebase
- Check Django admin at `/admin` for data management

Happy coding! 🚀

