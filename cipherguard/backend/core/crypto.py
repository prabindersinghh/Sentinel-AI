import hmac
import hashlib
import secrets


def compute_device_hash(imei: str, android_id: str, salt: str) -> str:
    """
    Real HMAC-SHA-256 implementation.
    key = salt (hex decoded to bytes)
    message = imei + "|" + android_id
    returns: hex string of HMAC output, always 64 chars
    """
    key = bytes.fromhex(salt)
    message = f"{imei}|{android_id}".encode()
    h = hmac.new(key, message, hashlib.sha256)
    # Zero IMEI from memory (best effort in Python)
    imei_bytes = bytearray(imei.encode())
    for i in range(len(imei_bytes)):
        imei_bytes[i] = 0
    imei = None
    return h.hexdigest()


def compute_ios_hash(dcdevice_token: str, idfv: str, attest_key_id: str, salt: str) -> str:
    """
    HMAC-SHA-256 for iOS identifiers.
    message = dcdevice_token + "|" + idfv + "|" + attest_key_id
    """
    key = bytes.fromhex(salt)
    message = f"{dcdevice_token}|{idfv}|{attest_key_id}".encode()
    h = hmac.new(key, message, hashlib.sha256)
    return h.hexdigest()


def compute_customer_pseudonym(bank_id: str, customer_id: str) -> str:
    """
    SHA-256(bank_id + "|" + customer_id)
    Returns 64-char hex string.
    """
    message = f"{bank_id}|{customer_id}".encode()
    return hashlib.sha256(message).hexdigest()


def generate_salt() -> str:
    """
    32 bytes CSPRNG via secrets.token_bytes(32)
    Returns hex string.
    """
    return secrets.token_bytes(32).hex()


def generate_nonce() -> str:
    """secrets.token_hex(16) — 32 char hex"""
    return secrets.token_hex(16)
