from fastapi import APIRouter, Body
from pydantic import BaseModel
import time
from backend.core.crypto import compute_device_hash, compute_ios_hash, compute_customer_pseudonym, generate_salt
from backend.core.rasp import run_rasp_checks
from backend.core.blockchain import register_device, check_transaction
from backend.core.telecom import compute_telecom_score
from backend.core.ml_engine import compute_ml_score
from backend.core.decision_engine import compute_composite_score, check_fast_path

router = APIRouter()

class RaspFlags(BaseModel):
    root_detected: bool = False
    frida_detected: bool = False
    emulator_detected: bool = False
    clock_drift_ms: int = 0
    attestation_valid: bool = True

class RegisterRequest(BaseModel):
    customer_id: str
    bank: str
    platform: str
    imei: str = None
    android_id: str = None
    dcdevice_token: str = None
    idfv: str = None
    attest_key_id: str = None
    rasp_flags: RaspFlags

@router.post("/register")
def register_device_api(req: RegisterRequest):
    t0 = time.perf_counter()
    # RASP
    rasp_start = time.perf_counter()
    rasp_result = run_rasp_checks(req.platform, req.rasp_flags.dict())
    rasp_ms = (time.perf_counter() - rasp_start) * 1000
    # Salt
    salt = generate_salt()
    # Hash
    hash_start = time.perf_counter()
    if req.platform == 'android':
        device_hash = compute_device_hash(req.imei, req.android_id, salt)
        hash_derivation = f"HMAC-SHA-256({req.imei}|{req.android_id}, key=salt)"
    else:
        device_hash = compute_ios_hash(req.dcdevice_token, req.idfv, req.attest_key_id, salt)
        hash_derivation = f"HMAC-SHA-256({req.dcdevice_token}|{req.idfv}|{req.attest_key_id}, key=salt)"
    hash_ms = (time.perf_counter() - hash_start) * 1000
    # Pseudonym
    customer_pseudonym = compute_customer_pseudonym(req.bank, req.customer_id)
    # Blockchain
    bc_start = time.perf_counter()
    blockchain_record = register_device(device_hash, customer_pseudonym, req.bank, 'REGISTRATION', None)
    bc_ms = (time.perf_counter() - bc_start) * 1000
    total_ms = (time.perf_counter() - t0) * 1000
    return {
        "status": blockchain_record['status'],
        "device_hash": device_hash,
        "customer_pseudonym": customer_pseudonym,
        "salt_used": salt,
        "rasp_result": rasp_result,
        "blockchain_record": blockchain_record,
        "hash_derivation": hash_derivation,
        "latency_breakdown": {
            "rasp_ms": rasp_ms,
            "hash_computation_ms": hash_ms,
            "blockchain_submission_ms": bc_ms,
            "total_ms": total_ms
        },
        "latency_ms": total_ms
    }

class TelecomContext(BaseModel):
    inbound_calls_15min: int
    screen_share_active: bool
    clipboard_external: bool
    iccid_changed: bool
    ported_recently: bool

class Velocity(BaseModel):
    txn_1min: int = 1
    txn_5min: int = 1
    txn_1hr: int = 2

class CheckTransactionRequest(BaseModel):
    customer_id: str
    bank: str
    platform: str
    imei: str
    android_id: str = None
    tx_amount_band: str
    telecom_context: TelecomContext
    velocity: Velocity = Velocity()

@router.post("/check-transaction")
def check_transaction_api(req: CheckTransactionRequest):
    t0 = time.perf_counter()
    # Hash
    hash_start = time.perf_counter()
    salt = generate_salt()  # For check, salt can be generated or stored per user in real system
    device_hash = compute_device_hash(req.imei, req.android_id, salt)
    hash_ms = (time.perf_counter() - hash_start) * 1000
    customer_pseudonym = compute_customer_pseudonym(req.bank, req.customer_id)
    # Blockchain check
    bc_start = time.perf_counter()
    bc_result = check_transaction(device_hash, customer_pseudonym, req.bank, req.tx_amount_band, 0)
    bc_ms = (time.perf_counter() - bc_start) * 1000
    # Fast path
    fp_start = time.perf_counter()
    fast_path = check_fast_path(
        hash_mismatch=not bc_result['hash_match'],
        screen_share_active=req.telecom_context.screen_share_active,
        ported_recently=req.telecom_context.ported_recently,
        tx_amount_band=req.tx_amount_band,
        telecom_risk_score=0,  # Will be computed below
        on_mule_blocklist=bc_result['on_blocklist']
    )
    fp_ms = (time.perf_counter() - fp_start) * 1000
    if fast_path['fast_path_triggered']:
        total_ms = (time.perf_counter() - t0) * 1000
        return {
            "device_hash": device_hash,
            "customer_pseudonym": customer_pseudonym,
            "hash_match": bc_result['hash_match'],
            "fast_path_triggered": True,
            "fast_path_reason": fast_path['trigger_reason'],
            "telecom_result": None,
            "ml_result": None,
            "composite_result": None,
            "decision": fast_path['decision'],
            "blockchain_record": bc_result['blockchain_record'],
            "latency_breakdown": {
                "hash_computation_ms": hash_ms,
                "blockchain_check_ms": bc_ms,
                "telecom_ms": 0,
                "ml_scoring_ms": 0,
                "decision_ms": fp_ms,
                "total_ms": total_ms
            },
            "audit_trail": {
                "fabric_tx_id": bc_result['blockchain_record'].get('fabric_tx_id'),
                "block_number": bc_result['blockchain_record'].get('block_number'),
                "case_id": None
            }
        }
    # Telecom
    telecom_start = time.perf_counter()
    telecom_result = compute_telecom_score(
        req.telecom_context.inbound_calls_15min,
        req.telecom_context.screen_share_active,
        req.telecom_context.clipboard_external,
        req.telecom_context.iccid_changed,
        req.telecom_context.ported_recently
    )
    telecom_ms = (time.perf_counter() - telecom_start) * 1000
    # ML
    ml_start = time.perf_counter()
    ml_result = compute_ml_score({
        'device_trusted': bc_result['hash_match'],
        'hash_match': bc_result['hash_match'],
        'cross_bank_seen': False,  # For demo
        'days_since_registration': 30,  # For demo
        'telecom_risk_score': telecom_result['total'],
        'call_volume_pre_txn': req.telecom_context.inbound_calls_15min,
        'screen_share_active': req.telecom_context.screen_share_active,
        'ported_recently': req.telecom_context.ported_recently,
        'iccid_changed': req.telecom_context.iccid_changed,
        'tx_amount_band': req.tx_amount_band,
        'velocity_1min': req.velocity.txn_1min
    })
    ml_ms = (time.perf_counter() - ml_start) * 1000
    # Composite
    comp_start = time.perf_counter()
    composite_result = compute_composite_score(
        hash_mismatch=not bc_result['hash_match'],
        telecom_risk_score=telecom_result['total'],
        ml_score=ml_result['ml_score'],
        iccid_changed=req.telecom_context.iccid_changed,
        cross_bank_seen=False
    )
    comp_ms = (time.perf_counter() - comp_start) * 1000
    total_ms = (time.perf_counter() - t0) * 1000
    return {
        "device_hash": device_hash,
        "customer_pseudonym": customer_pseudonym,
        "hash_match": bc_result['hash_match'],
        "fast_path_triggered": False,
        "fast_path_reason": None,
        "telecom_result": telecom_result,
        "ml_result": ml_result,
        "composite_result": composite_result,
        "decision": composite_result['decision'],
        "blockchain_record": bc_result['blockchain_record'],
        "latency_breakdown": {
            "hash_computation_ms": hash_ms,
            "blockchain_check_ms": bc_ms,
            "telecom_ms": telecom_ms,
            "ml_scoring_ms": ml_ms,
            "decision_ms": comp_ms,
            "total_ms": total_ms
        },
        "audit_trail": {
            "fabric_tx_id": bc_result['blockchain_record'].get('fabric_tx_id'),
            "block_number": bc_result['blockchain_record'].get('block_number'),
            "case_id": None
        }
    }
