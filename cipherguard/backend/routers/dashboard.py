from fastapi import APIRouter
import sqlite3

router = APIRouter()

DB_PATH = 'backend/core/blockchain.db'

@router.get("/stats")
def get_dashboard_stats():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM ledger')
    total_transactions = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM ledger WHERE event_type='REGISTRATION'")
    registrations = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM ledger WHERE event_type='TRANSACTION_INIT' AND risk_flags=1")
    fraud_blocked = c.fetchone()[0]
    c.execute("SELECT COUNT(*) FROM ledger WHERE event_type='TRANSACTION_INIT' AND risk_flags=2")
    step_ups = c.fetchone()[0]
    c.execute("SELECT AVG(timestamp_ms) FROM ledger")
    avg_latency_ms = c.fetchone()[0] or 0
    c.execute("SELECT COUNT(*) FROM blocklist")
    mule_detections = c.fetchone()[0]
    # For demo, set fast_path_blocks, ml_path_blocks, telecom_triggers
    fast_path_blocks = fraud_blocked
    ml_path_blocks = 0
    telecom_triggers = 0
    conn.close()
    return {
        "total_transactions": total_transactions,
        "fraud_blocked": fraud_blocked,
        "step_ups": step_ups,
        "registrations": registrations,
        "avg_latency_ms": avg_latency_ms,
        "fast_path_blocks": fast_path_blocks,
        "ml_path_blocks": ml_path_blocks,
        "telecom_triggers": telecom_triggers,
        "mule_detections": mule_detections
    }
