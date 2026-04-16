
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.routers import device, mule, dashboard
import os
import sqlite3
import subprocess

# Auto-populate DB if empty
def ensure_sample_data():
    db_path = os.path.join(os.path.dirname(__file__), 'core', 'blockchain.db')
    conn = sqlite3.connect(db_path)
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM ledger')
    count = c.fetchone()[0]
    conn.close()
    if count == 0:
        # Run sample_data.py from data folder
        data_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data'))
        subprocess.run(['python', 'sample_data.py'], cwd=data_dir)

ensure_sample_data()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(device.router, prefix="/v1/device")
app.include_router(mule.router, prefix="/v1/mule")
app.include_router(dashboard.router, prefix="/v1/dashboard")

@app.get("/")
def root():
    return {"status": "CipherGuard backend running"}
