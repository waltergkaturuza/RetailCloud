from django.apps import AppConfig


class AiChatbotConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'ai_chatbot'
    
    def ready(self):
        pass  # Signals can be added here if needed

