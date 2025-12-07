# 🚀 Quick Start Guide - Advanced Features

## Getting Started

### 1. Database Migrations
```bash
cd backend
python manage.py makemigrations core
python manage.py migrate
```

### 2. Run Redis (Required for caching and WebSockets)
```bash
# Windows: Download Redis from https://github.com/microsoftarchive/redis/releases
# Or use Docker:
docker run -d -p 6379:6379 redis:latest
```

### 3. Start Backend
```bash
cd backend
python manage.py runserver
```

### 4. Start Frontend
```bash
cd frontend
npm run dev
```

---

## Using Advanced Features

### PWA Installation
1. Open the app in Chrome/Edge
2. Look for install prompt or click menu → "Install Retail SaaS"
3. App will be installable on desktop/mobile
4. Works offline with cached data

### Export Data
```tsx
// In any component with data
import ExportImport from '@/components/ExportImport';

<ExportImport 
  data={yourDataArray} 
  filename="my-export"
/>
```

### Import Data
```tsx
<ExportImport 
  data={existingData}
  filename="import"
  onImport={(importedData) => {
    // Handle imported data
    console.log('Imported:', importedData);
    // Process and save to API
  }}
/>
```

### Dark Mode
- Click the theme toggle button in sidebar
- Or press Ctrl+Shift+D (customizable)
- Preference is saved automatically

### Keyboard Shortcuts
- `Ctrl+K` / `Cmd+K` - Global search
- `Ctrl+1` - Dashboard
- `Ctrl+2` - POS
- `Ctrl+3` - Products
- `Ctrl+4` - Sales
- `Esc` - Close modals

### Webhooks
```python
# Create webhook via API
POST /api/webhooks/webhooks/
{
  "name": "My Webhook",
  "url": "https://example.com/webhook",
  "events": ["sale.created", "product.created"],
  "secret": "auto-generated-or-custom"
}

# Test webhook
POST /api/webhooks/webhooks/{id}/test/
```

### Analytics
```python
from core.analytics import SalesInsights

# Get insights
insights = SalesInsights(sales_queryset)
top_products = insights.get_top_products(limit=10)
clv = insights.get_customer_lifetime_value()
velocity = insights.get_sales_velocity()
```

### Performance Monitoring
- Automatic tracking via middleware
- View metrics in Django admin: `/admin/core/performancemetric/`
- View errors: `/admin/core/errorlog/`

### Audit Logs
- Automatic tracking of all model changes
- View in admin: `/admin/core/auditlog/`
- Includes user, IP, changes, metadata

---

## Configuration

### Redis Configuration
Update `backend/retail_saas/settings.py` if Redis is on different host/port:
```python
REDIS_URL = 'redis://localhost:6379/1'
```

### WebSocket Configuration
WebSockets work automatically. To test:
```javascript
// Frontend WebSocket connection
import { wsClient } from '@/lib/websocket';

wsClient.connect(token).then(() => {
  wsClient.on('notification', (data) => {
    console.log('Notification:', data);
  });
});
```

### Cache Configuration
Caching is automatic. To manually cache:
```python
from core.cache import CacheManager

@CacheManager.cached('products', timeout=300)
def get_products():
    return Product.objects.all()
```

---

## Production Checklist

- [ ] Replace PWA icons (192x192 and 512x512 PNGs)
- [ ] Configure Redis for production
- [ ] Set up error tracking service (Sentry, etc.)
- [ ] Configure webhook secrets
- [ ] Set up monitoring alerts
- [ ] Configure CORS for production domains
- [ ] Enable HTTPS for PWA
- [ ] Set up database backups
- [ ] Configure email settings
- [ ] Set up Celery workers for background tasks

---

## Troubleshooting

### PWA not installing
- Ensure HTTPS (or localhost)
- Check manifest.json is accessible
- Verify service worker is registered

### WebSockets not connecting
- Check Redis is running
- Verify CHANNEL_LAYERS config
- Check firewall settings

### Cache not working
- Verify Redis is running
- Check CACHES configuration
- Clear cache: `python manage.py shell` → `from django.core.cache import cache; cache.clear()`

### Export/Import errors
- Check file format (must be .xlsx, .xls, or .csv)
- Verify data structure matches
- Check browser console for errors

---

## Support

For issues or questions:
1. Check `ADVANCED_FEATURES.md` for detailed documentation
2. Review code comments in feature files
3. Check Django admin for logs and metrics

---

**🎉 Enjoy your world-class Retail SaaS platform!**

