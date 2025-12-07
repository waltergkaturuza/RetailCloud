"""
Advanced caching utilities for performance optimization.
"""
from django.core.cache import cache
from django.core.cache.backends.redis import RedisCache
from functools import wraps
import hashlib
import json


class CacheManager:
    """Advanced cache management with automatic invalidation."""
    
    @staticmethod
    def get_cache_key(prefix, *args, **kwargs):
        """Generate consistent cache key."""
        key_data = {
            'args': args,
            'kwargs': sorted(kwargs.items())
        }
        key_string = json.dumps(key_data, sort_keys=True)
        key_hash = hashlib.md5(key_string.encode()).hexdigest()[:12]
        return f"{prefix}:{key_hash}"
    
    @staticmethod
    def cached(prefix, timeout=300, version=None):
        """Decorator for caching function results."""
        def decorator(func):
            @wraps(func)
            def wrapper(*args, **kwargs):
                # Generate cache key
                cache_key = CacheManager.get_cache_key(
                    prefix,
                    func.__name__,
                    *args,
                    **{k: v for k, v in kwargs.items() if k != 'request'}
                )
                
                # Try to get from cache
                cached_value = cache.get(cache_key, version=version)
                if cached_value is not None:
                    return cached_value
                
                # Compute value
                result = func(*args, **kwargs)
                
                # Store in cache
                cache.set(cache_key, result, timeout, version=version)
                
                return result
            return wrapper
        return decorator
    
    @staticmethod
    def invalidate_pattern(pattern):
        """Invalidate all cache keys matching pattern."""
        # Note: This requires Redis for pattern matching
        try:
            if hasattr(cache, 'delete_pattern'):
                cache.delete_pattern(pattern)
            else:
                # Fallback: Manual key tracking needed
                pass
        except Exception:
            pass
    
    @staticmethod
    def get_or_set(key, default, timeout=300):
        """Get value or set default."""
        value = cache.get(key)
        if value is None:
            if callable(default):
                value = default()
            else:
                value = default
            cache.set(key, value, timeout)
        return value


# Cache prefixes for different data types
CACHE_PREFIXES = {
    'user': 'user',
    'product': 'product',
    'stock': 'stock',
    'sale': 'sale',
    'report': 'report',
    'tenant': 'tenant',
    'branch': 'branch',
}

