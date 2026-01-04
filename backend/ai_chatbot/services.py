"""
AI CEO Chatbot service for processing queries and generating responses.
"""
import json
from typing import List, Dict, Optional
from django.utils import timezone
from datetime import timedelta
from .models import ChatConversation, ChatMessage, ChatContext
from core.models import Tenant
from accounts.models import User


class AIChatbotService:
    """Service for AI chatbot functionality."""
    
    def __init__(self, tenant: Tenant):
        self.tenant = tenant
        self.context = self._get_or_create_context()
    
    def _get_or_create_context(self) -> ChatContext:
        """Get or create chat context for tenant."""
        context, created = ChatContext.objects.get_or_create(tenant=self.tenant)
        if created:
            context.business_summary = self._generate_business_summary()
            context.key_metrics = self._get_key_metrics()
            context.save()
        return context
    
    def _generate_business_summary(self) -> str:
        """Generate a business summary for context."""
        # This will be enhanced with actual business data
        return f"{self.tenant.company_name} is a business using our retail management system."
    
    def _get_key_metrics(self) -> Dict:
        """Get key business metrics for context."""
        try:
            from sales.models import Sale
            from inventory.models import Product
            
            # Get recent sales data
            thirty_days_ago = timezone.now() - timedelta(days=30)
            recent_sales = Sale.objects.filter(
                tenant=self.tenant,
                created_at__gte=thirty_days_ago
            )
            
            total_sales = sum(float(sale.total_amount or 0) for sale in recent_sales)
            sale_count = recent_sales.count()
            product_count = Product.objects.filter(tenant=self.tenant).count()
            
            return {
                'total_sales_30d': total_sales,
                'sale_count_30d': sale_count,
                'total_products': product_count,
                'last_updated': timezone.now().isoformat(),
            }
        except Exception as e:
            # Log error but don't fail
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"Error getting key metrics for tenant {self.tenant.id}: {str(e)}")
            return {
                'total_sales_30d': 0,
                'sale_count_30d': 0,
                'total_products': 0,
                'last_updated': timezone.now().isoformat(),
            }
    
    def _build_system_prompt(self) -> str:
        """Build the system prompt for the AI."""
        summary = self.context.business_summary
        metrics = self.context.key_metrics
        
        system_prompt = f"""You are an AI CEO assistant for {self.tenant.company_name}, a retail business management system.

Your role is to:
1. Answer business questions clearly and concisely
2. Provide data-driven insights and recommendations
3. Help analyze business performance
4. Suggest improvements and best practices
5. Generate reports and summaries on demand

Business Context:
- Company: {self.tenant.company_name}
- Industry: {getattr(self.tenant.business_category, 'name', 'Retail') if self.tenant.business_category else 'Retail'}
- Summary: {summary}

Key Metrics (Last 30 days):
- Total Sales: ${metrics.get('total_sales_30d', 0):,.2f}
- Number of Sales: {metrics.get('sale_count_30d', 0)}
- Total Products: {metrics.get('total_products', 0)}

Guidelines:
- Be professional but friendly
- Use data to support your recommendations
- Provide actionable insights
- Keep responses concise unless detailed analysis is requested
- If you don't have access to specific data, say so and suggest how to get it
- Always consider the business context when making recommendations

Remember: You're helping a real business make better decisions. Be helpful, accurate, and practical."""
        
        return system_prompt
    
    def _get_conversation_history(self, conversation: ChatConversation, limit: int = 10) -> List[Dict]:
        """Get recent conversation history for context."""
        messages = ChatMessage.objects.filter(
            conversation=conversation
        ).order_by('-created_at')[:limit]
        
        # Reverse to get chronological order
        history = []
        for msg in reversed(messages):
            history.append({
                'role': msg.role,
                'content': msg.content,
            })
        
        return history
    
    def _call_ai_api(self, messages: List[Dict]) -> str:
        """
        Call the AI API to generate a response.
        This is a placeholder - you can integrate with OpenAI, Anthropic, or local LLM.
        """
        # TODO: Integrate with actual AI service (OpenAI, Anthropic, Ollama, etc.)
        # For now, return a placeholder response
        
        user_message = next((msg['content'] for msg in messages if msg['role'] == 'user'), '')
        
        # Simple keyword-based responses as placeholder
        user_lower = user_message.lower()
        
        if 'best' in user_lower and ('product' in user_lower or 'selling' in user_lower):
            return "To find your best-selling products, I can analyze your sales data. Would you like me to generate a report showing your top products by revenue or quantity sold?"
        
        if 'recommend' in user_lower or 'suggest' in user_lower:
            return "Based on your business metrics, I can provide recommendations. Could you specify what area you'd like recommendations for? (e.g., inventory, pricing, promotions, sales strategies)"
        
        if 'trend' in user_lower or 'analysis' in user_lower:
            return "I can analyze sales trends for you. Would you like to see trends by day, week, or month? I can also compare periods or identify seasonal patterns."
        
        if 'report' in user_lower:
            return "I can help generate various reports. What type of report would you like? (e.g., sales report, inventory report, financial summary, customer analysis)"
        
        # Default response
        return f"I'm here to help you with business insights and recommendations for {self.tenant.company_name}. You can ask me about:\n\n- Sales performance and trends\n- Best-selling products\n- Inventory recommendations\n- Business metrics and KPIs\n- Report generation\n- Business best practices\n\nWhat would you like to know?"
    
    def process_message(
        self,
        conversation: ChatConversation,
        user_message: str,
        user: Optional[User] = None
    ) -> ChatMessage:
        """
        Process a user message and generate an AI response.
        
        Args:
            conversation: The conversation object
            user_message: The user's message
            user: The user sending the message
            
        Returns:
            ChatMessage: The AI assistant's response
        """
        # Save user message
        user_msg = ChatMessage.objects.create(
            conversation=conversation,
            role='user',
            content=user_message,
        )
        
        # Build conversation context
        system_prompt = self._build_system_prompt()
        history = self._get_conversation_history(conversation)
        
        # Build messages for AI
        messages = [
            {'role': 'system', 'content': system_prompt},
            *history,
            {'role': 'user', 'content': user_message},
        ]
        
        # Get AI response
        ai_response = self._call_ai_api(messages)
        
        # Save AI response
        assistant_msg = ChatMessage.objects.create(
            conversation=conversation,
            role='assistant',
            content=ai_response,
        )
        
        # Update conversation title if it's the first message
        if not conversation.title:
            conversation.title = user_message[:50] + ('...' if len(user_message) > 50 else '')
            conversation.save()
        
        # Update conversation timestamp
        conversation.updated_at = timezone.now()
        conversation.save()
        
        return assistant_msg
    
    def create_conversation(self, user: Optional[User] = None) -> ChatConversation:
        """Create a new conversation."""
        return ChatConversation.objects.create(
            tenant=self.tenant,
            user=user,
        )
    
    def get_conversations(self, user: Optional[User] = None, archived: bool = False, limit: int = 50):
        """Get conversations for the tenant."""
        queryset = ChatConversation.objects.filter(
            tenant=self.tenant,
            is_archived=archived,
        )
        if user:
            queryset = queryset.filter(user=user)
        return queryset[:limit]
    
    def archive_conversation(self, conversation_id: int):
        """Archive a conversation."""
        conversation = ChatConversation.objects.get(id=conversation_id, tenant=self.tenant)
        conversation.is_archived = True
        conversation.save()
        return conversation
    
    def update_context(self):
        """Update the business context with latest data."""
        self.context.business_summary = self._generate_business_summary()
        self.context.key_metrics = self._get_key_metrics()
        self.context.save()
        return self.context

