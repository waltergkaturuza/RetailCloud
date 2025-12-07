# 👑 How to Create a System Owner (Super Admin)

To access the Owner Portal, you need to create a user with `role='super_admin'` and `tenant=None`.

## Method 1: Using Management Command (Recommended) ✅

I've created a custom management command for this:

```bash
cd backend
python manage.py create_owner --email owner@yourapp.com --password YourSecurePassword123
```

### Optional Parameters:

```bash
python manage.py create_owner \
  --email owner@yourapp.com \
  --password YourSecurePassword123 \
  --username owner \
  --first-name "System" \
  --last-name "Owner"
```

### Options:
- `--email` (required): Email address for the owner
- `--password` (required): Password for the owner
- `--username` (optional): Username (defaults to email)
- `--first-name` (optional): First name
- `--last-name` (optional): Last name
- `--skip-validation` (optional): Skip password validation checks

### Example:

```bash
python manage.py create_owner \
  --email admin@retailsaas.com \
  --password SecurePass123! \
  --first-name "System" \
  --last-name "Administrator"
```

## Method 2: Using Django Shell

```bash
cd backend
python manage.py shell
```

Then in the Python shell:

```python
from accounts.models import User

# Create the owner user
owner = User.objects.create_user(
    username='owner',
    email='owner@yourapp.com',
    password='YourSecurePassword123',
    role='super_admin',
    tenant=None,  # No tenant - this is critical!
    is_staff=True,
    is_superuser=True,
    is_active=True,
)

print(f"✅ Created owner: {owner.email}")
print(f"   Role: {owner.get_role_display()}")
print(f"   Tenant: {owner.tenant}")  # Should be None
```

## Method 3: Using Django Admin

1. **Access Django Admin:**
   ```
   http://localhost:8000/admin
   ```

2. **Go to Users section**

3. **Add a new user:**
   - Username: `owner` (or your preferred username)
   - Email: `owner@yourapp.com`
   - Password: Set a secure password
   - **Role**: Select `Super Admin`
   - **Tenant**: Leave empty (None)
   - **Staff status**: ✅ Check this
   - **Superuser status**: ✅ Check this
   - **Active**: ✅ Check this

4. **Save the user**

## Method 4: Direct Database Insert (Not Recommended)

⚠️ **Only use this if you understand what you're doing:**

```python
from django.contrib.auth.hashers import make_password
from accounts.models import User

owner = User.objects.create(
    username='owner',
    email='owner@yourapp.com',
    password=make_password('YourSecurePassword123'),
    role='super_admin',
    tenant=None,
    is_staff=True,
    is_superuser=True,
    is_active=True,
)
```

## Verification

After creating the owner, verify it's set up correctly:

```bash
python manage.py shell
```

```python
from accounts.models import User

owner = User.objects.filter(role='super_admin', tenant__isnull=True).first()
if owner:
    print(f"✅ Owner found: {owner.email}")
    print(f"   Role: {owner.role}")
    print(f"   Tenant: {owner.tenant}")  # Should print None
    print(f"   Is Staff: {owner.is_staff}")
    print(f"   Is Superuser: {owner.is_superuser}")
else:
    print("❌ No owner found")
```

## Access Owner Portal

Once created, access the Owner Portal at:

```
http://localhost:3000/owner/login
```

Login with:
- **Email**: The email you used when creating the owner
- **Password**: The password you set

## Important Notes

1. **Tenant MUST be None**: The owner user must have `tenant=None` to access the Owner Portal
2. **Role MUST be 'super_admin'**: Only users with this role can access the portal
3. **Both conditions required**: Both `role='super_admin'` AND `tenant=None` must be true

## Troubleshooting

### "Access denied. Owner login only."
- Verify the user has `role='super_admin'`
- Verify the user has `tenant=None` (not assigned to any tenant)

### Can't find the user
```python
# Check all super_admin users
from accounts.models import User
super_admins = User.objects.filter(role='super_admin')
for user in super_admins:
    print(f"{user.email} - Tenant: {user.tenant}")
```

### Update existing user to be owner
```python
from accounts.models import User

user = User.objects.get(email='existing@email.com')
user.role = 'super_admin'
user.tenant = None
user.save()
```

---

**Recommended Method**: Use the management command (Method 1) as it includes validation and clear error messages.

