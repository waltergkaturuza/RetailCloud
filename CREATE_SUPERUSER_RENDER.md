# 👤 Create System Owner (Superuser) on Render

Your system has a dedicated command to create a **system owner** - a super_admin user without a tenant who has full access to the Owner Portal and Django admin.

## Method 1: Using Render Shell (Recommended)

1. **Go to Render Dashboard** → Your Backend Web Service
2. **Click on "Shell"** tab (or go to "Logs" → "Shell" option)
3. **Run the create_owner command:**
   ```bash
   python manage.py create_owner --email owner@yourcompany.com --password @Dm1n_123!
   ```

4. **Optional parameters:**
   ```bash
   python manage.py create_owner \
     --email owner@retailcloud.com \
     --password @Dm1n_123! \
     --username owner \
     --first-name "Walter" \
     --last-name "Katuruza"
   ```

5. **Done!** The command will output:
   ```
   ✅ Successfully created system owner:
      Email: owner@yourcompany.com
      Username: owner
      Role: Super Admin
      Tenant: None (System Owner)
   
   📝 You can now login to the Owner Portal at:
      https://your-frontend.onrender.com/owner/login
   ```

## Method 2: Standard Django Superuser (Alternative)

If you prefer the standard Django superuser (also works):

1. **Open Render Shell**
2. **Run:**
   ```bash
   python manage.py createsuperuser
   ```
3. **Follow the prompts:**
   - Email address: (enter your email)
   - Username: (enter username or press Enter to use email)
   - Password: (enter a strong password)
   - Password (again): (confirm password)

**Note:** Standard `createsuperuser` creates a Django superuser but may not set `role='super_admin'` and `tenant=None` automatically. Use `create_owner` command for proper system owner setup.

## Method 3: Using Render CLI (Alternative)

If you have Render CLI installed:

```bash
# Login to Render
render login

# Connect to your service (get service ID from Render dashboard)
render shell --service <service-id>

# Then run
python manage.py create_owner --email owner@yourcompany.com --password YourSecurePassword123!
```

## What is a System Owner?

A **system owner** is:
- **Role**: `super_admin`
- **Tenant**: `None` (no tenant - this is the platform owner)
- **Access**: 
  - ✅ Owner Portal (`/owner/*` routes)
  - ✅ Django Admin Panel (`/admin/`)
  - ✅ Full access to manage all tenants, users, and system settings
  - ✅ Can create and manage tenants

## Important Notes

- ⚠️ **Use a strong password** (at least 8 characters recommended)
- ⚠️ **Save your credentials securely!**
- ⚠️ The email address must be unique
- ⚠️ The username is optional (defaults to email if not provided)

## After Creating Owner

1. **Test Django Admin**: Go to `https://your-backend.onrender.com/admin/`
   - Login with your owner credentials

2. **Test Owner Portal**: Go to `https://your-frontend.onrender.com/owner/login`
   - Login with your owner credentials
   - You should have full access to tenant management, user management, etc.

3. **Verify Access**:
   - ✅ Can see all tenants
   - ✅ Can create new tenants
   - ✅ Can manage all users across tenants
   - ✅ Can access system settings

---

**Need help?** Check Render docs: https://render.com/docs/ssh

