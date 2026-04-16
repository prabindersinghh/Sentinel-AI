'use client';
import { useState } from 'react';
import { useAppState } from '../../lib/state';
import { randomHex, randInt, caseId } from '../../lib/utils';

const BANKS = [
  { name: 'SBI',    color: '#00D4AA', cx: 280, cy: 80  },
  { name: 'HDFC',   color: '#4A9EFF', cx: 480, cy: 160 },
  { name: 'ICICI',  color: '#9B6DFF', cx: 440, cy: 360 },
  { name: 'Kotak',  color: '#FF9F1C', cx: 120, cy: 360 },
  { name: 'PNB',    color: '#FF3B5C', cx: 80,  cy: 160 },
];
const CENTER = { cx: 280, cy: 228 };
const DEVICE_HASH = `a3f7c91b${randomHex(8)}`;

function NetworkSVG({
  activeBanks,
  muleTriggered,
}: {
  activeBanks: number;
  muleTriggered: boolean;
}) {
  return (
    <svg
      viewBox="0 0 560 456"
      style={{ width: '100%', height: 300, overflow: 'visible' }}
    >
      {/* Center lines */}
      {BANKS.map((b, i) => {
        const active = i < activeBanks;
        const blocked = muleTriggered && active;
        return (
          <line
            key={i}
            x1={CENTER.cx} y1={CENTER.cy}
            x2={b.cx} y2={b.cy}
            stroke={blocked ? '#FF3B5C' : active ? b.color : 'rgba(255,255,255,0.08)'}
            strokeWidth={blocked ? 2.5 : active ? 2 : 1}
            strokeDasharray={active ? undefined : '6 4'}
            opacity={active ? 1 : 0.4}
            style={active ? {
              strokeDasharray: '200',
              strokeDashoffset: '200',
              animation: `line-draw .6s ease forwards ${i * 0.12}s`,
            } : undefined}
          />
        );
      })}

      {/* Center node */}
      <rect
        x={CENTER.cx - 52} y={CENTER.cy - 22}
        width={104} height={44}
        rx={8}
        fill={muleTriggered ? 'rgba(255,59,92,0.15)' : 'rgba(0,212,170,0.12)'}
        stroke={muleTriggered ? '#FF3B5C' : '#00D4AA'}
        strokeWidth={1.5}
      />
      <text
        x={CENTER.cx} y={CENTER.cy - 5}
        textAnchor="middle"
        fill={muleTriggered ? '#FF3B5C' : '#00D4AA'}
        fontSize={9.5}
        fontWeight="700"
        fontFamily="DM Sans, system-ui"
      >
        CipherGuard
      </text>
      <text
        x={CENTER.cx} y={CENTER.cy + 9}
        textAnchor="middle"
        fill={muleTriggered ? '#FF3B5C' : '#8A95A8'}
        fontSize={8.5}
        fontFamily="DM Sans, system-ui"
      >
        {muleTriggered ? 'MULE BLOCKLIST UPDATED' : 'Consortium Ledger'}
      </text>

      {/* Bank nodes */}
      {BANKS.map((b, i) => {
        const active  = i < activeBanks;
        const blocked = muleTriggered && active;
        return (
          <g key={i} className={active ? 'node-pop' : undefined}>
            <circle
              cx={b.cx} cy={b.cy} r={22}
              fill={active ? (blocked ? 'rgba(255,59,92,0.15)' : `${b.color}18`) : 'rgba(255,255,255,0.04)'}
              stroke={active ? (blocked ? '#FF3B5C' : b.color) : 'rgba(255,255,255,0.1)'}
              strokeWidth={active ? 2 : 1}
              opacity={active ? 1 : 0.5}
            />
            <text
              x={b.cx} y={b.cy + 4}
              textAnchor="middle"
              fill={active ? (blocked ? '#FF3B5C' : b.color) : '#4A5568'}
              fontSize={10}
              fontWeight="700"
              fontFamily="DM Sans, system-ui"
            >
              {b.name}
            </text>
            {active && !blocked && (
              <circle cx={b.cx + 14} cy={b.cy - 14} r={5}
                fill="#00D4AA" opacity={0.9} />
            )}
            {blocked && (
              <>
                <line x1={b.cx - 8} y1={b.cy - 8} x2={b.cx + 8} y2={b.cy + 8}
                  stroke="#FF3B5C" strokeWidth={2.5} />
                <line x1={b.cx + 8} y1={b.cy - 8} x2={b.cx - 8} y2={b.cy + 8}
                  stroke="#FF3B5C" strokeWidth={2.5} />
              </>
            )}
            {/* Label below */}
            {active && (
              <text
                x={b.cx} y={b.cy + 36}
                textAnchor="middle"
                fill={blocked ? '#FF3B5C' : '#8A95A8'}
                fontSize={9}
                fontFamily="DM Sans, system-ui"
              >
                {blocked ? 'BLOCKED' : 'Registered'}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export default function MuleDetection() {
  const { recordDecision, pushLog, setSLA } = useAppState();

  const [activeBanks,    setActiveBanks]    = useState(1);
  const [scanning,       setScanning]       = useState(false);
  const [muleTriggered,  setMuleTriggered]  = useState(false);
  const [logLines,       setLogLines]       = useState<Array<{ text: string; color: string }>>([
    { text: 'MuleDetector.sol listening on consortium event bus...', color: '#8A95A8' },
    { text: `REGISTRATION: device_hash ${DEVICE_HASH.substring(0, 12)}... @ SBI (node 1)`, color: '#00D4AA' },
  ]);

  const handleAddBank = () => {
    if (activeBanks >= BANKS.length || scanning || muleTriggered) return;
    const next = activeBanks;
    const bank = BANKS[next];
    setActiveBanks(prev => prev + 1);
    setLogLines(prev => [...prev,
      {
        text: `[${new Date().toLocaleTimeString()}] REGISTRATION: device_hash ${DEVICE_HASH.substring(0, 12)}... @ ${bank.name} (node ${next + 1})`,
        color: bank.color,
      },
    ]);

    if (next + 1 >= 3) {
      setLogLines(prev => [...prev,
        {
          text: `⚠️ MuleDetector threshold reached (≥3 banks in 48h window) — SCAN AVAILABLE`,
          color: '#FF9F1C',
        },
      ]);
    }
  };

  const handleScan = async () => {
    if (scanning || activeBanks < 3 || muleTriggered) return;
    setScanning(true);

    const scanLines: Array<{ ms: number; text: string; color: string }> = [
      { ms: 0,   text: 'MuleDetector.sol: initiating 48-hour sliding window scan...', color: '#4A9EFF' },
      { ms: 180, text: 'Scanning consortium ledger for duplicate device_hash entries...', color: '#8A95A8' },
      { ms: 420, text: `⚡ ALERT: device_hash ${DEVICE_HASH.substring(0, 12)}... found at ${activeBanks} distinct bank nodes`, color: '#FF3B5C' },
      { ms: 450, text: 'Timestamp analysis: all registrations within 48-hour window: CONFIRMED', color: '#FF9F1C' },
      { ms: 470, text: `Threshold exceeded (≥3 banks) — MULE_DEVICE_ALERT emitting...`, color: '#FF3B5C' },
      { ms: 490, text: `Broadcasting to all ${activeBanks} consortium members via event bus...`, color: '#8A95A8' },
      ...BANKS.slice(0, activeBanks).map((b, i) => ({
        ms: 510 + i * 10,
        text: `Webhook → ${b.name} fraud team: DELIVERED ✓`,
        color: '#4A9EFF',
      })),
      { ms: 560, text: `Hash ${DEVICE_HASH.substring(0, 12)}... added to consortium shared blocklist`, color: '#FF3B5C' },
      { ms: 580, text: 'All future TRANSACTION_INIT for this device_hash: AUTO-BLOCK', color: '#FF3B5C' },
      { ms: 600, text: 'Existing accounts linked to this hash: FLAGGED for review', color: '#FF9F1C' },
      { ms: 620, text: `✓ MULE DEVICE NETWORK NEUTRALIZED — ${activeBanks} banks protected`, color: '#00D4AA' },
    ];

    for (const line of scanLines) {
      await delay(randInt(100, 260));
      setLogLines(prev => [...prev, { text: line.text, color: line.color }]);
    }

    setMuleTriggered(true);
    setScanning(false);
    recordDecision('BLOCK', 620);
    setSLA({ fastPathBlock: 80 });
    pushLog(
      `[MULE DETECTED] device_hash ${DEVICE_HASH.substring(0, 12)}... @ ${activeBanks} banks — BLOCKLISTED`,
      'mule'
    );
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#E8EDF5', marginBottom: 6 }}>
          🕸️ Cross-Bank Mule Detection
        </h2>
        <p style={{ color: '#8A95A8', fontSize: 14 }}>
          Consortium-wide pseudonymous device registry. Closes G5 — cross-bank visibility gap.
          A fraud ring invisible to any single institution becomes visible across all.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* ── LEFT: Network diagram ── */}
        <div>
          <div className="cg-card" style={{ marginBottom: 16 }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <div style={{ fontWeight: 700, color: '#E8EDF5', fontSize: 15 }}>
                Consortium Network
              </div>
              <div style={{
                padding: '4px 10px',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                background: activeBanks >= 3
                  ? 'rgba(255,59,92,.15)'
                  : 'rgba(0,212,170,.1)',
                color: activeBanks >= 3 ? '#FF3B5C' : '#00D4AA',
                border: `1px solid ${activeBanks >= 3 ? 'rgba(255,59,92,.3)' : 'rgba(0,212,170,.3)'}`,
              }}>
                Same device @ {activeBanks} bank{activeBanks !== 1 ? 's' : ''}
              </div>
            </div>

            <NetworkSVG activeBanks={activeBanks} muleTriggered={muleTriggered} />

            {activeBanks >= 3 && !muleTriggered && (
              <div style={{
                marginTop: 8,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(255,159,28,.1)',
                border: '1px solid rgba(255,159,28,.3)',
                color: '#FF9F1C',
                fontSize: 12,
                fontWeight: 700,
                textAlign: 'center',
                animation: 'badge-pulse 1.5s ease-in-out infinite',
              }}>
                ⚠️ MuleDetector threshold reached (≥3 banks in 48h)
              </div>
            )}
            {muleTriggered && (
              <div style={{
                marginTop: 8,
                padding: '8px 12px',
                borderRadius: 8,
                background: 'rgba(255,59,92,.1)',
                border: '1px solid rgba(255,59,92,.3)',
                color: '#FF3B5C',
                fontSize: 12,
                fontWeight: 700,
                textAlign: 'center',
              }}>
                🔴 MULE DEVICE BLOCKED CONSORTIUM-WIDE
              </div>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button
              className="btn-outline"
              onClick={handleAddBank}
              disabled={activeBanks >= BANKS.length || scanning || muleTriggered}
              style={{ width: '100%' }}
            >
              {activeBanks >= BANKS.length
                ? '✓ All 5 banks registered'
                : `Register at another bank (+1) — Currently at ${activeBanks}`}
            </button>

            {activeBanks >= 3 && (
              <button
                className="btn-danger"
                onClick={handleScan}
                disabled={scanning || muleTriggered}
              >
                {scanning
                  ? '⏳ Scanning consortium ledger...'
                  : muleTriggered
                  ? '✓ MULE NEUTRALIZED'
                  : '🔍 TRIGGER MULE DETECTOR SCAN'}
              </button>
            )}
          </div>

          {/* Result card */}
          {muleTriggered && (
            <div className="cg-card-danger fade-up" style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 800, color: '#FF3B5C', fontSize: 15, marginBottom: 14 }}>
                Mule Detection Result
              </div>
              {[
                ['Hash seen at',       `${activeBanks} bank nodes`],
                ['Alert sent to',      BANKS.slice(0, activeBanks).map(b => b.name).join(', ')],
                ['Action',             'Added to consortium shared blocklist'],
                ['Future transactions','AUTO-BLOCKED at hash check'],
                ['PII shared',         'NONE — coordination via pseudonymous hashes only'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 12, gap: 8 }}>
                  <span style={{ color: '#8A95A8', flexShrink: 0 }}>{k}:</span>
                  <span style={{ color: '#E8EDF5', textAlign: 'right' }}>{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── RIGHT: Event log ── */}
        <div>
          <div className="cg-card" style={{ height: '100%' }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 12,
            }}>
              <div style={{ fontWeight: 700, color: '#E8EDF5', fontSize: 15 }}>
                Consortium Event Bus
              </div>
              {scanning && (
                <span style={{
                  fontSize: 11,
                  color: '#FF9F1C',
                  fontFamily: "'JetBrains Mono', monospace",
                  animation: 'badge-pulse 1s ease-in-out infinite',
                }}>
                  ● SCANNING
                </span>
              )}
            </div>

            <div className="log-terminal" style={{ height: 480 }}>
              {logLines.map((l, i) => (
                <div
                  key={i}
                  className={i === logLines.length - 1 ? 'stream-in' : undefined}
                  style={{ color: l.color, marginBottom: 2 }}
                >
                  {l.text}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gap callout */}
      <div style={{
        marginTop: 24,
        padding: '14px 18px',
        background: 'rgba(0,212,170,.05)',
        border: '1px solid rgba(0,212,170,.15)',
        borderRadius: 10,
        fontSize: 13,
        color: '#8A95A8',
      }}>
        <span style={{ color: '#00D4AA', fontWeight: 700 }}>This closes G5 — Cross-Bank Visibility Gap.</span>{' '}
        Before CipherGuard: a fraud ring using 5 different UPI apps across 5 banks was completely
        invisible to any single institution's model. Now: one hash mismatch anywhere → all banks
        notified within 5 minutes.
      </div>
    </div>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
