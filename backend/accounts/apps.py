from django.apps import AppConfig


class AccountsConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'accounts'
    
    def ready(self):
        """Import signals and security models when app is ready."""
        import accounts.security_models  # noqa
        import accounts.signals  # noqa: Import signals to register them

