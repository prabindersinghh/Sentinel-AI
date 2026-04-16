'use client';
import { useState, useRef } from 'react';
import { useAppState } from '../../lib/state';
import { deterministicHash, randomHex, bankNodeId, randInt } from '../../lib/utils';

const BANKS = ['SBI', 'HDFC Bank', 'ICICI Bank', 'Kotak Mahindra', 'PNB', 'Axis Bank', 'IndusInd'];
const PLATFORMS = [
  'Android 14 (Pixel 8)',
  'Android 13 (Samsung S23)',
  'iOS 17 (iPhone 15)',
  'iOS 16 (iPhone 13)',
];

function isIOS(platform: string) {
  return platform.startsWith('iOS');
}

function buildLog(platform: string, imei: string, bank: string): Array<{ ms: number; text: string; color: string }> {
  const ios = isIOS(platform);
  return [
    { ms: 0,   text: 'RASP integrity checks initializing...', color: '#94A3B8' },
    { ms: 45,  text: 'Root detection: PASS (RootBeer scan + /system/bin/su check)', color: '#059669' },
    { ms: 72,  text: 'Frida injection scan (/proc/self/maps): PASS', color: '#059669' },
    { ms: 89,  text: 'Emulator detection (Build.FINGERPRINT + QEMU props): PASS', color: '#059669' },
    { ms: 134, text: ios
        ? 'Hardware attestation: DCAppAttestService (iOS 14+) — Apple-verified'
        : 'Hardware attestation: TEE certificate generated (Android Keystore)',
      color: '#3B82F6' },
    { ms: 156, text: ios
        ? `HMAC-SHA-256(DCDevice_token || IDFV || appAttest_keyId, server_salt) computing...`
        : `HMAC-SHA-256(IMEI || ANDROID_ID || attest_cert, server_salt) computing...`,
      color: '#D97706' },
    { ms: 162, text: ios
        ? 'DeviceCheck token cleared from memory (security compliance)'
        : 'Raw IMEI zeroed from memory [Arrays.fill() — security compliance]',
      color: '#94A3B8' },
    { ms: 201, text: 'mTLS 1.3 handshake with Bank Salt Service...', color: '#94A3B8' },
    { ms: 234, text: 'server_salt fetched (32-byte CSPRNG, cached in EncryptedSharedPreferences)', color: '#3B82F6' },
    { ms: 287, text: 'REGISTRATION event → HashRegistrar.sol via bank gateway', color: '#D97706' },
    { ms: 334, text: 'Orderer confirmation: BFT consensus 3/3 nodes', color: '#3B82F6' },
    { ms: 378, text: ios
        ? 'App attestation validated against Apple roots: PASS'
        : 'Attestation cert validated against Google attestation roots: PASS',
      color: '#059669' },
    { ms: 401, text: 'Baseline hash written to world state (CouchDB)', color: '#94A3B8' },
    { ms: 422, text: `✓ Fabric TX committed — device registered to ${bank} consortium`, color: '#2563EB' },
  ];
}

interface BlockchainRecord {
  deviceHash: string;
  customerPseudonym: string;
  eventType: string;
  riskFlags: string;
  attestation: string;
  rasp: string;
  saltTtl: string;
  bankNodeId: string;
  txId: string;
  blockNumber: number;
  ordererTime: string;
}

export default function DeviceRegistration() {
  const { registerDevice, pushLog } = useAppState();

  const [customerId, setCustomerId] = useState('CUST_884712');
  const [bank, setBank] = useState('SBI');
  const [platform, setPlatform] = useState(PLATFORMS[0]);
  const [imei, setImei] = useState('490154203237518');

  const [running, setRunning]   = useState(false);
  const [done, setDone]         = useState(false);
  const [logLines, setLogLines] = useState<Array<{ ms: number; text: string; color: string }>>([]);
  const [record, setRecord]     = useState<BlockchainRecord | null>(null);

  const abortRef = useRef(false);

  const ios = isIOS(platform);

  const handleRegister = async () => {
    if (running) return;
    abortRef.current = false;
    setRunning(true);
    setDone(false);
    setLogLines([]);
    setRecord(null);

    const effectiveImei = ios ? `DCDevice-${randomHex(16)}` : imei;
    const deviceHash = deterministicHash(effectiveImei + customerId + bank);
    const logs = buildLog(platform, effectiveImei, bank);

    for (const line of logs) {
      if (abortRef.current) break;
      await delay(randInt(80, 200));
      setLogLines(prev => [...prev, line]);
    }

    if (!abortRef.current) {
      const txId = randomHex(24);
      const blockNum = randInt(100000, 999999);
      const rec: BlockchainRecord = {
        deviceHash,
        customerPseudonym: `${randomHex(6)}...${randomHex(4)}`,
        eventType: 'REGISTRATION',
        riskFlags: '0x00 (clean — no flags set)',
        attestation: ios
          ? 'App Attest — Apple verified (DCAppAttestService)'
          : 'TEE Hardware (Android Keystore KEY_HARDWARE_LEVEL_STRONG)',
        rasp: 'PASS — root:NO frida:NO emulator:NO clock_drift:NO',
        saltTtl: '90 days (rotation scheduled)',
        bankNodeId: bankNodeId(bank),
        txId,
        blockNumber: blockNum,
        ordererTime: new Date().toISOString(),
      };
      setRecord(rec);
      setDone(true);

      registerDevice({
        customerId,
        bank,
        platform,
        deviceLabel: effectiveImei,
        deviceHash,
        timestamp: new Date().toISOString(),
        blockNumber: blockNum,
        txId,
      });

      pushLog(
        `[REGISTRATION] ${customerId} @ ${bank} — ${deviceHash.substring(0, 12)}... CONFIRMED`,
        'register'
      );
    }

    setRunning(false);
  };

  const handlePlatformChange = (p: string) => {
    setPlatform(p);
    if (p.startsWith('iOS')) setImei('DCDevice-A4F2B...');
    else setImei('490154203237518');
    setLogLines([]);
    setRecord(null);
    setDone(false);
  };

  const liveHash = deterministicHash(imei + customerId + bank);

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
          📱 Device Registration
        </h2>
        <p style={{ color: '#64748B', fontSize: 14 }}>
          Hardware-anchor IMEI hash on Hyperledger Fabric shared across consortium banks.
          Same IMEI → same hash every time (djb2 deterministic).
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* ── LEFT: Registration Form ── */}
        <div>
          <div className="cg-card" style={{ marginBottom: 16 }}>
            <h3 style={{ fontWeight: 700, color: '#0F172A', marginBottom: 18, fontSize: 15 }}>
              Registration Form
            </h3>

            <Field label="Customer ID">
              <input
                type="text"
                value={customerId}
                onChange={e => setCustomerId(e.target.value)}
                placeholder="CUST_884712"
              />
            </Field>

            <Field label="Bank">
              <select value={bank} onChange={e => setBank(e.target.value)}>
                {BANKS.map(b => <option key={b}>{b}</option>)}
              </select>
            </Field>

            <Field label="Platform">
              <select value={platform} onChange={e => handlePlatformChange(e.target.value)}>
                {PLATFORMS.map(p => <option key={p}>{p}</option>)}
              </select>
            </Field>

            <Field
              label={
                ios
                  ? 'Device UUID (iOS uses DCDevice token — not raw IMEI)'
                  : 'IMEI (raw — hashed on-device, never transmitted)'
              }
            >
              <input
                type="text"
                value={imei}
                onChange={e => { if (!ios) setImei(e.target.value); }}
                readOnly={ios}
                placeholder={ios ? 'DCDevice-A4F2B...' : '490154203237518'}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
              />
            </Field>

            {!ios && (
              <div style={{
                background: '#EFF6FF',
                border: '1px solid #BFDBFE',
                borderRadius: 8,
                padding: '10px 14px',
                marginTop: 4,
                marginBottom: 16,
              }}>
                <div style={{ fontSize: 11, color: '#64748B', marginBottom: 4 }}>
                  Live hash preview (try typing the same IMEI twice):
                </div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: '#1D4ED8',
                  wordBreak: 'break-all',
                }}>
                  {liveHash}
                </div>
              </div>
            )}

            <button
              className="btn-teal"
              onClick={handleRegister}
              disabled={running}
              style={{ marginTop: 4 }}
            >
              {running ? '⏳ Registering to Blockchain...' : '🔐 Register Device to Blockchain'}
            </button>
          </div>

          {/* SDK info card */}
          <div className="cg-card" style={{ fontSize: 13, color: '#64748B' }}>
            <div style={{ fontWeight: 700, color: '#1D4ED8', marginBottom: 10, fontSize: 14 }}>
              SDK Communication (mTLS 1.3)
            </div>
            {[
              'Salt fetch timeout: 3000ms hard (cached max 7-day stale)',
              'Hash submit timeout: 2000ms hard. On timeout: DEVICE_TRUSTED=false',
              ios ? 'SDK bundle: ≤1.5MB XCFramework' : 'SDK bundle: ≤2MB AAR',
              'Certificate pinned (SHA-256) — no HTTP fallback',
              'No background polling — hash submitted on-demand only',
            ].map(s => (
              <div key={s} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                <span style={{ color: '#2563EB', flexShrink: 0 }}>✓</span>
                <span>{s}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT: Event Log ── */}
        <div>
          <div className="cg-card">
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <h3 style={{ fontWeight: 700, color: '#0F172A', fontSize: 15 }}>
                Blockchain Event Log
              </h3>
              {running && (
                <span style={{
                  fontSize: 11,
                  color: '#D97706',
                  fontFamily: "'JetBrains Mono', monospace",
                  animation: 'badge-pulse 1s ease-in-out infinite',
                }}>
                  ● PROCESSING
                </span>
              )}
              {done && (
                <span style={{
                  fontSize: 11,
                  color: '#2563EB',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  ✓ COMMITTED
                </span>
              )}
            </div>

            <div className="log-terminal">
              {logLines.length === 0 && !running && (
                <div style={{ color: '#475569', fontStyle: 'italic' }}>
                  Click "Register Device" to begin...
                </div>
              )}
              {logLines.map((l, i) => (
                <div key={i} className="stream-in" style={{ color: l.color, marginBottom: 2 }}>
                  <span style={{ color: '#475569', marginRight: 8 }}>
                    [{String(l.ms).padStart(4, '0')}ms]
                  </span>
                  {l.text}
                </div>
              ))}
            </div>
          </div>

          {/* Blockchain Record Card */}
          {record && (
            <div className="cg-card-blue fade-up" style={{ marginTop: 16 }}>
              <div style={{
                fontWeight: 800,
                color: '#1D4ED8',
                fontSize: 15,
                marginBottom: 16,
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}>
                ⛓️ Blockchain Record — Committed
              </div>
              <div style={{ display: 'grid', gap: 8 }}>
                {[
                  ['device_hash',          record.deviceHash],
                  ['customer_pseudonym',   record.customerPseudonym],
                  ['event_type',           record.eventType],
                  ['risk_flags',           record.riskFlags],
                  ['attestation',          record.attestation],
                  ['RASP integrity',       record.rasp],
                  ['salt_ttl',             record.saltTtl],
                  ['bank_node_id',         record.bankNodeId],
                  ['Fabric TX ID',         record.txId.substring(0, 12) + '...'],
                  ['Block number',         String(record.blockNumber)],
                  ['Orderer confirmation', `${record.ordererTime} — 3/3 BFT nodes`],
                ].map(([k, v]) => (
                  <div
                    key={k}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '160px 1fr',
                      gap: 8,
                      fontSize: 12,
                      alignItems: 'start',
                    }}
                  >
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#2563EB',
                      flexShrink: 0,
                    }}>
                      {k}:
                    </span>
                    <span style={{
                      fontFamily: "'JetBrains Mono', monospace",
                      color: '#0F172A',
                      wordBreak: 'break-all',
                    }}>
                      {v}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: 'block', fontSize: 12, color: '#64748B', marginBottom: 6, fontWeight: 600 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function delay(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}
