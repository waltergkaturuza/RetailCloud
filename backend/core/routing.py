"""
WebSocket routing for real-time features.
"""
from django.urls import path
from .consumers import NotificationConsumer, SalesConsumer

websocket_urlpatterns = [
    path('ws/notifications/', NotificationConsumer.as_asgi()),
    path('ws/sales/', SalesConsumer.as_asgi()),
]




