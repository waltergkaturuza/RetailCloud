"""
Core views for the Retail SaaS Platform.
"""
from django.http import HttpResponse, HttpResponseNotFound
from django.shortcuts import redirect
from django.views.decorators.http import require_http_methods
from django.views.decorators.csrf import csrf_exempt


def home(request):
    """Home page redirect to admin or API docs."""
    return redirect('admin:index')


@csrf_exempt
@require_http_methods(["GET", "HEAD"])
def favicon_view(request):
    """Handle favicon requests to prevent 404 errors."""
    # Return a simple 204 No Content response
    # Browsers will use their default favicon
    return HttpResponse(status=204)
