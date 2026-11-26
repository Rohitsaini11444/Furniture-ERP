"""
Security, DPAPI Credential Protection, and Emergency Recovery Key Management
"""
import ctypes
from ctypes import wintypes
import json
import os
import secrets
import subprocess
from pathlib import Path
from .config import CREDENTIALS_DIR, CREDENTIALS_FILE, EMERGENCY_KEY_FILE

class DATA_BLOB(ctypes.Structure):
    _fields_ = [('cbData', wintypes.DWORD), ('pbData', ctypes.POINTER(ctypes.c_char))]

CryptProtectData = ctypes.windll.crypt32.CryptProtectData
CryptProtectData.argtypes = [
    ctypes.POINTER(DATA_BLOB), wintypes.LPCWSTR, ctypes.POINTER(DATA_BLOB),
    ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(DATA_BLOB)
]
CryptProtectData.restype = wintypes.BOOL

CryptUnprotectData = ctypes.windll.crypt32.CryptUnprotectData
CryptUnprotectData.argtypes = [
    ctypes.POINTER(DATA_BLOB), ctypes.POINTER(wintypes.LPWSTR), ctypes.POINTER(DATA_BLOB),
    ctypes.c_void_p, ctypes.c_void_p, wintypes.DWORD, ctypes.POINTER(DATA_BLOB)
]
CryptUnprotectData.restype = wintypes.BOOL

def dpapi_protect(plaintext: bytes, description: str = "Pinkcity_ERP_Backup") -> bytes:
    """Encrypt data using Windows DPAPI (CurrentUser scope)."""
    in_blob = DATA_BLOB(len(plaintext), ctypes.cast(ctypes.create_string_buffer(plaintext), ctypes.POINTER(ctypes.c_char)))
    out_blob = DATA_BLOB()
    # 0 = CurrentUser scope
    if not CryptProtectData(ctypes.byref(in_blob), description, None, None, None, 0, ctypes.byref(out_blob)):
        raise ctypes.WinError()
    res = ctypes.string_at(out_blob.pbData, out_blob.cbData)
    ctypes.windll.kernel32.LocalFree(out_blob.pbData)
    return res

def dpapi_unprotect(ciphertext: bytes) -> bytes:
    """Decrypt data using Windows DPAPI (CurrentUser scope)."""
    in_blob = DATA_BLOB(len(ciphertext), ctypes.cast(ctypes.create_string_buffer(ciphertext), ctypes.POINTER(ctypes.c_char)))
    out_blob = DATA_BLOB()
    if not CryptUnprotectData(ctypes.byref(in_blob), None, None, None, None, 0, ctypes.byref(out_blob)):
        raise ctypes.WinError()
    res = ctypes.string_at(out_blob.pbData, out_blob.cbData)
    ctypes.windll.kernel32.LocalFree(out_blob.pbData)
    return res

def set_strict_acls(target_path: Path):
    """Restrict NTFS file permissions strictly to current user."""
    try:
        username = os.environ.get("USERNAME", "User")
        subprocess.run(
            ["icacls", str(target_path), "/inheritance:r", "/grant:r", f"{username}:(R,W)"],
            capture_output=True, check=True
        )
    except Exception as e:
        print(f"Warning: Failed to set strict ACLs on {target_path}: {e}")

def init_security(db_password: str = "Postgres@123", force_regenerate: bool = False):
    """
    Initialize secure DPAPI credential vault and emergency recovery key.
    """
    CREDENTIALS_DIR.mkdir(parents=True, exist_ok=True)
    set_strict_acls(CREDENTIALS_DIR)

    if CREDENTIALS_FILE.exists() and not force_regenerate:
        return get_credentials()

    # Generate a cryptographically secure 256-bit passphrase (64 hex characters)
    restic_passphrase = secrets.token_hex(32)

    creds = {
        "restic_key": restic_passphrase,
        "db_password": db_password,
        "authorized_user": "erp_trial_user",
        "authorized_db": "erp_furniture_trial"
    }

    raw_json = json.dumps(creds).encode("utf-8")
    encrypted_blob = dpapi_protect(raw_json)

    with open(CREDENTIALS_FILE, "wb") as f:
        f.write(encrypted_blob)
    set_strict_acls(CREDENTIALS_FILE)

    # Generate Emergency Disaster Recovery Key document
    emergency_content = f"""================================================================================
PINKCITY ENTERPRISES ERP - EMERGENCY DISASTER RECOVERY KEY
CONFIDENTIAL & RESTRICTED ACCESS
================================================================================

This document contains the independent offline encryption recovery key for the
Pinkcity Enterprises ERP Automated Backup System.

If the ERP host laptop experiences catastrophic hardware failure, theft, or
corruption, authorized administrators can restore all encrypted database and
media backups directly from the network share (\\\\192.168.1.7\\Erp Software\\Backups)
using this offline key.

--------------------------------------------------------------------------------
RESTIC REPOSITORY ENCRYPTION KEY:
{restic_passphrase}
--------------------------------------------------------------------------------

Target Database: erp_furniture_trial
Database Role:   erp_trial_user

STORAGE & HANDLING INSTRUCTIONS:
1. Print a physical copy of this document.
2. Store the physical copy in the company's secure offline fireproof safe.
3. NEVER commit this key into Git, email it, or place it on public shares.
4. Delete temporary digital copies once safely transferred to offline storage.
5. To restore on any new machine:
   restic -r "\\\\192.168.1.7\\Erp Software\\Backups\\Repository" restore latest --target C:\\Restore
   (Enter the key above when prompted).

Generated: 2026-11-23 Asia/Kolkata
================================================================================
"""
    with open(EMERGENCY_KEY_FILE, "w", encoding="utf-8") as f:
        f.write(emergency_content)
    set_strict_acls(EMERGENCY_KEY_FILE)

    return creds

def get_credentials() -> dict:
    """Decrypt and return credentials in memory."""
    if not CREDENTIALS_FILE.exists():
        raise FileNotFoundError(f"Credential file not found at {CREDENTIALS_FILE}. Run init_security first.")
    with open(CREDENTIALS_FILE, "rb") as f:
        encrypted_blob = f.read()
    raw_json = dpapi_unprotect(encrypted_blob)
    return json.loads(raw_json.decode("utf-8"))
