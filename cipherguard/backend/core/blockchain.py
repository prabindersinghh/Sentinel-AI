import sqlite3
import secrets
import time
from typing import Dict, List

DB_PATH = 'backend/core/blockchain.db'

# Ensure tables exist
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()
c.execute('''CREATE TABLE IF NOT EXISTS ledger (
    id INTEGER PRIMARY KEY,
    device_hash TEXT,
    customer_pseudonym TEXT,
    event_type TEXT,
    bank_node_id TEXT,
    timestamp_ms INTEGER,
    prev_hash TEXT,
    risk_flags INTEGER DEFAULT 0,
    telecom_risk_score INTEGER DEFAULT 0,
    tx_amount_band TEXT,
    fabric_tx_id TEXT,
    block_number INTEGER
)''')
c.execute('''CREATE TABLE IF NOT EXISTS blocklist (
    device_hash TEXT PRIMARY KEY,
    added_at INTEGER,
    reason TEXT
)''')
conn.commit()
conn.close()

def get_last_block_number() -> int:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT MAX(block_number) FROM ledger')
    row = c.fetchone()
    conn.close()
    return row[0] if row[0] is not None else 100000

def register_device(device_hash, customer_pseudonym, bank_node_id, event_type, attest_cert) -> Dict:
    ts = int(time.time() * 1000)
    prev_hash = None
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT device_hash FROM ledger WHERE customer_pseudonym=? ORDER BY id DESC LIMIT 1', (customer_pseudonym,))
    row = c.fetchone()
    status = 'REGISTERED'
    risk_flags = 0
    if row:
        prev_hash = row[0]
        event_type = 'DEVICE_CHANGE'
        status = 'DEVICE_CHANGE_DETECTED'
        risk_flags |= 0b10  # Bit1: NEW_DEVICE
    fabric_tx_id = secrets.token_hex(32)
    block_number = get_last_block_number() + 1
    c.execute('''INSERT INTO ledger (device_hash, customer_pseudonym, event_type, bank_node_id, timestamp_ms, prev_hash, risk_flags, fabric_tx_id, block_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (device_hash, customer_pseudonym, event_type, bank_node_id, ts, prev_hash, risk_flags, fabric_tx_id, block_number))
    conn.commit()
    c.execute('SELECT * FROM ledger WHERE fabric_tx_id=?', (fabric_tx_id,))
    record = c.fetchone()
    conn.close()
    keys = [d[0] for d in c.description]
    return dict(zip(keys, record)) | {'status': status}

def check_transaction(device_hash, customer_pseudonym, bank_node_id, tx_amount_band, telecom_risk_score) -> Dict:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT device_hash FROM ledger WHERE customer_pseudonym=? ORDER BY id ASC LIMIT 1', (customer_pseudonym,))
    row = c.fetchone()
    baseline_hash = row[0] if row else None
    c.execute('SELECT 1 FROM blocklist WHERE device_hash=?', (device_hash,))
    on_blocklist = c.fetchone() is not None
    import hmac
    hash_match = False
    decision_signal = None
    if on_blocklist:
        decision_signal = 'MULE_BLOCKLIST_HIT'
    elif baseline_hash:
        hash_match = hmac.compare_digest(device_hash, baseline_hash)
        decision_signal = 'TRUST_CONFIRM' if hash_match else 'FRAUD_ALERT_HIGH_CONFIDENCE'
    else:
        decision_signal = 'NO_BASELINE'
    ts = int(time.time() * 1000)
    fabric_tx_id = secrets.token_hex(32)
    block_number = get_last_block_number() + 1
    c.execute('''INSERT INTO ledger (device_hash, customer_pseudonym, event_type, bank_node_id, timestamp_ms, prev_hash, risk_flags, telecom_risk_score, tx_amount_band, fabric_tx_id, block_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (device_hash, customer_pseudonym, 'TRANSACTION_INIT', bank_node_id, ts, baseline_hash, 0, telecom_risk_score, tx_amount_band, fabric_tx_id, block_number))
    conn.commit()
    c.execute('SELECT * FROM ledger WHERE fabric_tx_id=?', (fabric_tx_id,))
    record = c.fetchone()
    conn.close()
    keys = [d[0] for d in c.description]
    return {
        'hash_match': hash_match,
        'decision_signal': decision_signal,
        'on_blocklist': on_blocklist,
        'blockchain_record': dict(zip(keys, record))
    }

def check_mule(device_hash) -> Dict:
    now = int(time.time() * 1000)
    window_start = now - 48*3600*1000
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT DISTINCT bank_node_id FROM ledger WHERE device_hash=? AND timestamp_ms>=?', (device_hash, window_start))
    banks = [row[0] for row in c.fetchall()]
    is_mule = len(banks) >= 3
    if is_mule:
        c.execute('INSERT OR IGNORE INTO blocklist (device_hash, added_at, reason) VALUES (?, ?, ?)', (device_hash, now, 'MULE_DETECTED'))
        conn.commit()
    conn.close()
    return {'is_mule': is_mule, 'bank_count': len(banks), 'banks': banks}

def get_ledger_history(customer_pseudonym) -> List[Dict]:
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT * FROM ledger WHERE customer_pseudonym=? ORDER BY timestamp_ms ASC', (customer_pseudonym,))
    rows = c.fetchall()
    keys = [d[0] for d in c.description]
    conn.close()
    return [dict(zip(keys, row)) for row in rows]
