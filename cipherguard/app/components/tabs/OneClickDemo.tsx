'use client';
import { useState } from 'react';
import PipelineVisualization, { type PipelineInputs } from '../PipelineVisualization';

/* ─────────────────────────────────────────────
   Scenario presets — realistic transaction data
───────────────────────────────────────────── */
const SCENARIOS = [
  {
    id: 'simswap',
    icon: '⚡',
    title: 'SIM Swap Attack',
    badge: 'FAST PATH · <80ms',
    badgeColor: '#DC2626',
    badgeBg: '#FEE2E2',
    description: 'Attacker swaps victim\'s SIM into a new device and initiates ₹45,000 UPI transfer. CipherGuard detects device hash mismatch at L2 and blocks before OTP is even generated.',
    victim: {
      name: 'Rajesh Kumar',
      customerId: 'CUST_884712',
      bank: 'State Bank of India',
      bankShort: 'SBI',
      imei: '490154203237518',
      device: 'Samsung Galaxy S23',
      upiId: 'rajesh.kumar@sbi',
    },
    attacker: {
      imei: '354358097364185',
      device: 'Redmi Note 12 (unknown)',
      upiId: 'fraudster@ybl',
      amount: '₹45,000',
      amountBand: 'HIGH',
    },
    expectedDecision: 'BLOCK',
    expectedLatency: '71ms',
    highlight: 'ML queue never consulted · OTP never issued · Funds never moved',
    inputs: {
      scenario: 'simswap' as const,
      victimImei: '490154203237518',
      attackerImei: '354358097364185',
      customerId: 'CUST_884712',
      bank: 'SBI',
      amountBand: 'HIGH',
    },
  },
  {
    id: 'social',
    icon: '🎭',
    title: 'Social Engineering',
    badge: 'TELECOM FAST PATH · <120ms',
    badgeColor: '#D97706',
    badgeBg: '#FFFBEB',
    description: 'Victim is on a live call with "bank executive". Screen share is active. Attacker injected payee VPA via clipboard. Telecom risk score hits 260 — fast path triggers.',
    victim: {
      name: 'Priya Sharma',
      customerId: 'CUST_551209',
      bank: 'HDFC Bank',
      bankShort: 'HDFC',
      imei: '356789012345678',
      device: 'iPhone 15 Pro',
      upiId: 'priya.sharma@hdfc',
    },
    attacker: {
      imei: '—',
      device: '(same device — social exploit)',
      upiId: 'support.refund8821@axl',
      amount: '₹1,20,000',
      amountBand: 'VERY_HIGH',
    },
    expectedDecision: 'BLOCK',
    expectedLatency: '108ms',
    highlight: 'Screen share + clipboard + 7 calls = TELECOM_RISK_SCORE 260/200 (capped)',
    inputs: {
      scenario: 'social' as const,
      victimImei: '356789012345678',
      customerId: 'CUST_551209',
      bank: 'HDFC',
      amountBand: 'VERY_HIGH',
      telecomCalls: 7,
      telecomScreenShare: true,
      telecomClipboard: true,
      telecomIccid: false,
      telecomPorted: false,
      telecomScore: 180,
    },
  },
  {
    id: 'mule',
    icon: '🕸️',
    title: 'Cross-Bank Mule Ring',
    badge: 'ML FULL PATH · CONSORTIUM BLOCK',
    badgeColor: '#7C3AED',
    badgeBg: '#F5F3FF',
    description: 'Same device fingerprint registered at SBI, HDFC, ICICI, and Kotak within 24 hours. GNN cross-bank graph reveals a money-mule network. Blocked consortium-wide.',
    victim: {
      name: 'Vikram Patel',
      customerId: 'CUST_227841',
      bank: 'ICICI Bank',
      bankShort: 'ICICI',
      imei: '867539021436785',
      device: 'OnePlus Nord CE 3',
      upiId: 'vikram.patel@icici',
    },
    attacker: {
      imei: '—',
      device: '(same device, 4 bank accounts)',
      upiId: 'vpatel.funds@upi',
      amount: '₹8,500',
      amountBand: 'MEDIUM',
    },
    expectedDecision: 'BLOCK',
    expectedLatency: '243ms',
    highlight: 'CROSS_BANK_SEEN=true · MuleDetector.sol triggered · All 4 banks notified',
    inputs: {
      scenario: 'mule' as const,
      victimImei: '867539021436785',
      customerId: 'CUST_227841',
      bank: 'ICICI',
      amountBand: 'MEDIUM',
    },
  },
] as const;

type ScenarioId = (typeof SCENARIOS)[number]['id'];

/* ─────────────────────────────────────────────
   Live Transaction Card — appears on RUN click
───────────────────────────────────────────── */
function TransactionCard({ s, ts }: { s: typeof SCENARIOS[number]; ts: string }) {
  return (
    <div style={{
      background: '#FFFFFF',
      border: '2px solid #DBEAFE',
      borderRadius: 12,
      padding: '20px 24px',
      marginBottom: 24,
      boxShadow: '0 4px 24px rgba(37,99,235,.10)',
      animation: 'fade-up .35s ease-out',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 10, height: 10, borderRadius: '50%',
            background: '#EF4444',
            boxShadow: '0 0 0 3px rgba(239,68,68,.2)',
            animation: 'badge-pulse 1s ease-in-out infinite',
          }} />
          <span style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', letterSpacing: '.05em' }}>
            LIVE TRANSACTION — PROCESSING
          </span>
        </div>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 12, color: '#94A3B8',
        }}>
          {ts}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* Sender */}
        <div style={{ padding: '12px 14px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
          <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, marginBottom: 8, letterSpacing: '.06em' }}>SENDER</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: '#0F172A', marginBottom: 4 }}>{s.victim.name}</div>
          <div style={{ fontSize: 11, color: '#2563EB', fontFamily: "'JetBrains Mono', monospace", marginBottom: 3 }}>{s.victim.upiId}</div>
          <div style={{ fontSize: 11, color: '#64748B' }}>{s.victim.bank}</div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 4 }}>{s.victim.device}</div>
          <div style={{ fontSize: 9, color: '#94A3B8', fontFamily: "'JetBrains Mono', monospace", marginTop: 2 }}>
            IMEI: {s.victim.imei.substring(0,8)}...
          </div>
        </div>

        {/* Transaction */}
        <div style={{ padding: '12px 14px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FCA5A5', textAlign: 'center' }}>
          <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, marginBottom: 8, letterSpacing: '.06em' }}>TRANSACTION</div>
          <div style={{ fontSize: 28, fontWeight: 900, color: '#DC2626', fontFamily: "'JetBrains Mono', monospace", lineHeight: 1, marginBottom: 6 }}>
            {s.attacker.amount}
          </div>
          <div style={{ fontSize: 10, color: '#94A3B8', marginBottom: 8 }}>UPI · IMPS</div>
          <div style={{
            display: 'inline-block',
            padding: '3px 10px',
            borderRadius: 20,
            background: s.badgeBg,
            color: s.badgeColor,
            fontSize: 10,
            fontWeight: 700,
            border: `1px solid ${s.badgeColor}33`,
          }}>
            {s.badge}
          </div>
        </div>

        {/* Receiver */}
        <div style={{ padding: '12px 14px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FCA5A5' }}>
          <div style={{ fontSize: 10, color: '#64748B', fontWeight: 700, marginBottom: 8, letterSpacing: '.06em' }}>PAYEE (SUSPICIOUS)</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#DC2626', marginBottom: 4, wordBreak: 'break-all' }}>{s.attacker.upiId}</div>
          <div style={{ fontSize: 11, color: '#DC2626', marginBottom: 3 }}>{s.attacker.device}</div>
          {s.attacker.imei !== '—' && (
            <div style={{ fontSize: 9, color: '#EF4444', fontFamily: "'JetBrains Mono', monospace", marginTop: 4 }}>
              IMEI: {s.attacker.imei.substring(0,8)}... (MISMATCH)
            </div>
          )}
          <div style={{
            marginTop: 8, fontSize: 10, fontWeight: 700, color: '#DC2626',
            padding: '4px 8px', borderRadius: 6,
            background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)',
          }}>
            ⚠ FRAUD INDICATORS DETECTED
          </div>
        </div>
      </div>

      <div style={{
        marginTop: 14, padding: '8px 14px',
        background: '#FFFBEB', border: '1px solid #FDE68A',
        borderRadius: 8, fontSize: 12, color: '#92400E',
      }}>
        <strong>Key signal:</strong> {s.highlight}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Main export
───────────────────────────────────────────── */
export default function OneClickDemo() {
  const [selectedId, setSelectedId] = useState<ScenarioId>('simswap');
  const [trigger, setTrigger]       = useState(0);
  const [running, setRunning]       = useState(false);
  const [timestamp, setTimestamp]   = useState('');

  const selected = SCENARIOS.find(s => s.id === selectedId)!;

  const handleRun = () => {
    if (running) return;
    setRunning(true);
    setTimestamp(new Date().toLocaleTimeString('en-IN', { hour12: false }) + ' IST');
    setTrigger(t => t + 1);
    // Re-enable button after animation (~6s)
    setTimeout(() => setRunning(false), 7000);
  };

  return (
    <div>
      {/* Page header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
          <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', margin: 0 }}>
            🎬 One-Click Full Demo
          </h2>
          <div style={{
            padding: '4px 12px', borderRadius: 20,
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            color: '#fff', fontSize: 11, fontWeight: 700,
          }}>
            JUDGE MODE
          </div>
        </div>
        <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>
          Select a scenario, press <strong>RUN FULL DEMO</strong> — watch the complete 6-layer fraud
          detection pipeline execute live, ending with the GNN graph and final verdict.
        </p>
      </div>

      {/* ── Scenario selector ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
        {SCENARIOS.map(s => {
          const active = s.id === selectedId;
          return (
            <button
              key={s.id}
              onClick={() => { setSelectedId(s.id as ScenarioId); setTrigger(0); setRunning(false); }}
              style={{
                textAlign: 'left',
                padding: '16px 18px',
                borderRadius: 12,
                border: `2px solid ${active ? s.badgeColor : '#E2E8F0'}`,
                background: active ? s.badgeBg : '#FFFFFF',
                cursor: 'pointer',
                transition: 'all .2s',
                boxShadow: active ? `0 4px 16px ${s.badgeColor}22` : '0 1px 3px rgba(0,0,0,.04)',
                fontFamily: 'inherit',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <span style={{ fontSize: 20 }}>{s.icon}</span>
                <span style={{ fontWeight: 800, fontSize: 14, color: active ? s.badgeColor : '#0F172A' }}>
                  {s.title}
                </span>
                {active && (
                  <span style={{
                    marginLeft: 'auto', fontSize: 10, fontWeight: 700,
                    color: s.badgeColor, padding: '2px 8px', borderRadius: 10,
                    border: `1px solid ${s.badgeColor}44`,
                    background: '#FFFFFF',
                  }}>SELECTED</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5, marginBottom: 10 }}>
                {s.description}
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
                <span style={{ color: '#94A3B8' }}>
                  {s.victim.name} · {s.victim.bankShort}
                </span>
                <span style={{ fontWeight: 700, color: s.badgeColor }}>
                  {s.attacker.amount}
                </span>
              </div>
              <div style={{
                marginTop: 8, padding: '4px 8px', borderRadius: 6,
                background: active ? `${s.badgeColor}15` : '#F8FAFF',
                fontSize: 10, fontWeight: 700, color: s.badgeColor,
                border: `1px solid ${s.badgeColor}30`,
              }}>
                Expected: {s.expectedDecision} in {s.expectedLatency}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── RUN button ── */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <button
          onClick={handleRun}
          disabled={running}
          style={{
            padding: '18px 64px',
            borderRadius: 12,
            border: 'none',
            background: running
              ? '#E2E8F0'
              : 'linear-gradient(135deg, #1D4ED8, #2563EB, #3B82F6)',
            color: running ? '#94A3B8' : '#FFFFFF',
            fontSize: 17,
            fontWeight: 800,
            cursor: running ? 'not-allowed' : 'pointer',
            letterSpacing: '.04em',
            boxShadow: running ? 'none' : '0 6px 28px rgba(37,99,235,.40)',
            transition: 'all .25s',
            fontFamily: 'inherit',
            transform: running ? 'none' : undefined,
          }}
          onMouseEnter={e => { if (!running) e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          {running ? '⏳ Pipeline Running...' : `▶  RUN FULL DEMO — ${selected.title}`}
        </button>
        {!running && trigger === 0 && (
          <div style={{ marginTop: 10, fontSize: 12, color: '#94A3B8' }}>
            Scenario: <strong style={{ color: '#2563EB' }}>{selected.title}</strong>
            {' · '}Victim: <strong style={{ color: '#334155' }}>{selected.victim.name}</strong>
            {' · '}{selected.attacker.amount}
          </div>
        )}
      </div>

      {/* ── Live transaction card (appears when running) ── */}
      {trigger > 0 && <TransactionCard s={selected} ts={timestamp} />}

      {/* ── Full pipeline visualization ── */}
      <PipelineVisualization
        trigger={trigger}
        inputs={selected.inputs as PipelineInputs}
      />
    </div>
  );
}
