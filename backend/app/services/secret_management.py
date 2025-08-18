"""
Secret management service for secure handling of OAuth credentials and sensitive data.
Provides encryption, key rotation, and secure storage capabilities.
"""

import os
import base64
import logging
from typing import Dict, Optional, Any, List
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import secrets
import json
from datetime import datetime, timedelta

from ..config import settings
from ..core.logging_config import get_calendar_logger

logger = get_calendar_logger(__name__)


class SecretManagementError(Exception):
    """Exception raised for secret management errors."""
    
    def __init__(self, message: str, error_code: str):
        self.message = message
        self.error_code = error_code
        super().__init__(message)


class SecretManager:
    """
    Secure secret management for OAuth credentials and sensitive data.
    Handles encryption, decryption, and key rotation.
    """
    
    def __init__(self):
        self._encryption_key = None
        self._state_secret = None
        self._initialize_keys()
    
    def _initialize_keys(self) -> None:
        """Initialize encryption keys from configuration."""
        try:
            # Initialize token encryption key
            if settings.TOKEN_ENCRYPTION_KEY:
                self._encryption_key = self._derive_key(
                    settings.TOKEN_ENCRYPTION_KEY.encode(),
                    b"token_encryption_salt"
                )
            else:
                logger.warning("TOKEN_ENCRYPTION_KEY not configured - token encryption disabled")
            
            # Initialize OAuth state secret
            if settings.OAUTH_STATE_SECRET:
                self._state_secret = settings.OAUTH_STATE_SECRET.encode()
            else:
                logger.warning("OAUTH_STATE_SECRET not configured - OAuth state security disabled")
                
        except Exception as e:
            logger.error(f"Failed to initialize encryption keys: {e}")
            raise SecretManagementError(
                "Failed to initialize secret management",
                "INITIALIZATION_FAILED"
            )
    
    def _derive_key(self, password: bytes, salt: bytes) -> bytes:
        """Derive encryption key from password and salt."""
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        return base64.urlsafe_b64encode(kdf.derive(password))
    
    def encrypt_token(self, token: str, user_id: int) -> str:
        """
        Encrypt OAuth token for secure storage.
        
        Args:
            token: Token to encrypt
            user_id: User ID for additional entropy
            
        Returns:
            str: Encrypted token (base64 encoded)
            
        Raises:
            SecretManagementError: If encryption fails
        """
        if not self._encryption_key:
            raise SecretManagementError(
                "Token encryption not configured",
                "ENCRYPTION_NOT_CONFIGURED"
            )
        
        try:
            # Add user ID as additional entropy
            user_salt = f"user_{user_id}".encode()
            user_key = self._derive_key(self._encryption_key, user_salt)
            
            fernet = Fernet(user_key)
            encrypted_token = fernet.encrypt(token.encode())
            
            # Return base64 encoded for database storage
            return base64.urlsafe_b64encode(encrypted_token).decode()
            
        except Exception as e:
            logger.error(f"Failed to encrypt token for user {user_id}: {e}")
            raise SecretManagementError(
                "Token encryption failed",
                "ENCRYPTION_FAILED"
            )
    
    def decrypt_token(self, encrypted_token: str, user_id: int) -> str:
        """
        Decrypt OAuth token from storage.
        
        Args:
            encrypted_token: Encrypted token (base64 encoded)
            user_id: User ID for entropy
            
        Returns:
            str: Decrypted token
            
        Raises:
            SecretManagementError: If decryption fails
        """
        if not self._encryption_key:
            raise SecretManagementError(
                "Token encryption not configured",
                "ENCRYPTION_NOT_CONFIGURED"
            )
        
        try:
            # Derive user-specific key
            user_salt = f"user_{user_id}".encode()
            user_key = self._derive_key(self._encryption_key, user_salt)
            
            fernet = Fernet(user_key)
            
            # Decode from base64 and decrypt
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_token.encode())
            decrypted_token = fernet.decrypt(encrypted_bytes)
            
            return decrypted_token.decode()
            
        except Exception as e:
            logger.error(f"Failed to decrypt token for user {user_id}: {e}")
            raise SecretManagementError(
                "Token decryption failed",
                "DECRYPTION_FAILED"
            )
    
    def generate_oauth_state(self, user_id: int, user_type: str) -> str:
        """
        Generate secure OAuth state parameter.
        
        Args:
            user_id: User ID
            user_type: User type (teacher/student)
            
        Returns:
            str: Secure state parameter
        """
        try:
            # Create state payload
            state_data = {
                "user_id": user_id,
                "user_type": user_type,
                "timestamp": datetime.utcnow().isoformat(),
                "nonce": secrets.token_urlsafe(16)
            }
            
            # Encrypt state data
            if self._state_secret:
                fernet = Fernet(base64.urlsafe_b64encode(self._state_secret[:32]))
                encrypted_state = fernet.encrypt(json.dumps(state_data).encode())
                return base64.urlsafe_b64encode(encrypted_state).decode()
            else:
                # Fallback to simple encoding (not recommended for production)
                logger.warning("OAuth state encryption not configured - using simple encoding")
                return base64.urlsafe_b64encode(json.dumps(state_data).encode()).decode()
                
        except Exception as e:
            logger.error(f"Failed to generate OAuth state: {e}")
            raise SecretManagementError(
                "OAuth state generation failed",
                "STATE_GENERATION_FAILED"
            )
    
    def validate_oauth_state(self, state: str, max_age_minutes: int = 10) -> Dict[str, Any]:
        """
        Validate and decode OAuth state parameter.
        
        Args:
            state: State parameter to validate
            max_age_minutes: Maximum age in minutes
            
        Returns:
            dict: Decoded state data
            
        Raises:
            SecretManagementError: If validation fails
        """
        try:
            # Decrypt state data
            if self._state_secret:
                fernet = Fernet(base64.urlsafe_b64encode(self._state_secret[:32]))
                encrypted_bytes = base64.urlsafe_b64decode(state.encode())
                decrypted_data = fernet.decrypt(encrypted_bytes)
                state_data = json.loads(decrypted_data.decode())
            else:
                # Fallback decoding
                decoded_bytes = base64.urlsafe_b64decode(state.encode())
                state_data = json.loads(decoded_bytes.decode())
            
            # Validate timestamp
            state_timestamp = datetime.fromisoformat(state_data["timestamp"])
            max_age = timedelta(minutes=max_age_minutes)
            
            if datetime.utcnow() - state_timestamp > max_age:
                raise SecretManagementError(
                    "OAuth state expired",
                    "STATE_EXPIRED"
                )
            
            return state_data
            
        except json.JSONDecodeError:
            raise SecretManagementError(
                "Invalid OAuth state format",
                "INVALID_STATE_FORMAT"
            )
        except Exception as e:
            logger.error(f"Failed to validate OAuth state: {e}")
            raise SecretManagementError(
                "OAuth state validation failed",
                "STATE_VALIDATION_FAILED"
            )
    
    def rotate_encryption_key(self, new_key: str) -> Dict[str, Any]:
        """
        Rotate encryption key and re-encrypt existing tokens.
        
        Args:
            new_key: New encryption key
            
        Returns:
            dict: Rotation results
            
        Note: This is a placeholder for key rotation functionality.
        In production, this would require careful coordination with database updates.
        """
        logger.warning("Key rotation requested - this requires database coordination")
        
        return {
            "status": "pending",
            "message": "Key rotation requires database migration",
            "recommendation": "Use database migration scripts for key rotation"
        }
    
    def validate_configuration(self) -> List[str]:
        """
        Validate secret management configuration.
        
        Returns:
            list: List of configuration issues
        """
        issues = []
        
        if not self._encryption_key:
            issues.append("Token encryption key not configured")
        
        if not self._state_secret:
            issues.append("OAuth state secret not configured")
        
        # Check Google OAuth credentials
        if not settings.GOOGLE_CLIENT_ID:
            issues.append("Google Client ID not configured")
        
        if not settings.GOOGLE_CLIENT_SECRET:
            issues.append("Google Client Secret not configured")
        
        # Check key strength
        if settings.TOKEN_ENCRYPTION_KEY and len(settings.TOKEN_ENCRYPTION_KEY) < 32:
            issues.append("Token encryption key should be at least 32 characters")
        
        if settings.OAUTH_STATE_SECRET and len(settings.OAUTH_STATE_SECRET) < 32:
            issues.append("OAuth state secret should be at least 32 characters")
        
        return issues
    
    def get_security_status(self) -> Dict[str, Any]:
        """
        Get current security configuration status.
        
        Returns:
            dict: Security status information
        """
        return {
            "token_encryption_enabled": bool(self._encryption_key),
            "oauth_state_encryption_enabled": bool(self._state_secret),
            "google_oauth_configured": bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET),
            "configuration_issues": self.validate_configuration(),
            "last_checked": datetime.utcnow().isoformat()
        }


# Global secret manager instance
secret_manager = SecretManager()