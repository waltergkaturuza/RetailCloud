# Reset Password on Render

If your login credentials are failing, you can reset the password or create a new superuser.

## Option 1: Reset Password for Existing User

1. Go to your Render Dashboard
2. Navigate to your backend service (retailcloud-backend)
3. Go to "Shell" tab
4. Run:

```bash
cd backend
python manage.py changepassword owner
```

Then enter the new password when prompted (use: `@Dm1n_123!` or your preferred password)

## Option 2: Create a New Superuser

If the user doesn't exist, create one:

```bash
cd backend
python manage.py createsuperuser
```

Enter:
- Username: owner
- Email: owner@retailcloud.com
- Password: @Dm1n_123! (or your preferred password)

## Option 3: Use Django Shell to Reset Password

```bash
cd backend
python manage.py shell
```

Then in the shell:

```python
from accounts.models import User
user = User.objects.get(username='owner')  # or email='owner@retailcloud.com'
user.set_password('@Dm1n_123!')
user.save()
exit()
```

## Option 4: Check if User Exists

First, verify the user exists:

```bash
cd backend
python manage.py shell
```

Then:

```python
from accounts.models import User
try:
    user = User.objects.get(username='owner')
    print(f"User found: {user.username}, Email: {user.email}, Active: {user.is_active}, Staff: {user.is_staff}, Superuser: {user.is_superuser}")
except User.DoesNotExist:
    print("User 'owner' does not exist")
```

## Option 5: Create System Owner (if using the custom command)

If you have the custom create_owner command:

```bash
cd backend
python manage.py create_owner \
    --email owner@retailcloud.com \
    --password @Dm1n_123! \
    --username owner \
    --first-name "Walter" \
    --last-name "Katuruza"
```

## Troubleshooting

### If user doesn't exist:
- Use Option 2 or Option 5 to create the user

### If user exists but password doesn't work:
- Use Option 1 or Option 3 to reset the password

### If user is inactive:
In Django shell:
```python
from accounts.models import User
user = User.objects.get(username='owner')
user.is_active = True
user.is_staff = True
user.is_superuser = True
user.save()
```

### Common Issues:
1. **Database was reset**: If the database was recreated, all users are gone - create new one
2. **Password changed**: Someone/something changed it - reset it
3. **User inactive**: Check `is_active` flag
4. **Case sensitivity**: Username/password might be case-sensitive
5. **Special characters**: Make sure special characters in password are typed correctly


