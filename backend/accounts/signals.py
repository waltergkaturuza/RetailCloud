"""
Django signals for User model.
"""
from django.db.models.signals import pre_save
from django.dispatch import receiver
from .models import User


@receiver(pre_save, sender=User)
def normalize_user_email(sender, instance, **kwargs):
    """
    Automatically normalize email addresses (lowercase, strip whitespace)
    before saving to ensure consistency and prevent duplicates.
    """
    if instance.email:
        normalized_email = instance.email.lower().strip()
        if instance.email != normalized_email:
            instance.email = normalized_email
