"""
Services module for the application.
Contains business logic and external service integrations.
"""

# Import services conditionally to avoid dependency issues during testing
try:
    from .google_calendar_client import google_calendar_client
    _google_calendar_available = True
except ImportError:
    google_calendar_client = None
    _google_calendar_available = False

try:
    from .token_encryption import token_encryption
    _token_encryption_available = True
except ImportError:
    token_encryption = None
    _token_encryption_available = False

__all__ = []
if _google_calendar_available:
    __all__.append('google_calendar_client')
if _token_encryption_available:
    __all__.append('token_encryption')