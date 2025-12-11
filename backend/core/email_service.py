"""
Email Service for sending verification and notification emails.
"""
from django.core.mail import send_mail, EmailMultiAlternatives
from django.template.loader import render_to_string
from django.conf import settings
from django.utils.html import strip_tags
import logging

logger = logging.getLogger(__name__)


def send_verification_email(user_email: str, verification_token: str, username: str = None) -> bool:
    """
    Send email verification email to user.
    
    Args:
        user_email: User's email address
        verification_token: Verification token
        username: User's username (optional)
    
    Returns:
        True if email sent successfully, False otherwise
    """
    try:
        verification_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/verify-email?token={verification_token}"
        
        subject = 'Verify Your RetailCloud Account'
        
        # HTML email template
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>RetailCloud</h1>
                    <p>Verify Your Email Address</p>
                </div>
                <div class="content">
                    <p>Hello{(' ' + username) if username else ''},</p>
                    <p>Thank you for signing up for RetailCloud! Please verify your email address to complete your registration.</p>
                    <p style="text-align: center;">
                        <a href="{verification_url}" class="button">Verify Email Address</a>
                    </p>
                    <p>Or copy and paste this link into your browser:</p>
                    <p style="word-break: break-all; color: #667eea;">{verification_url}</p>
                    <p>This link will expire in 24 hours.</p>
                    <p>If you didn't create an account with RetailCloud, please ignore this email.</p>
                </div>
                <div class="footer">
                    <p>&copy; {settings.SITE_NAME if hasattr(settings, 'SITE_NAME') else 'RetailCloud'} - All rights reserved</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_message = strip_tags(html_message)
        
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@retailcloud.com')
        
        msg = EmailMultiAlternatives(subject, plain_message, from_email, [user_email])
        msg.attach_alternative(html_message, "text/html")
        msg.send()
        
        logger.info(f"Verification email sent to {user_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send verification email to {user_email}: {str(e)}", exc_info=True)
        return False


def send_trial_approval_email(user_email: str, company_name: str, trial_end_date: str, login_url: str = None) -> bool:
    """
    Send trial approval notification email.
    
    Args:
        user_email: User's email address
        company_name: Company name
        trial_end_date: Trial end date (formatted)
        login_url: Login page URL
    
    Returns:
        True if email sent successfully, False otherwise
    """
    try:
        if not login_url:
            login_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/login"
        
        subject = f'🎉 Your RetailCloud Trial is Now Active!'
        
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #27ae60 0%, #2ecc71 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; padding: 12px 30px; background: #27ae60; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎉 Trial Approved!</h1>
                </div>
                <div class="content">
                    <p>Hello {company_name} team,</p>
                    <p>Great news! Your 7-day free trial has been approved and is now active.</p>
                    <p><strong>Trial End Date:</strong> {trial_end_date}</p>
                    <p>You now have full access to all RetailCloud features. Get started by logging in:</p>
                    <p style="text-align: center;">
                        <a href="{login_url}" class="button">Login to RetailCloud</a>
                    </p>
                    <p>If you have any questions, please don't hesitate to contact our support team.</p>
                </div>
                <div class="footer">
                    <p>&copy; {settings.SITE_NAME if hasattr(settings, 'SITE_NAME') else 'RetailCloud'} - All rights reserved</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_message = strip_tags(html_message)
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'noreply@retailcloud.com')
        
        msg = EmailMultiAlternatives(subject, plain_message, from_email, [user_email])
        msg.attach_alternative(html_message, "text/html")
        msg.send()
        
        logger.info(f"Trial approval email sent to {user_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send trial approval email to {user_email}: {str(e)}", exc_info=True)
        return False


def send_welcome_email(user_email: str, company_name: str, username: str, login_url: str = None) -> bool:
    """
    Send welcome email after successful signup.
    
    Args:
        user_email: User's email address
        company_name: Company name
        username: Username
        login_url: Login page URL
    
    Returns:
        True if email sent successfully, False otherwise
    """
    try:
        if not login_url:
            login_url = f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/login"
        
        subject = 'Welcome to RetailCloud!'
        
        html_message = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }}
                .button {{ display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; margin-top: 30px; font-size: 12px; color: #666; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Welcome to RetailCloud!</h1>
                </div>
                <div class="content">
                    <p>Hello {company_name} team,</p>
                    <p>Welcome to RetailCloud! Your account has been successfully created.</p>
                    <p><strong>Username:</strong> {username}</p>
                    <p>You can now log in and start using RetailCloud to manage your retail operations.</p>
                    <p style="text-align: center;">
                        <a href="{login_url}" class="button">Login to RetailCloud</a>
                    </p>
                    <p>If you have any questions, our support team is here to help.</p>
                </div>
                <div class="footer">
                    <p>&copy; {settings.SITE_NAME if hasattr(settings, 'SITE_NAME') else 'RetailCloud'} - All rights reserved</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        plain_message = strip_tags(html_message)
        from_email = getattr(settings, 'FULL_FROM_EMAIL', 'noreply@retailcloud.com')
        
        msg = EmailMultiAlternatives(subject, plain_message, from_email, [user_email])
        msg.attach_alternative(html_message, "text/html")
        msg.send()
        
        logger.info(f"Welcome email sent to {user_email}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to send welcome email to {user_email}: {str(e)}", exc_info=True)
        return False

