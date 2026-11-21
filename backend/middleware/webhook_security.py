"""
WealthOS Broker Webhook Security Middleware
Provides HMAC-SHA256 signature verification and replay prevention.
"""
import hmac
import hashlib
import time
from typing import Optional

def verify_webhook_signature(
    payload_bytes: bytes,
    signature_header: str,
    secret_key: str,
    timestamp: Optional[int] = None,
    max_skew_seconds: int = 300
) -> bool:
    """
    Cryptographically verifies inbound webhook signature against shared secret.
    Enforces replay mitigation using a 300-second maximum clock skew window.
    """
    if not signature_header or not secret_key:
        return False
        
    if timestamp is not None:
        now = int(time.time())
        if abs(now - timestamp) > max_skew_seconds:
            return False  # Replay attack prevention
            
    expected = hmac.new(secret_key.encode("utf-8"), payload_bytes, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header)
