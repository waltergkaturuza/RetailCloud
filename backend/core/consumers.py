"""
WebSocket consumers for real-time features.
"""
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from accounts.models import User


class NotificationConsumer(AsyncWebsocketConsumer):
    """Consumer for real-time notifications."""
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return
        
        self.room_group_name = f"user_{self.user.id}_notifications"
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Receive message from WebSocket."""
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')
        
        if message_type == 'ping':
            await self.send(text_data=json.dumps({
                'type': 'pong'
            }))
    
    async def notification_message(self, event):
        """Send notification to WebSocket."""
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'data': message
        }))


class SalesConsumer(AsyncWebsocketConsumer):
    """Consumer for real-time sales updates."""
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return
        
        # Get tenant from user
        tenant_id = await self.get_tenant_id()
        if tenant_id:
            self.room_group_name = f"tenant_{tenant_id}_sales"
        else:
            await self.close()
            return
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'room_group_name'):
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
    
    @database_sync_to_async
    def get_tenant_id(self):
        """Get tenant ID from user."""
        if hasattr(self.user, 'tenant') and self.user.tenant:
            return self.user.tenant.id
        return None
    
    async def sales_update(self, event):
        """Send sales update to WebSocket."""
        message = event['message']
        await self.send(text_data=json.dumps({
            'type': 'sales_update',
            'data': message
        }))


