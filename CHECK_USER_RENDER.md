# Quick Check User Status on Render

Run this in Render Shell to check your user status:

```bash
cd backend
python manage.py shell
```

Then paste this Python code:

```python
from accounts.models import User

# Check by username
try:
    user = User.objects.get(username='owner')
    print(f"✓ User found by username")
    print(f"  Username: {user.username}")
    print(f"  Email: {user.email}")
    print(f"  Active: {user.is_active}")
    print(f"  Staff: {user.is_staff}")
    print(f"  Superuser: {user.is_superuser}")
    print(f"  Tenant: {user.tenant}")
except User.DoesNotExist:
    print("✗ User 'owner' not found by username")

# Check by email
try:
    user = User.objects.get(email='owner@retailcloud.com')
    print(f"✓ User found by email")
    print(f"  Username: {user.username}")
    print(f"  Email: {user.email}")
    print(f"  Active: {user.is_active}")
    print(f"  Staff: {user.is_staff}")
    print(f"  Superuser: {user.is_superuser}")
    print(f"  Tenant: {user.tenant}")
except User.DoesNotExist:
    print("✗ User 'owner@retailcloud.com' not found by email")

# List all users
print("\nAll users in system:")
for u in User.objects.all():
    print(f"  - {u.username} ({u.email}) - Active: {u.is_active}, Staff: {u.is_staff}, Superuser: {u.is_superuser}")

exit()
```

This will show you:
1. If the user exists
2. If the user is active
3. If the user has staff/superuser privileges
4. All users in the system

