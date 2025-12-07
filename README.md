# RetailCloud - Shop Management SaaS Platform

A comprehensive, multi-tenant SaaS platform for retail businesses to manage point of sale, inventory, purchases, customers, suppliers, and advanced analytics.

## 🚀 Features

### Core Modules
- **Inventory Management**: Products, categories, variants, stock levels, batch/expiry tracking
- **Point of Sale (POS)**: Touch-friendly interface, barcode scanning, multiple payment methods
- **Sales Management**: Customer profiles, loyalty points, credit sales, receipts
- **Purchase Management**: Purchase orders, GRN, supplier management
- **Customer Management**: Profiles, loyalty programs, credit tracking
- **Supplier Management**: Supplier database, payment tracking
- **Financial Reporting**: Sales reports, P&L, inventory valuation
- **User Management**: Role-based access control (Admin, Cashier, Supervisor, etc.)

### Advanced Features
- **Multi-Tenant Architecture**: Isolated data per client
- **Subscription Management**: Package-based or module-based subscriptions
- **Multi-Branch Support**: Manage multiple store locations
- **Audit Trail**: Complete activity logging
- **Offline POS**: (Coming soon)
- **AI Analytics**: (Coming soon)
- **E-commerce Integration**: (Coming soon)

## 🛠 Tech Stack

### Backend
- **Django 4.2** - Web framework
- **Django REST Framework** - API
- **PostgreSQL** - Database
- **Celery + Redis** - Background tasks
- **JWT** - Authentication

### Frontend
- **React** - UI framework (To be implemented)
- **TypeScript** - Type safety (To be implemented)

## 📋 Prerequisites

- Python 3.10+
- PostgreSQL 12+
- Redis (for Celery)
- Node.js 18+ (for frontend)

## 🔧 Installation

### Backend Setup

1. **Clone the repository**
```bash
cd backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Configure environment**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Setup database**
```bash
python manage.py migrate
python manage.py createsuperuser
```

6. **Run development server**
```bash
python manage.py runserver
```

### Database Setup

1. Create PostgreSQL database:
```sql
CREATE DATABASE retail_saas;
```

2. Run migrations:
```bash
python manage.py migrate
```

3. Create initial modules and packages:
```bash
python manage.py shell
# Then run scripts to create default modules/packages
```

## 📁 Project Structure

```
backend/
├── retail_saas/          # Main project settings
├── core/                 # Core models (Tenant, Module, Package, Audit)
├── accounts/             # User authentication & management
├── subscriptions/        # Subscription & billing
├── inventory/            # Products & stock management
├── pos/                  # Point of sale
├── sales/                # Sales reporting
├── customers/            # Customer management
├── suppliers/            # Supplier management
├── purchases/            # Purchase orders & GRN
├── reports/              # Financial reports
└── analytics/            # Advanced analytics (future)

frontend/                 # React frontend (to be implemented)
```

## 🔐 User Roles

- **Super Admin**: Platform owner, manages tenants
- **Tenant Admin**: Full access to company account
- **Supervisor**: Approvals, reporting, stock oversight
- **Cashier**: POS access, sales only
- **Stock Controller**: Inventory, purchases, GRN
- **Accountant**: Financial reports, expenses
- **Auditor**: Read-only access to logs

## 📦 Subscription Packages

- **Starter**: $10/month - POS, Inventory, Basic Reporting
- **Business**: $25/month - + Customer Loyalty, Purchase Management, Permissions
- **Professional**: $45/month - + Multi-branch, AI Analytics, Barcode Automation
- **Enterprise**: $75+/month - All features, API access, Custom integrations

## 🌍 Multi-Tenancy

The system uses a multi-tenant architecture where:
- Each client (tenant) has isolated data
- Tenants are identified by subdomain or header
- All queries are automatically filtered by tenant
- Subscription determines enabled modules

## 🔌 API Endpoints

### Authentication
- `POST /api/auth/auth/register/` - Register new tenant
- `POST /api/auth/auth/login/` - Login
- `POST /api/auth/auth/logout/` - Logout
- `GET /api/auth/auth/me/` - Current user info

### Inventory
- `GET /api/inventory/products/` - List products
- `POST /api/inventory/products/` - Create product
- `GET /api/inventory/stock-levels/` - Stock levels
- `POST /api/inventory/products/{id}/adjust_stock/` - Adjust stock

### POS
- `POST /api/pos/sales/` - Create sale
- `GET /api/pos/sales/` - List sales
- `POST /api/pos/sales/{id}/void/` - Void sale (requires supervisor PIN)

### Customers
- `GET /api/customers/customers/` - List customers
- `POST /api/customers/customers/` - Create customer

### Reports
- `GET /api/reports/sales/` - Sales report
- `GET /api/reports/inventory/` - Inventory report
- `GET /api/reports/profit-loss/` - P&L report

## 📝 Development Notes

### Adding a New Module

1. Create module in `core.models.Module`
2. Create app with models, views, serializers
3. Add app to `INSTALLED_APPS`
4. Create URL patterns
5. Add module check in views/permissions

### Testing Multi-Tenancy

Use subdomain or `X-Tenant-ID` header:
```bash
curl -H "X-Tenant-ID: tenant-slug" http://localhost:8000/api/products/
```

## 🚧 Roadmap

- [ ] React frontend implementation
- [ ] Offline POS mode
- [ ] AI-powered analytics
- [ ] E-commerce integrations (Shopify, WooCommerce)
- [ ] Mobile apps (React Native)
- [ ] WhatsApp/SMS notifications
- [ ] Barcode/QR code generation
- [ ] Accounting integrations (Xero, QuickBooks)
- [ ] Advanced security features
- [ ] Delivery management module

## 📄 License

Proprietary - All rights reserved

## 🤝 Support

For support, email support@retailsaas.com or create an issue.

## 👥 Contributors

- Initial development by [Your Name]

---

**Built with ❤️ for retail businesses in Zimbabwe and beyond**

