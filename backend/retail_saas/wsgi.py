"""
WSGI config for Retail SaaS Platform.
"""
import os

from django.core.wsgi import get_wsgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'retail_saas.settings')

application = get_wsgi_application()

