"""
Custom logging configuration to suppress harmless broken pipe warnings.
"""
import logging


class SuppressBrokenPipeFilter(logging.Filter):
    """Filter to suppress broken pipe and favicon warnings."""
    
    def filter(self, record):
        """Filter out broken pipe and favicon messages."""
        message = record.getMessage()
        # Suppress broken pipe warnings
        if 'Broken pipe' in message:
            return False
        # Suppress favicon 404 (we handle it now)
        if 'favicon.ico' in message and 'Not Found' in message:
            return False
        return True

