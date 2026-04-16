'use client';
import { useState } from 'react';

export default function HelpPanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Floating ? button */}
      <button
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: 28,
          right: 28,
          width: 48,
          height: 48,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #00D4AA, #00B88F)',
          color: '#0A0E1A',
          border: 'none',
          cursor: 'pointer',
          fontSize: 20,
          fontWeight: 900,
          zIndex: 80,
          boxShadow: '0 4px 20px rgba(0,212,170,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'all .2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        title="Help & Demo Guide"
      >
        ?
      </button>

      {open && (
        <>
          {/* Overlay */}
          <div className="help-overlay" onClick={() => setOpen(false)} />

          {/* Panel */}
          <div className="help-panel">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#E8EDF5' }}>Demo Guide</div>
              <button
                onClick={() => setOpen(false)}
                style={{
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 8,
                  color: '#8A95A8',
                  padding: '4px 12px',
                  cursor: 'pointer',
                  fontSize: 14,
                }}
              >
                ✕ Close
              </button>
            </div>

            <Section title="LOCAL DEMO (recommended)">
              <Code>1. cd cipherguard</Code>
              <Code>2. npm install</Code>
              <Code>3. npm run dev</Code>
              <Code>4. Open http://localhost:3000</Code>
              <p style={{ color: '#8A95A8', fontSize: 12, marginTop: 8 }}>
                All functionality works offline — no backend required.
              </p>
            </Section>

            <Section title="STATIC HOSTING (30s backup deploy)">
              <Code>Vercel:  drag folder → vercel.com/new</Code>
              <Code>Netlify: drag → netlify.com/drop</Code>
              <Code>Pages:   git push → Settings → Pages</Code>
            </Section>

            <Section title="FULL BACKEND (production)">
              <Code>pip install fastapi uvicorn lightgbm numpy pandas</Code>
              <Code>uvicorn main:app --host 0.0.0.0 --port 8000</Code>
              <Code>POST /v1/device/register</Code>
              <Code>POST /v1/transaction/check</Code>
            </Section>

            <Section title="DATASETS">
              <Code>PaySim:   kaggle datasets download -d ealaxi/paysim1</Code>
              <Code>IEEE-CIS: kaggle competitions download -c ieee-fraud-detection</Code>
              <p style={{ color: '#8A95A8', fontSize: 12, marginTop: 8 }}>
                Place in /data/ folder relative to backend
              </p>
            </Section>

            <Section title="JUDGE Q&A">
              {[
                ['Can IMEI be spoofed?', 'TEE attestation. Cannot fake without hardware compromise.'],
                ['iOS has no IMEI?', 'We use DCDevice (DeviceCheck). Functionally equivalent — Apple hardware-bound.'],
                ['Who runs the nodes?', 'Each bank runs its own peer. BFT requires 2/3 honest nodes.'],
                ['DPDP compliant?', 'Zero PII on-chain. All data is pseudonymous HMAC hashes.'],
                ['vs Protectt.ai?', 'They detect at Step 4 (after OTP). CipherGuard detects at Step 0.'],
                ['vs Bureau?', 'Bureau has no telecom CDR signals. We have bilateral MNO agreements.'],
              ].map(([q, a]) => (
                <div key={q} style={{ marginBottom: 10 }}>
                  <div style={{ color: '#00D4AA', fontSize: 12, fontWeight: 600, marginBottom: 3 }}>{q}</div>
                  <div style={{ color: '#E8EDF5', fontSize: 12 }}>→ {a}</div>
                </div>
              ))}
            </Section>

            <Section title="ARCHITECTURE">
              {[
                'L1 — Device Fingerprint SDK (IMEI/DeviceCheck + RASP)',
                'L2 — Hyperledger Fabric Blockchain (HashRegistrar + MismatchDetector + MuleDetector)',
                'L3 — Telecom Context Enrichment (CAMARA SNA + bilateral MNO)',
                'L4 — Signal Capture & Feature Engine',
                'L5 — ML Ensemble (LightGBM + LSTM + GNN + Isolation Forest)',
                'L6 — Composite Decision Engine (APPROVE / STEP-UP / BLOCK)',
              ].map(l => (
                <div key={l} style={{ color: '#8A95A8', fontSize: 12, marginBottom: 6 }}>
                  <span style={{ color: '#4A9EFF' }}>›</span> {l}
                </div>
              ))}
            </Section>

            <div style={{
              marginTop: 16,
              padding: '12px 16px',
              background: 'rgba(0,212,170,0.06)',
              border: '1px solid rgba(0,212,170,0.15)',
              borderRadius: 8,
              fontSize: 12,
              color: '#8A95A8',
            }}>
              <span style={{ color: '#00D4AA', fontWeight: 700 }}>Key stat:</span> 13B+ monthly UPI transactions.
              4–120 minute current detection lag → <span style={{ color: '#00D4AA' }}>&lt;80ms with CipherGuard</span>.
            </div>
          </div>
        </>
      )}
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
        fontWeight: 700,
        color: '#4A9EFF',
        letterSpacing: '0.1em',
        marginBottom: 10,
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        paddingBottom: 6,
      }}>
        {title}
      </div>
      {children}
    </div>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 11,
      color: '#00D4AA',
      background: 'rgba(0,0,0,0.3)',
      border: '1px solid rgba(255,255,255,0.06)',
      borderRadius: 4,
      padding: '5px 10px',
      marginBottom: 4,
    }}>
      {children}
    </div>
  );
}
