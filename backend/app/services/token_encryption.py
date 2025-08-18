"""
Token encryption utilities for secure storage of OAuth tokens.
Provides AES-256 encryption for Google Calendar OAuth tokens.
"""

import base64
import json
from typing import Dict, Any, Optional
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import logging

from ..config import settings

logger = logging.getLogger(__name__)


class TokenEncryption:
    """
    Handles encryption and decryption of OAuth tokens for secure storage.
    Uses AES-256 encryption with PBKDF2 key derivation.
    """
    
    def __init__(self):
        self._fernet = None
        self._initialize_encryption()
    
    def _initialize_encryption(self):
        """Initialize encryption with key from settings."""
        if not settings.TOKEN_ENCRYPTION_KEY:
            logger.warning("TOKEN_ENCRYPTION_KEY not set, token encryption disabled")
            return
            
        try:
            # Use the encryption key from settings
            key = settings.TOKEN_ENCRYPTION_KEY.encode()
            
            # If key is not 32 bytes, derive it using PBKDF2
            if len(key) != 32:
                kdf = PBKDF2HMAC(
                    algorithm=hashes.SHA256(),
                    length=32,
                    salt=b'calendar_tokens_salt',  # Fixed salt for consistency
                    iterations=100000,
                )
                key = base64.urlsafe_b64encode(kdf.derive(key))
            else:
                key = base64.urlsafe_b64encode(key)
                
            self._fernet = Fernet(key)
            logger.info("Token encryption initialized successfully")
            
        except Exception as error:
            logger.error(f"Failed to initialize token encryption: {error}")
            self._fernet = None
    
    def encrypt_token_data(self, token_data: Dict[str, Any]) -> Optional[str]:
        """
        Encrypt token data for secure storage.
        
        Args:
            token_data: Dictionary containing OAuth token information
            
        Returns:
            str: Encrypted token data as base64 string, None if encryption fails
        """
        if not self._fernet:
            logger.warning("Token encryption not available, storing tokens in plaintext")
            return json.dumps(token_data)
            
        try:
            # Convert token data to JSON string
            token_json = json.dumps(token_data)
            
            # Encrypt the JSON string
            encrypted_data = self._fernet.encrypt(token_json.encode())
            
            # Return as base64 string for database storage
            return base64.urlsafe_b64encode(encrypted_data).decode()
            
        except Exception as error:
            logger.error(f"Failed to encrypt token data: {error}")
            return None
    
    def decrypt_token_data(self, encrypted_data: str) -> Optional[Dict[str, Any]]:
        """
        Decrypt token data from storage.
        
        Args:
            encrypted_data: Encrypted token data as base64 string
            
        Returns:
            dict: Decrypted token data, None if decryption fails
        """
        if not self._fernet:
            logger.warning("Token encryption not available, assuming plaintext storage")
            try:
                return json.loads(encrypted_data)
            except json.JSONDecodeError:
                logger.error("Failed to parse token data as JSON")
                return None
                
        try:
            # Decode from base64
            encrypted_bytes = base64.urlsafe_b64decode(encrypted_data.encode())
            
            # Decrypt the data
            decrypted_data = self._fernet.decrypt(encrypted_bytes)
            
            # Parse JSON and return
            return json.loads(decrypted_data.decode())
            
        except Exception as error:
            logger.error(f"Failed to decrypt token data: {error}")
            return None
    
    def is_encryption_available(self) -> bool:
        """
        Check if token encryption is available.
        
        Returns:
            bool: True if encryption is available, False otherwise
        """
        return self._fernet is not None


# Global encryption instance
token_encryption = TokenEncryption()