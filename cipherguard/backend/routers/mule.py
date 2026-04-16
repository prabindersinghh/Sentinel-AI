from fastapi import APIRouter, Body
from pydantic import BaseModel
from backend.core.blockchain import register_device, check_mule, get_ledger_history
from backend.core.crypto import compute_customer_pseudonym

router = APIRouter()

class RegisterMuleBankRequest(BaseModel):
    device_hash: str
    bank: str
    customer_id: str

@router.post("/register-bank")
def register_mule_bank(req: RegisterMuleBankRequest):
    customer_pseudonym = compute_customer_pseudonym(req.bank, req.customer_id)
    record = register_device(req.device_hash, customer_pseudonym, req.bank, 'REGISTRATION', None)
    return {
        'bank_count': 1,  # For demo, real count in scan
        'banks_seen': [req.bank],
        'threshold_reached': False
    }

class ScanMuleRequest(BaseModel):
    device_hash: str

@router.post("/scan")
def scan_mule(req: ScanMuleRequest):
    result = check_mule(req.device_hash)
    return result

@router.get("/ledger/{customer_pseudonym}")
def get_ledger(customer_pseudonym: str):
    return get_ledger_history(customer_pseudonym)
