"""
Security utilities for input sanitization, validation, and protection.
Implements comprehensive security measures for calendar event data and API endpoints.
"""

import re
import html
import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, date
from pydantic import BaseModel, validator
import bleach
from urllib.parse import urlparse

logger = logging.getLogger(__name__)


class SecurityError(Exception):
    """Custom exception for security-related errors."""
    
    def __init__(self, message: str, error_code: str, field: Optional[str] = None):
        self.message = message
        self.error_code = error_code
        self.field = field
        super().__init__(message)


class InputSanitizer:
    """
    Comprehensive input sanitization for calendar event data and user inputs.
    Prevents XSS, injection attacks, and malicious content.
    """
    
    # Allowed HTML tags for rich text fields (very restrictive)
    ALLOWED_TAGS = ['b', 'i', 'u', 'em', 'strong', 'br', 'p']
    ALLOWED_ATTRIBUTES = {}
    
    # Maximum field lengths
    MAX_LENGTHS = {
        'title': 255,
        'description': 2000,
        'location': 500,
        'attendee_email': 254,
        'calendar_id': 255,
        'event_id': 255,
        'url': 2048
    }
    
    # Regex patterns for validation
    PATTERNS = {
        'email': re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'),
        'calendar_id': re.compile(r'^[a-zA-Z0-9@._-]+$'),
        'event_id': re.compile(r'^[a-zA-Z0-9_-]+$'),
        'timezone': re.compile(r'^[A-Za-z]+/[A-Za-z_]+$'),
        'recurrence_rule': re.compile(r'^RRULE:[A-Z=;,0-9]+$'),
        'safe_string': re.compile(r'^[a-zA-Z0-9\s\-_.,!?()]+$')
    }
    
    @classmethod
    def sanitize_text(cls, text: str, field_name: str = 'text', allow_html: bool = False) -> str:
        """
        Sanitize text input to prevent XSS and injection attacks.
        
        Args:
            text: Input text to sanitize
            field_name: Name of the field for length validation
            allow_html: Whether to allow limited HTML tags
            
        Returns:
            str: Sanitized text
            
        Raises:
            SecurityError: If input is invalid or potentially malicious
        """
        if not isinstance(text, str):
            raise SecurityError(
                message="Input must be a string",
                error_code="INVALID_INPUT_TYPE",
                field=field_name
            )
        
        # Check length limits
        max_length = cls.MAX_LENGTHS.get(field_name, 1000)
        if len(text) > max_length:
            raise SecurityError(
                message=f"Input too long (max {max_length} characters)",
                error_code="INPUT_TOO_LONG",
                field=field_name
            )
        
        # Remove null bytes and control characters
        text = text.replace('\x00', '').replace('\r', '').strip()
        
        if allow_html:
            # Sanitize HTML while preserving allowed tags
            text = bleach.clean(
                text,
                tags=cls.ALLOWED_TAGS,
                attributes=cls.ALLOWED_ATTRIBUTES,
                strip=True
            )
        else:
            # Escape HTML entities
            text = html.escape(text, quote=True)
        
        # Additional security checks
        cls._check_for_suspicious_patterns(text, field_name)
        
        return text
    
    @classmethod
    def sanitize_email(cls, email: str) -> str:
        """
        Sanitize and validate email addresses.
        
        Args:
            email: Email address to sanitize
            
        Returns:
            str: Sanitized email
            
        Raises:
            SecurityError: If email is invalid
        """
        if not isinstance(email, str):
            raise SecurityError(
                message="Email must be a string",
                error_code="INVALID_EMAIL_TYPE",
                field="email"
            )
        
        email = email.strip().lower()
        
        if not cls.PATTERNS['email'].match(email):
            raise SecurityError(
                message="Invalid email format",
                error_code="INVALID_EMAIL_FORMAT",
                field="email"
            )
        
        if len(email) > cls.MAX_LENGTHS['attendee_email']:
            raise SecurityError(
                message="Email address too long",
                error_code="EMAIL_TOO_LONG",
                field="email"
            )
        
        return email
    
    @classmethod
    def sanitize_url(cls, url: str) -> str:
        """
        Sanitize and validate URLs.
        
        Args:
            url: URL to sanitize
            
        Returns:
            str: Sanitized URL
            
        Raises:
            SecurityError: If URL is invalid or potentially malicious
        """
        if not isinstance(url, str):
            raise SecurityError(
                message="URL must be a string",
                error_code="INVALID_URL_TYPE",
                field="url"
            )
        
        url = url.strip()
        
        if len(url) > cls.MAX_LENGTHS['url']:
            raise SecurityError(
                message="URL too long",
                error_code="URL_TOO_LONG",
                field="url"
            )
        
        # Parse and validate URL
        try:
            parsed = urlparse(url)
            if not parsed.scheme or not parsed.netloc:
                raise SecurityError(
                    message="Invalid URL format",
                    error_code="INVALID_URL_FORMAT",
                    field="url"
                )
            
            # Only allow safe schemes
            if parsed.scheme not in ['http', 'https']:
                raise SecurityError(
                    message="URL scheme not allowed",
                    error_code="UNSAFE_URL_SCHEME",
                    field="url"
                )
            
        except Exception as e:
            raise SecurityError(
                message="Invalid URL format",
                error_code="INVALID_URL_FORMAT",
                field="url"
            )
        
        return url
    
    @classmethod
    def sanitize_calendar_event_data(cls, event_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Sanitize complete calendar event data structure.
        
        Args:
            event_data: Calendar event data dictionary
            
        Returns:
            dict: Sanitized event data
            
        Raises:
            SecurityError: If any field contains invalid data
        """
        sanitized = {}
        
        try:
            # Sanitize text fields
            if 'title' in event_data:
                sanitized['title'] = cls.sanitize_text(event_data['title'], 'title')
            
            if 'description' in event_data:
                sanitized['description'] = cls.sanitize_text(
                    event_data['description'], 'description', allow_html=True
                )
            
            if 'location' in event_data:
                sanitized['location'] = cls.sanitize_text(event_data['location'], 'location')
            
            # Sanitize attendee emails
            if 'attendees' in event_data and isinstance(event_data['attendees'], list):
                sanitized['attendees'] = []
                for attendee in event_data['attendees']:
                    if isinstance(attendee, dict) and 'email' in attendee:
                        sanitized_attendee = {
                            'email': cls.sanitize_email(attendee['email'])
                        }
                        if 'displayName' in attendee:
                            sanitized_attendee['displayName'] = cls.sanitize_text(
                                attendee['displayName'], 'displayName'
                            )
                        sanitized['attendees'].append(sanitized_attendee)
            
            # Sanitize URLs
            if 'hangoutLink' in event_data:
                sanitized['hangoutLink'] = cls.sanitize_url(event_data['hangoutLink'])
            
            # Validate datetime fields
            datetime_fields = ['start', 'end']
            for field in datetime_fields:
                if field in event_data:
                    sanitized[field] = cls._validate_datetime_field(event_data[field], field)
            
            # Validate recurrence rules
            if 'recurrence' in event_data and isinstance(event_data['recurrence'], list):
                sanitized['recurrence'] = []
                for rule in event_data['recurrence']:
                    if isinstance(rule, str) and cls.PATTERNS['recurrence_rule'].match(rule):
                        sanitized['recurrence'].append(rule)
                    else:
                        logger.warning(f"Invalid recurrence rule ignored: {rule}")
            
            # Copy safe fields directly
            safe_fields = ['visibility', 'transparency', 'status']
            for field in safe_fields:
                if field in event_data and isinstance(event_data[field], str):
                    sanitized[field] = event_data[field]
            
            # Validate numeric fields
            if 'duration_minutes' in event_data:
                duration = event_data['duration_minutes']
                if isinstance(duration, (int, float)) and 1 <= duration <= 1440:  # Max 24 hours
                    sanitized['duration_minutes'] = int(duration)
                else:
                    raise SecurityError(
                        message="Invalid duration (must be 1-1440 minutes)",
                        error_code="INVALID_DURATION",
                        field="duration_minutes"
                    )
            
            return sanitized
            
        except SecurityError:
            raise
        except Exception as e:
            logger.error(f"Error sanitizing calendar event data: {e}")
            raise SecurityError(
                message="Failed to sanitize event data",
                error_code="SANITIZATION_FAILED"
            )
    
    @classmethod
    def _check_for_suspicious_patterns(cls, text: str, field_name: str) -> None:
        """
        Check for suspicious patterns that might indicate malicious input.
        
        Args:
            text: Text to check
            field_name: Name of the field
            
        Raises:
            SecurityError: If suspicious patterns are detected
        """
        # Check for script tags
        if re.search(r'<script[^>]*>.*?</script>', text, re.IGNORECASE | re.DOTALL):
            raise SecurityError(
                message="Script tags not allowed",
                error_code="SCRIPT_TAG_DETECTED",
                field=field_name
            )
        
        # Check for javascript: URLs
        if re.search(r'javascript:', text, re.IGNORECASE):
            raise SecurityError(
                message="JavaScript URLs not allowed",
                error_code="JAVASCRIPT_URL_DETECTED",
                field=field_name
            )
        
        # Check for SQL injection patterns
        sql_patterns = [
            r'\b(union|select|insert|update|delete|drop|create|alter)\b',
            r'[\'";]',
            r'--',
            r'/\*.*?\*/'
        ]
        
        for pattern in sql_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                logger.warning(f"Potential SQL injection pattern detected in {field_name}: {pattern}")
                # Don't raise error for SQL patterns in text fields, just log
                break
    
    @classmethod
    def _validate_datetime_field(cls, datetime_data: Any, field_name: str) -> Dict[str, Any]:
        """
        Validate datetime field structure.
        
        Args:
            datetime_data: Datetime data to validate
            field_name: Name of the field
            
        Returns:
            dict: Validated datetime data
            
        Raises:
            SecurityError: If datetime data is invalid
        """
        if not isinstance(datetime_data, dict):
            raise SecurityError(
                message="Datetime field must be an object",
                error_code="INVALID_DATETIME_TYPE",
                field=field_name
            )
        
        validated = {}
        
        # Validate dateTime or date
        if 'dateTime' in datetime_data:
            dt_str = datetime_data['dateTime']
            if not isinstance(dt_str, str):
                raise SecurityError(
                    message="DateTime must be a string",
                    error_code="INVALID_DATETIME_FORMAT",
                    field=field_name
                )
            
            # Validate ISO format
            try:
                datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
                validated['dateTime'] = dt_str
            except ValueError:
                raise SecurityError(
                    message="Invalid datetime format",
                    error_code="INVALID_DATETIME_FORMAT",
                    field=field_name
                )
        
        elif 'date' in datetime_data:
            date_str = datetime_data['date']
            if not isinstance(date_str, str):
                raise SecurityError(
                    message="Date must be a string",
                    error_code="INVALID_DATE_FORMAT",
                    field=field_name
                )
            
            # Validate date format
            try:
                date.fromisoformat(date_str)
                validated['date'] = date_str
            except ValueError:
                raise SecurityError(
                    message="Invalid date format",
                    error_code="INVALID_DATE_FORMAT",
                    field=field_name
                )
        
        # Validate timezone
        if 'timeZone' in datetime_data:
            tz = datetime_data['timeZone']
            if isinstance(tz, str) and cls.PATTERNS['timezone'].match(tz):
                validated['timeZone'] = tz
        
        return validated


class RateLimiter:
    """
    Rate limiting for API endpoints to prevent abuse.
    """
    
    def __init__(self):
        self.requests = {}  # In production, use Redis or similar
    
    def is_allowed(self, identifier: str, limit: int, window_seconds: int) -> bool:
        """
        Check if request is allowed based on rate limits.
        
        Args:
            identifier: Unique identifier (user ID, IP, etc.)
            limit: Maximum requests allowed
            window_seconds: Time window in seconds
            
        Returns:
            bool: True if request is allowed
        """
        now = datetime.utcnow().timestamp()
        window_start = now - window_seconds
        
        # Clean old entries
        if identifier in self.requests:
            self.requests[identifier] = [
                req_time for req_time in self.requests[identifier]
                if req_time > window_start
            ]
        else:
            self.requests[identifier] = []
        
        # Check if limit exceeded
        if len(self.requests[identifier]) >= limit:
            return False
        
        # Add current request
        self.requests[identifier].append(now)
        return True


# Global instances
input_sanitizer = InputSanitizer()
rate_limiter = RateLimiter()