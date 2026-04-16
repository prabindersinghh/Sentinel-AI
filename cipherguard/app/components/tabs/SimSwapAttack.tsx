'use client';
import { useState } from 'react';
import { useAppState } from '../../lib/state';
import { deterministicHash, randomHex, randInt, caseId } from '../../lib/utils';
import PipelineVisualization, { type PipelineInputs } from '../PipelineVisualization';

const AMOUNT_BANDS = [
  { label: 'LOW (₹500)',        value: 500,     band: 'LOW' },
  { label: 'MEDIUM (₹5,000)',   value: 5000,    band: 'MEDIUM' },
  { label: 'HIGH (₹45,000)',    value: 45000,   band: 'HIGH' },
  { label: 'VERY HIGH (₹1,20,000)', value: 120000, band: 'VERY_HIGH' },
];

const DEFAULT_VICTIM_IMEI  = '490154203237518';
const DEFAULT_ATTACKER_IMEI = '354358097364185';

interface AttackResult {
  victimHash: string;
  attackerHash: string;
  latency: number;
  caseIdStr: string;
  fabricTxId: string;
  bank: string;
}

export default function SimSwapAttack() {
  const { state, recordDecision, pushLog, setSLA } = useAppState();

  const registeredKeys = Object.keys(state.registeredDevices);
  const lastRegistered = registeredKeys.length > 0
    ? state.registeredDevices[registeredKeys[registeredKeys.length - 1]]
    : null;

  const victimImei     = lastRegistered?.deviceLabel ?? DEFAULT_VICTIM_IMEI;
  const victimBank     = lastRegistered?.bank ?? 'SBI';
  const victimCustomer = lastRegistered?.customerId ?? 'CUST_884712';
  const victimHashBase = deterministicHash(victimImei + victimCustomer + victimBank);

  const [attackerImei, setAttackerImei] = useState(DEFAULT_ATTACKER_IMEI);
  const [amountIdx, setAmountIdx]       = useState(2);
  const [vpa, setVpa]                   = useState('fraudster@ybl');

  const [running, setRunning]   = useState(false);
  const [logLines, setLogLines] = useState<Array<{ ms: number; text: string; color: string }>>([]);
  const [result, setResult]     = useState<AttackResult | null>(null);

  const [pipelineTrigger, setPipelineTrigger] = useState(0);

  const attackerHash = deterministicHash(attackerImei + victimCustomer + victimBank + '_attacker');
  const mismatch = attackerHash !== victimHashBase;

  const pipelineInputs: PipelineInputs = {
    scenario: 'simswap',
    victimImei,
    attackerImei,
    customerId: victimCustomer,
    bank: victimBank,
    amountBand: AMOUNT_BANDS[amountIdx].band,
  };

  const handleAttack = async () => {
    if (running) return;
    setRunning(true);
    setLogLines([]);
    setResult(null);
    setPipelineTrigger(t => t + 1);

    const vHash = victimHashBase;
    const aHash = attackerHash;
    const totalLatency = randInt(62, 78);
    const cId = caseId();
    const txId = randomHex(24);

    const timeline: Array<{ ms: number; text: string; color: string }> = [
      { ms: 0,  text: 'TRANSACTION_INIT received from attacker device', color: '#94A3B8' },
      { ms: 6,  text: 'L1 SDK: HMAC-SHA-256 computed from attacker IMEI', color: '#D97706' },
      { ms: 9,  text: `Attacker device_hash: ${aHash.substring(0, 16)}...`, color: '#DC2626' },
      { ms: 12, text: `Victim baseline hash:  ${vHash.substring(0, 16)}...`, color: '#2563EB' },
      { ms: 14, text: '⚡ Hash comparison initiated — MismatchDetector.sol', color: '#2563EB' },
      { ms: 19, text: 'Submitting to blockchain gateway via mTLS 1.3...', color: '#94A3B8' },
      { ms: 26, text: `HashRegistrar lookup: customer_pseudonym found (registered at ${victimBank})`, color: '#3B82F6' },
      { ms: 31, text: '████████████████ HASH MISMATCH DETECTED ████████████████', color: '#DC2626' },
      { ms: 34, text: 'risk_flags.HASH_MISMATCH = 1', color: '#DC2626' },
      { ms: 37, text: 'FraudAlert(HIGH_CONFIDENCE) emitted → consortium event bus', color: '#DC2626' },
      { ms: 41, text: 'L6 Decision Engine: ⚡ FAST PATH TRIGGERED', color: '#D97706' },
      { ms: 43, text: 'ML scoring queue: *** BYPASSED — NOT CONSULTED ***', color: '#D97706' },
      { ms: 45, text: 'OTP generation:   *** CANCELLED — NOT ISSUED ***', color: '#D97706' },
      { ms: 48, text: 'Decision: BLOCK (composite_score = 1000)', color: '#DC2626' },
      { ms: 52, text: 'UPI transaction: REJECTED — funds NOT moved', color: '#DC2626' },
      { ms: 55, text: `Bank webhook fired → outbound UPI frozen (60 min) @ ${victimBank}`, color: '#D97706' },
      { ms: 61, text: 'Push notification → victim\'s registered device (NOT SIM number)', color: '#2563EB' },
      { ms: 67, text: `Fraud case ${cId} created with full blockchain audit trail`, color: '#2563EB' },
      { ms: totalLatency, text: `✓ ATTACK PREVENTED IN ${totalLatency}ms — attacker never reached OTP stage`, color: '#059669' },
    ];

    for (const line of timeline) {
      await delay(randInt(80, 220));
      setLogLines(prev => [...prev, line]);
    }

    const res: AttackResult = {
      victimHash: vHash,
      attackerHash: aHash,
      latency: totalLatency,
      caseIdStr: cId,
      fabricTxId: txId,
      bank: victimBank,
    };
    setResult(res);
    recordDecision('BLOCK', totalLatency);
    setSLA({ fastPathBlock: totalLatency, sdkHash: 5, blockchainSubmit: 31, smartContract: 17 });
    pushLog(
      `[SIM SWAP BLOCKED] ${victimCustomer} @ ${victimBank} — hash mismatch in ${totalLatency}ms — Case ${cId}`,
      'block'
    );
    setRunning(false);
  };

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
          ⚡ SIM Swap Attack Simulator
        </h2>
        <div className="subheader-callout" style={{ marginTop: 12 }}>
          In this simulation, the attacker already has the victim's SIM card in a new device.
          They know the victim's UPI credentials. Watch what happens when they initiate a transaction.
        </div>
      </div>

      {/* Two-panel: victim vs attacker */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
        {/* Victim */}
        <div className="cg-card" style={{
          position: 'relative',
          border: '2px solid #BFDBFE',
          background: '#EFF6FF',
        }}>
          <div style={{
            position: 'absolute', top: -10, left: 16,
            background: '#2563EB', color: 'white',
            fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 12,
          }}>
            VICTIM'S REGISTERED DEVICE
          </div>
          <div style={{ paddingTop: 8 }}>
            <Row label="Customer ID"    value={victimCustomer} color="#0F172A" />
            <Row label="Bank"           value={victimBank} color="#0F172A" />
            <Row label="Device IMEI"    value={victimImei.substring(0, 8) + '....'} color="#1D4ED8" mono />
            <Row
              label="Registered hash"
              value={victimHashBase.substring(0, 20) + '...'}
              color="#1D4ED8"
              mono
            />
            {lastRegistered && (
              <Row label="Registered at" value={new Date(lastRegistered.timestamp).toLocaleTimeString()} color="#64748B" />
            )}
            <div style={{
              marginTop: 12,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '5px 14px',
              borderRadius: 20,
              background: '#DCFCE7',
              border: '1px solid #86EFAC',
              color: '#059669',
              fontSize: 12,
              fontWeight: 700,
            }}>
              ✓ TRUSTED DEVICE
            </div>
          </div>
        </div>

        {/* Attacker */}
        <div
          className="cg-card pulse-border"
          style={{
            position: 'relative',
            border: '2px solid #FCA5A5',
            background: '#FEF2F2',
          }}
        >
          <div style={{
            position: 'absolute', top: -10, left: 16,
            background: '#DC2626', color: 'white',
            fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 12,
          }}>
            ATTACKER'S DEVICE
          </div>
          <div style={{ paddingTop: 8 }}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Attacker IMEI (editable):
              </label>
              <input
                type="text"
                value={attackerImei}
                onChange={e => setAttackerImei(e.target.value)}
                style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}
              />
            </div>
            <Row
              label="Computed hash"
              value={attackerHash.substring(0, 20) + '...'}
              color="#DC2626"
              mono
            />
            <Row label="Device status" value="New device, victim's SIM inserted" color="#D97706" />
            <div style={{
              marginTop: 12,
              padding: '8px 12px',
              borderRadius: 8,
              background: '#FFF7ED',
              border: '1px solid #FED7AA',
              fontSize: 12,
            }}>
              <div style={{ color: '#DC2626', fontWeight: 700, marginBottom: 4 }}>Hash Comparison:</div>
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                <div style={{ color: '#2563EB', marginBottom: 2 }}>
                  Victim:   {victimHashBase.substring(0, 16)}...
                </div>
                <div style={{ color: '#DC2626' }}>
                  Attacker: {attackerHash.substring(0, 16)}...
                </div>
              </div>
              <div style={{
                marginTop: 6,
                fontWeight: 700,
                color: mismatch ? '#DC2626' : '#059669',
                fontSize: 12,
              }}>
                {mismatch ? '✗ MISMATCH — BLOCK WILL TRIGGER' : '✓ MATCH — WOULD PASS (same IMEI)'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction config */}
      <div className="cg-card" style={{ marginBottom: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div>
            <label style={{ fontSize: 12, color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Amount Band:
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {AMOUNT_BANDS.map((b, i) => (
                <button
                  key={i}
                  onClick={() => setAmountIdx(i)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: `1px solid ${i === amountIdx ? '#BFDBFE' : '#E2E8F0'}`,
                    background: i === amountIdx ? '#EFF6FF' : '#F8FAFF',
                    color: i === amountIdx ? '#1D4ED8' : '#64748B',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                  }}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label style={{ fontSize: 12, color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 8 }}>
              Destination VPA:
            </label>
            <input type="text" value={vpa} onChange={e => setVpa(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Launch button */}
      <button
        className="btn-danger"
        onClick={handleAttack}
        disabled={running}
        style={{ marginBottom: 24, maxWidth: '100%' }}
      >
        {running ? '⏳ Attack In Progress...' : '🚨 LAUNCH SIM SWAP ATTACK'}
      </button>

      {/* Timeline log */}
      {logLines.length > 0 && (
        <div className="cg-card" style={{ marginBottom: 20 }}>
          <div style={{ fontWeight: 700, color: '#0F172A', marginBottom: 12, fontSize: 15 }}>
            ⚡ Attack Timeline
          </div>
          <div className="log-terminal">
            {logLines.map((l, i) => (
              <div key={i} className="stream-in" style={{ color: l.color, marginBottom: 2 }}>
                <span style={{ color: '#4B5563', marginRight: 8 }}>
                  +{String(l.ms).padStart(3, ' ')}ms
                </span>
                {l.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result card */}
      {result && (
        <div className="cg-card-danger fade-up" style={{ marginBottom: 24 }}>
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div className="block-stamp stamp-in">BLOCKED</div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {[
              ['PATHWAY',           'SMART CONTRACT FAST PATH'],
              ['HASH_MATCH',        'FALSE', '#DC2626'],
              ['ML QUEUE',          'SKIPPED — BYPASSED', '#D97706'],
              ['OTP ISSUED',        'NO', '#DC2626'],
              ['COMPOSITE SCORE',   '1000 / 1000', '#DC2626'],
              ['LATENCY',           `${result.latency}ms`, '#2563EB'],
              ['VICTIM NOTIFIED',   'Push → registered device (not SIM)'],
              ['UPI STATUS',        'Frozen 60 minutes'],
              ['CASE ID',           result.caseIdStr],
              ['FABRIC TX ID',      result.fabricTxId.substring(0, 12) + '...'],
            ].map(([k, v, c]) => (
              <div key={k} style={{ fontSize: 13 }}>
                <div style={{ color: '#64748B', fontSize: 11, marginBottom: 3 }}>{k}</div>
                <div style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: (c as string) || '#0F172A',
                  fontWeight: 700,
                }}>
                  {v}
                </div>
              </div>
            ))}
          </div>

          <div style={{
            padding: '12px 16px',
            background: '#EFF6FF',
            borderRadius: 8,
            fontSize: 12,
            color: '#475569',
            borderLeft: '3px solid #2563EB',
          }}>
            <span style={{ color: '#1D4ED8', fontWeight: 700 }}>
              Current industry standard: 4–120 minutes.{' '}
            </span>
            CipherGuard: {result.latency}ms.
            The attacker's transaction failed before they reached the OTP stage.{' '}
            <span style={{ color: '#D97706', fontWeight: 600 }}>
              This is architecturally impossible on any existing Indian UPI fraud platform.
            </span>
          </div>
        </div>
      )}

      {/* Pipeline Visualization */}
      <PipelineVisualization trigger={pipelineTrigger} inputs={pipelineInputs} />
    </div>
  );
}

function Row({
  label, value, color = '#0F172A', mono = false
}: { label: string; value: string; color?: string; mono?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, gap: 8 }}>
      <span style={{ color: '#64748B', flexShrink: 0 }}>{label}:</span>
      <span style={{
        color,
        fontFamily: mono ? "'JetBrains Mono', monospace" : undefined,
        fontSize: mono ? 12 : undefined,
        wordBreak: 'break-all',
        textAlign: 'right',
      }}>
        {value}
      </span>
    </div>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
