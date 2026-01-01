# 🚀 Quick Start: Create Owner User

## Fastest Way to Create an Owner

Run this command in your terminal:

```bash
cd backend
python manage.py create_owner --email owner@yourapp.com --password YourPassword123
```

That's it! 🎉

## Full Example

```bash
python manage.py create_owner \
  --email admin@retailsaas.com \
  --password SecurePass123! \
  --first-name "System" \
  --last-name "Administrator"
```

## Then Login

1. Start your frontend server:
   ```bash
   cd frontend
   npm run dev
   ```

2. Go to: `http://localhost:3000/owner/login`

3. Login with:
   - **Email**: The email you used above
   - **Password**: The password you set

## Verify It Worked

The command will show:
```
✅ Successfully created system owner:
   Email: owner@yourapp.com
   Username: owner@yourapp.com
   Role: Super Admin
   Tenant: None (System Owner)

📝 You can now login to the Owner Portal at:
   http://localhost:3000/owner/login
```

## Common Issues

### User Already Exists
If you get an error that the user already exists, either:
1. Use a different email
2. Delete the existing user first
3. Update the existing user (see below)

### Update Existing User to Owner

If you already have a user and want to make them an owner:

```bash
python manage.py shell
```

```python
from accounts.models import User

user = User.objects.get(email='existing@email.com')
user.role = 'super_admin'
user.tenant = None
user.is_staff = True
user.is_superuser = True
user.save()
print("✅ Updated user to owner")
```

---

**That's it!** You're ready to access the Owner Portal. 👑




