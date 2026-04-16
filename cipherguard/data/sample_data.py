import os
import sqlite3
import random
import time
import csv
from pathlib import Path

DB_PATH = os.path.join(Path(__file__).parent.parent, 'backend', 'core', 'blockchain.db')
PAYSIM_CSV = os.path.join(Path(__file__).parent, 'PS_20174392719_1491204439457_log.csv')

# Scenario 1: Victim device registration
SCENARIO_1 = {
    'customer_id': 'CUST_884712',
    'bank': 'SBI',
    'platform': 'android',
    'imei': '490154203237518',
    'android_id': 'a1b2c3d4e5f6g7h8',
}

# Scenario 2: Attacker device for SIM swap
SCENARIO_2 = {
    'customer_id': 'CUST_884712',
    'bank': 'SBI',
    'platform': 'android',
    'imei': '351756051523999',
    'android_id': 'a1b2c3d4e5f6g7h8',
}

# Scenario 3: Social engineering
SCENARIO_3 = {
    'inbound_calls_15min': 7,
    'screen_share_active': True,
    'clipboard_external': True,
    'iccid_changed': False,
    'ported_recently': False,
    'tx_amount_band': 'HIGH',
}

# Scenario 4: Mule device (same hash at 3 banks)
SCENARIO_4 = [
    {'customer_id': 'CUST_900001', 'bank': 'SBI', 'device_hash': None},
    {'customer_id': 'CUST_900001', 'bank': 'HDFC', 'device_hash': None},
    {'customer_id': 'CUST_900001', 'bank': 'ICICI', 'device_hash': None},
]

# Helper: Compute deterministic hash (djb2, 64 hex chars)
def deterministic_hash(s):
    hash = 5381
    for c in s:
        hash = ((hash << 5) + hash) + ord(c)
        hash = hash & 0xFFFFFFFF
    h = abs(hash)
    hexh = hex(h)[2:].zfill(8)
    return (hexh * 8)[:64]

# Helper: Compute customer pseudonym (SHA-256)
def customer_pseudonym(bank, customer_id):
    import hashlib
    return hashlib.sha256(f"{bank}|{customer_id}".encode()).hexdigest()

# Helper: Insert device registration
def insert_registration(conn, device_hash, customer_pseudonym, bank, event_type, ts=None):
    c = conn.cursor()
    if ts is None:
        ts = int(time.time() * 1000)
    fabric_tx_id = os.urandom(16).hex()
    block_number = random.randint(100001, 999999)
    c.execute('''INSERT INTO ledger (device_hash, customer_pseudonym, event_type, bank_node_id, timestamp_ms, prev_hash, risk_flags, telecom_risk_score, tx_amount_band, fabric_tx_id, block_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (device_hash, customer_pseudonym, event_type, bank, ts, None, 0, 0, None, fabric_tx_id, block_number))
    conn.commit()

# Helper: Insert transaction
def insert_transaction(conn, device_hash, customer_pseudonym, bank, risk_flags, telecom_risk_score, tx_amount_band, event_type='TRANSACTION_INIT', ts=None):
    c = conn.cursor()
    if ts is None:
        ts = int(time.time() * 1000)
    fabric_tx_id = os.urandom(16).hex()
    block_number = random.randint(100001, 999999)
    c.execute('''INSERT INTO ledger (device_hash, customer_pseudonym, event_type, bank_node_id, timestamp_ms, prev_hash, risk_flags, telecom_risk_score, tx_amount_band, fabric_tx_id, block_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)''',
        (device_hash, customer_pseudonym, event_type, bank, ts, None, risk_flags, telecom_risk_score, tx_amount_band, fabric_tx_id, block_number))
    conn.commit()

# Populate scenarios and sample data
def populate():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM ledger')
    if c.fetchone()[0] > 0:
        print('Database already populated.')
        conn.close()
        return

    # Scenario 1: Victim registration
    hash1 = deterministic_hash(SCENARIO_1['imei'])
    pseudonym1 = customer_pseudonym(SCENARIO_1['bank'], SCENARIO_1['customer_id'])
    insert_registration(conn, hash1, pseudonym1, SCENARIO_1['bank'], 'REGISTRATION')

    # Scenario 2: Attacker registration (different IMEI)
    hash2 = deterministic_hash(SCENARIO_2['imei'])
    pseudonym2 = customer_pseudonym(SCENARIO_2['bank'], SCENARIO_2['customer_id'])
    insert_registration(conn, hash2, pseudonym2, SCENARIO_2['bank'], 'REGISTRATION')

    # Scenario 3: Social engineering transaction
    insert_transaction(
        conn,
        hash1,
        pseudonym1,
        SCENARIO_1['bank'],
        risk_flags=0,
        telecom_risk_score=200,
        tx_amount_band=SCENARIO_3['tx_amount_band'],
        event_type='TRANSACTION_INIT'
    )

    # Scenario 4: Mule device at 3 banks
    mule_hash = deterministic_hash('MULEIMEI123456789')
    for entry in SCENARIO_4:
        entry['device_hash'] = mule_hash
        pseudonym = customer_pseudonym(entry['bank'], entry['customer_id'])
        insert_registration(conn, mule_hash, pseudonym, entry['bank'], 'REGISTRATION')

    # Insert 50 historical transactions from PaySim
    if os.path.exists(PAYSIM_CSV):
        with open(PAYSIM_CSV, newline='') as csvfile:
            reader = csv.DictReader(csvfile)
            rows = list(reader)
            for i in range(50):
                row = random.choice(rows)
                device_hash = deterministic_hash(row['nameOrig'])
                customer_id = row['nameOrig']
                bank = random.choice(['SBI', 'HDFC', 'ICICI', 'PNB', 'Axis'])
                pseudonym = customer_pseudonym(bank, customer_id)
                risk_flags = 0
                telecom_risk_score = random.randint(0, 200)
                tx_amount_band = random.choice(['LOW', 'MEDIUM', 'HIGH', 'VERY_HIGH'])
                insert_transaction(conn, device_hash, pseudonym, bank, risk_flags, telecom_risk_score, tx_amount_band)
    conn.close()
    print('Sample data populated.')

if __name__ == '__main__':
    populate()
