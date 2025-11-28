"""Security utilities for password hashing and validation."""

import logging
import secrets
import string
from typing import Optional

from argon2 import PasswordHasher, exceptions
from argon2.low_level import Type

logger = logging.getLogger(__name__)


class PasswordManager:
    """Password hashing and verification using Argon2."""
    
    def __init__(self) -> None:
        # Argon2 configuration for production security
        self.hasher = PasswordHasher(
            time_cost=3,        # Number of iterations
            memory_cost=65536,  # 64 MB memory usage
            parallelism=1,      # Number of parallel threads
            hash_len=32,        # Length of hash in bytes
            salt_len=16,        # Length of salt in bytes
            type=Type.ID,       # Argon2id variant (recommended)
        )
    
    def hash_password(self, password: str) -> str:
        """Hash a password using Argon2."""
        try:
            return self.hasher.hash(password)
        except Exception as e:
            logger.error(f"Password hashing error: {e}")
            raise RuntimeError("Failed to hash password")
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        try:
            self.hasher.verify(hashed_password, plain_password)
            return True
        except exceptions.VerifyMismatchError:
            return False
        except exceptions.HashingError as e:
            logger.error(f"Password verification error: {e}")
            return False
        except Exception as e:
            logger.error(f"Unexpected password verification error: {e}")
            return False
    
    def need_rehash(self, hashed_password: str) -> bool:
        """Check if password hash needs to be updated."""
        try:
            return self.hasher.check_needs_rehash(hashed_password)
        except Exception as e:
            logger.error(f"Password rehash check error: {e}")
            return False


class PasswordValidator:
    """Password strength validation."""
    
    def __init__(
        self,
        min_length: int = 8,
        max_length: int = 128,
        require_uppercase: bool = True,
        require_lowercase: bool = True,
        require_digits: bool = True,
        require_symbols: bool = True,
        min_unique_chars: int = 6,
    ) -> None:
        self.min_length = min_length
        self.max_length = max_length
        self.require_uppercase = require_uppercase
        self.require_lowercase = require_lowercase
        self.require_digits = require_digits
        self.require_symbols = require_symbols
        self.min_unique_chars = min_unique_chars
    
    def validate(self, password: str) -> tuple[bool, list[str]]:
        """
        Validate password strength.
        Returns (is_valid, errors)
        """
        errors = []
        
        # Length checks
        if len(password) < self.min_length:
            errors.append(f"Password must be at least {self.min_length} characters long")
        
        if len(password) > self.max_length:
            errors.append(f"Password must not exceed {self.max_length} characters")
        
        # Character type checks
        if self.require_uppercase and not any(c.isupper() for c in password):
            errors.append("Password must contain at least one uppercase letter")
        
        if self.require_lowercase and not any(c.islower() for c in password):
            errors.append("Password must contain at least one lowercase letter")
        
        if self.require_digits and not any(c.isdigit() for c in password):
            errors.append("Password must contain at least one digit")
        
        if self.require_symbols:
            symbols = set(string.punctuation)
            if not any(c in symbols for c in password):
                errors.append("Password must contain at least one special character")
        
        # Unique characters check
        unique_chars = len(set(password))
        if unique_chars < self.min_unique_chars:
            errors.append(f"Password must contain at least {self.min_unique_chars} unique characters")
        
        # Common password patterns
        if self._is_common_pattern(password):
            errors.append("Password contains common patterns and is too weak")
        
        return len(errors) == 0, errors
    
    def _is_common_pattern(self, password: str) -> bool:
        """Check for common weak password patterns."""
        password_lower = password.lower()
        
        # Sequential patterns
        sequences = [
            "123456", "abcdef", "qwerty", "asdf", "zxcv",
            "654321", "fedcba", "ytrewq", "fdsa", "vcxz"
        ]
        
        for seq in sequences:
            if seq in password_lower:
                return True
        
        # Repetitive patterns
        if len(set(password)) < 4:  # Too few unique characters
            return True
        
        # Keyboard patterns
        keyboard_patterns = [
            "qwerty", "asdfgh", "zxcvbn", "qaz", "wsx", "edc"
        ]
        
        for pattern in keyboard_patterns:
            if pattern in password_lower:
                return True
        
        return False


class TokenGenerator:
    """Generate secure tokens for various purposes."""
    
    @staticmethod
    def generate_secure_token(length: int = 32) -> str:
        """Generate URL-safe secure token."""
        return secrets.token_urlsafe(length)
    
    @staticmethod
    def generate_hex_token(length: int = 32) -> str:
        """Generate hexadecimal secure token."""
        return secrets.token_hex(length)
    
    @staticmethod
    def generate_numeric_token(length: int = 6) -> str:
        """Generate numeric token (for OTP, verification codes)."""
        return ''.join(secrets.choice(string.digits) for _ in range(length))
    
    @staticmethod
    def generate_alphanumeric_token(length: int = 8) -> str:
        """Generate alphanumeric token."""
        alphabet = string.ascii_letters + string.digits
        return ''.join(secrets.choice(alphabet) for _ in range(length))


class SecurityHeaders:
    """HTTP security headers configuration."""
    
    @staticmethod
    def get_security_headers() -> dict[str, str]:
        """Get recommended security headers."""
        return {
            # Prevent XSS attacks
            "X-XSS-Protection": "1; mode=block",
            
            # Prevent content type sniffing
            "X-Content-Type-Options": "nosniff",
            
            # Control how much information the browser includes with navigations away from a document
            "Referrer-Policy": "strict-origin-when-cross-origin",
            
            # Prevent clickjacking
            "X-Frame-Options": "DENY",
            
            # HTTP Strict Transport Security
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            
            # Content Security Policy (basic)
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self' https:; "
                "frame-ancestors 'none';"
            ),
            
            # Permissions Policy (formerly Feature Policy)
            "Permissions-Policy": (
                "accelerometer=(), "
                "camera=(), "
                "geolocation=(), "
                "gyroscope=(), "
                "magnetometer=(), "
                "microphone=(), "
                "payment=(), "
                "usb=()"
            )
        }


class InputSanitizer:
    """Input sanitization utilities."""
    
    @staticmethod
    def sanitize_email(email: str) -> str:
        """Sanitize email input."""
        return email.strip().lower()
    
    @staticmethod
    def sanitize_username(username: str) -> str:
        """Sanitize username input."""
        # Remove whitespace and convert to lowercase
        username = username.strip().lower()
        
        # Remove non-alphanumeric characters except underscore and hyphen
        allowed_chars = set(string.ascii_lowercase + string.digits + '_-')
        sanitized = ''.join(c for c in username if c in allowed_chars)
        
        return sanitized
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename to prevent path traversal."""
        # Remove directory separators and null bytes
        filename = filename.replace('/', '').replace('\\', '').replace('\0', '')
        
        # Remove leading dots to prevent hidden files
        filename = filename.lstrip('.')
        
        # Limit filename length
        if len(filename) > 255:
            name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
            filename = name[:255-len(ext)-1] + '.' + ext if ext else name[:255]
        
        return filename
    
    @staticmethod
    def validate_file_type(filename: str, allowed_types: list[str]) -> bool:
        """Validate file type by extension."""
        if not filename:
            return False
        
        extension = filename.lower().split('.')[-1] if '.' in filename else ''
        return extension in [t.lower() for t in allowed_types]


# Global instances
password_manager = PasswordManager()
password_validator = PasswordValidator()
token_generator = TokenGenerator()
security_headers = SecurityHeaders()
input_sanitizer = InputSanitizer()