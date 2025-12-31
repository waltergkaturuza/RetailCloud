"""
Marketing automation services for sending campaigns, managing workflows, etc.
"""
import logging
from typing import List, Optional, Dict, Any
from django.utils import timezone
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings

from .models import MarketingCampaign, CampaignRecipient, EmailTemplate, AutomationWorkflow, AutomationExecution
from customers.models import Customer
from accounts.sms_service import SMSService

logger = logging.getLogger(__name__)


class EmailMarketingService:
    """Service for sending email marketing campaigns."""
    
    @staticmethod
    def send_campaign_email(campaign: MarketingCampaign, customer: Customer, template_variables: Optional[Dict[str, Any]] = None) -> bool:
        """
        Send email for a campaign to a customer.
        
        Args:
            campaign: MarketingCampaign instance
            customer: Customer instance
            template_variables: Additional variables for template rendering
            
        Returns:
            True if email sent successfully, False otherwise
        """
        try:
            # Prepare template variables
            variables = {
                'customer_name': customer.full_name or (customer.email.split('@')[0] if customer.email else 'Customer'),
                'customer_email': customer.email or '',
                'company_name': campaign.tenant.company_name,
                **(template_variables or {})
            }
            
            # Replace variables in subject and content
            subject = EmailMarketingService._replace_variables(campaign.subject, variables)
            html_content = EmailMarketingService._replace_variables(campaign.html_content or campaign.message_template, variables)
            plain_content = EmailMarketingService._replace_variables(strip_tags(campaign.message_template), variables)
            
            # Send email
            from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@retailcloud.com')
            
            msg = EmailMultiAlternatives(
                subject=subject,
                body=plain_content,
                from_email=from_email,
                to=[customer.email]
            )
            msg.attach_alternative(html_content, "text/html")
            msg.send()
            
            logger.info(f"Campaign email sent: {campaign.name} to {customer.email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send campaign email: {str(e)}", exc_info=True)
            return False
    
    @staticmethod
    def _replace_variables(text: str, variables: Dict[str, Any]) -> str:
        """Replace template variables in text."""
        result = text
        for key, value in variables.items():
            # Replace {{key}} pattern (concatenate strings to avoid f-string issues)
            result = result.replace('{{' + key + '}}', str(value))
            # Replace {{ key }} pattern (with spaces)
            result = result.replace('{{ ' + key + ' }}', str(value))
        return result
    
    @staticmethod
    def send_template_email(template: EmailTemplate, customer: Customer, variables: Optional[Dict[str, Any]] = None) -> bool:
        """Send email using a template."""
        campaign = MarketingCampaign(
            name=f"Template: {template.name}",
            subject=template.subject,
            html_content=template.html_content,
            message_template=template.plain_text_content,
            tenant=template.tenant or customer.tenant
        )
        return EmailMarketingService.send_campaign_email(campaign, customer, variables)


class SMSMarketingService:
    """Service for sending SMS marketing campaigns."""
    
    @staticmethod
    def send_campaign_sms(campaign: MarketingCampaign, customer: Customer, template_variables: Optional[Dict[str, Any]] = None) -> tuple[bool, Optional[str]]:
        """
        Send SMS for a campaign to a customer.
        
        Args:
            campaign: MarketingCampaign instance
            customer: Customer instance
            template_variables: Additional variables for template rendering
            
        Returns:
            Tuple of (success: bool, error_message: Optional[str])
        """
        try:
            # Get customer phone number
            phone_number = customer.phone
            if not phone_number:
                return False, "Customer has no phone number"
            
            # Ensure phone number is in E.164 format (add + if missing)
            if not phone_number.startswith('+'):
                # This is a simplified check - in production, use a library like phonenumbers
                phone_number = '+' + phone_number.lstrip('0')
            
            # Prepare template variables
            variables = {
                'customer_name': customer.full_name or customer.email.split('@')[0] if customer.email else 'Customer',
                'company_name': campaign.tenant.company_name,
                **(template_variables or {})
            }
            
            # Replace variables in message
            message = SMSMarketingService._replace_variables(campaign.message_template, variables)
            
            # Send SMS (truncate if too long - SMS limit is usually 160 characters)
            if len(message) > 160:
                message = message[:157] + '...'
            
            return SMSService.send_sms(phone_number, message)
            
        except Exception as e:
            logger.error(f"Failed to send campaign SMS: {str(e)}", exc_info=True)
            return False, str(e)
    
    @staticmethod
    def _replace_variables(text: str, variables: Dict[str, Any]) -> str:
        """Replace template variables in text."""
        result = text
        for key, value in variables.items():
            # Replace {{key}} pattern (concatenate strings to avoid f-string issues)
            result = result.replace('{{' + key + '}}', str(value))
            # Replace {{ key }} pattern (with spaces)
            result = result.replace('{{ ' + key + ' }}', str(value))
        return result


class AutomationService:
    """Service for executing marketing automation workflows."""
    
    @staticmethod
    def trigger_workflow(workflow: AutomationWorkflow, customer: Customer, trigger_data: Optional[Dict[str, Any]] = None) -> AutomationExecution:
        """
        Trigger an automation workflow for a customer.
        
        Args:
            workflow: AutomationWorkflow instance
            customer: Customer instance
            trigger_data: Additional trigger context data
            
        Returns:
            AutomationExecution instance
        """
        # Create execution record
        execution = AutomationExecution.objects.create(
            workflow=workflow,
            customer=customer,
            status='pending',
            trigger_data=trigger_data or {}
        )
        
        # Increment workflow triggered count
        workflow.total_triggered += 1
        workflow.save(update_fields=['total_triggered'])
        
        # Execute workflow steps
        try:
            AutomationService._execute_workflow_steps(execution)
        except Exception as e:
            logger.error(f"Workflow execution failed: {str(e)}", exc_info=True)
            execution.status = 'failed'
            execution.error_message = str(e)
            execution.save()
        
        return execution
    
    @staticmethod
    def _execute_workflow_steps(execution: AutomationExecution):
        """Execute workflow steps for an execution."""
        workflow = execution.workflow
        customer = execution.customer
        
        execution.status = 'running'
        execution.started_at = timezone.now()
        execution.save()
        
        # Execute each step
        for step_index, step in enumerate(workflow.workflow_steps):
            execution.current_step = step_index
            
            # Handle delay
            if step.get('delay'):
                import time
                time.sleep(step['delay'])  # In production, use Celery tasks for delays
            
            # Execute step action
            action = step.get('action')
            
            if action == 'send_email':
                template_id = step.get('template_id')
                try:
                    template = EmailTemplate.objects.get(id=template_id)
                    EmailMarketingService.send_template_email(template, customer, execution.trigger_data)
                except EmailTemplate.DoesNotExist:
                    logger.warning(f"Email template {template_id} not found")
            
            elif action == 'send_sms':
                message = step.get('message', '')
                if message:
                    phone_number = customer.phone
                    if phone_number:
                        SMSService.send_sms(phone_number, message)
            
            elif action == 'wait':
                # Wait for a condition (implemented in production with Celery)
                pass
            
            elif action == 'conditional':
                # Conditional logic (implemented in production)
                condition = step.get('condition')
                if condition:
                    # Evaluate condition
                    pass
            
            execution.save(update_fields=['current_step'])
        
        # Mark as completed
        execution.status = 'completed'
        execution.completed_at = timezone.now()
        execution.save()
        
        # Increment workflow completed count
        workflow.total_completed += 1
        workflow.save(update_fields=['total_completed'])


class CampaignService:
    """Service for managing marketing campaigns."""
    
    @staticmethod
    def execute_campaign(campaign: MarketingCampaign) -> Dict[str, int]:
        """
        Execute a marketing campaign.
        
        Returns:
            Dictionary with statistics: {'sent': int, 'failed': int, 'total': int}
        """
        stats = {'sent': 0, 'failed': 0, 'total': 0}
        
        # Get recipients
        if campaign.target_segment == 'all':
            recipients = Customer.objects.filter(tenant=campaign.tenant, is_active=True)
        elif campaign.target_segment == 'segment':
            # Filter by segment (implement segment filtering)
            recipients = Customer.objects.filter(tenant=campaign.tenant, is_active=True)
        else:
            # Custom filter
            recipients = Customer.objects.filter(tenant=campaign.tenant, is_active=True)
        
        # Apply max recipients limit
        if campaign.max_recipients:
            recipients = recipients[:campaign.max_recipients]
        
        campaign.status = 'sending'
        campaign.started_at = timezone.now()
        campaign.save()
        
        # Send to each recipient
        for customer in recipients:
            stats['total'] += 1
            
            # Create recipient record
            recipient, created = CampaignRecipient.objects.get_or_create(
                campaign=campaign,
                customer=customer,
                defaults={
                    'email_address': customer.email or '',
                    'phone_number': customer.phone or '',
                }
            )
            
            # Send based on campaign type
            success = False
            if campaign.campaign_type in ['email', 'combined']:
                success = EmailMarketingService.send_campaign_email(campaign, customer)
                if success:
                    recipient.status = 'sent'
                    recipient.sent_at = timezone.now()
                    recipient.save()
                    stats['sent'] += 1
                else:
                    recipient.status = 'failed'
                    recipient.save()
                    stats['failed'] += 1
            
            if campaign.campaign_type in ['sms', 'combined']:
                success_sms, error = SMSMarketingService.send_campaign_sms(campaign, customer)
                if success_sms:
                    if recipient.status == 'pending':
                        recipient.status = 'sent'
                        recipient.sent_at = timezone.now()
                    recipient.save()
                else:
                    if recipient.status == 'pending':
                        recipient.status = 'failed'
                        recipient.save()
                    if success:  # Email succeeded but SMS failed
                        stats['failed'] += 1
        
        # Update campaign statistics
        campaign.sent_count = stats['sent']
        campaign.total_recipients = stats['total']
        campaign.status = 'completed'
        campaign.completed_at = timezone.now()
        campaign.save()
        
        return stats

