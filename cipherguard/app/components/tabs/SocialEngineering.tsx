'use client';
import { useState, useEffect } from 'react';
import { useAppState } from '../../lib/state';
import { computeTelecomScore, computeComposite, scoreToDecision, randInt, caseId } from '../../lib/utils';

const AMOUNT_BANDS = ['LOW (<₹1k)', 'MEDIUM (₹1k–10k)', 'HIGH (₹10k–100k)', 'VERY HIGH (>₹1L)'];

function ScoreBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 80 ? '#FF3B5C' : pct >= 40 ? '#FF9F1C' : '#00D4AA';
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: '#8A95A8' }}>{label}</span>
        <span style={{ color, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
          {value} / {max}
        </span>
      </div>
      <div className="score-bar-track">
        <div
          className="score-bar-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
          }}
        />
      </div>
    </div>
  );
}

function Toggle({
  checked, onChange, label, subLabel, critColor
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  subLabel?: string;
  critColor?: string;
}) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 14px',
      borderRadius: 8,
      background: checked
        ? `rgba(${critColor === '#FF3B5C' ? '255,59,92' : '255,159,28'},.08)`
        : 'rgba(255,255,255,.03)',
      border: `1px solid ${checked
        ? (critColor === '#FF3B5C' ? 'rgba(255,59,92,.3)' : 'rgba(255,159,28,.3)')
        : 'rgba(255,255,255,.07)'}`,
      marginBottom: 8,
      gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: '#E8EDF5', fontWeight: 600 }}>{label}</div>
        {subLabel && (
          <div style={{
            fontSize: 11,
            color: checked ? (critColor || '#FF9F1C') : '#8A95A8',
            marginTop: 2,
          }}>
            {subLabel}
          </div>
        )}
      </div>
      <label className="cg-toggle">
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} />
        <span className="cg-toggle-track" />
      </label>
    </div>
  );
}

export default function SocialEngineering() {
  const { recordDecision, pushLog, setSLA } = useAppState();

  // Default: calls=5, screen=ON, clipboard=ON → score ≥160 pre-triggered
  const [calls,         setCalls]         = useState(5);
  const [screenShare,   setScreenShare]   = useState(true);
  const [clipboard,     setClipboard]     = useState(true);
  const [iccidChanged,  setIccidChanged]  = useState(false);
  const [ported,        setPorted]        = useState(false);
  const [amountIdx,     setAmountIdx]     = useState(1);

  const [running,    setRunning]    = useState(false);
  const [logLines,   setLogLines]   = useState<Array<{ text: string; color: string }>>([]);
  const [decision,   setDecision]   = useState<'APPROVE' | 'STEP-UP' | 'BLOCK' | null>(null);
  const [latencyMs,  setLatencyMs]  = useState(0);
  const [shownCase,  setShownCase]  = useState('');

  // Derived scores (live)
  const callScore     = calls >= 6 ? 80 : calls >= 3 ? 40 : Math.round(calls * 6.67);
  const screenScore   = screenShare ? 100 : 0;
  const clipScore     = clipboard   ? 60  : 0;
  const iccidScore    = iccidChanged ? 80 : 0;
  const portScore     = ported       ? 70 : 0;
  const telecomScore  = Math.min(200, callScore + screenScore + clipScore + iccidScore + portScore);
  const mlBase        = 85; // fixed for demo
  const composite     = computeComposite({
    hashMismatch: false,
    telecomScore,
    mlBaseScore: mlBase,
    iccidChanged,
    crossBankSeen: false,
  });
  const fastPath      = telecomScore >= 160;
  const liveDecision  = scoreToDecision(composite);

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setLogLines([]);
    setDecision(null);

    const lat = randInt(140, 290);
    const isFastPath = fastPath;
    const dec = isFastPath ? 'BLOCK' : liveDecision;
    const cId = caseId();

    const commonLines: Array<{ text: string; color: string }> = [
      { text: 'TRANSACTION_INIT received...', color: '#8A95A8' },
      { text: 'L3: Fetching telecom context from MNO CAMARA API...', color: '#4A9EFF' },
      { text: `L3 signals: calls=${calls}, screen=${screenShare}, clipboard=${clipboard}, iccid=${iccidChanged}, ported=${ported}`, color: '#4A9EFF' },
      { text: `TELECOM_RISK_SCORE = ${telecomScore} / 200`, color: telecomScore >= 160 ? '#FF3B5C' : telecomScore >= 80 ? '#FF9F1C' : '#00D4AA' },
    ];

    const fastPathLines: Array<{ text: string; color: string }> = [
      { text: '⚡ TELECOM_RISK_SCORE ≥ 160 — FAST PATH TRIGGERED', color: '#FF3B5C' },
      { text: 'ML scoring queue: *** BYPASSED — NOT CONSULTED ***', color: '#FF9F1C' },
      { text: 'OTP: CANCELLED — NOT ISSUED', color: '#FF9F1C' },
      { text: `Decision: BLOCK (composite=${composite}) — telecom fast path`, color: '#FF3B5C' },
      { text: `Push notification → registered device`, color: '#4A9EFF' },
      { text: `Fraud case ${cId} opened — social engineering indicators logged`, color: '#4A9EFF' },
    ];

    const mlLines: Array<{ text: string; color: string }> = [
      { text: 'L2: device_hash verified — MATCH (not a SIM swap)', color: '#00D4AA' },
      { text: 'L5: ML ensemble scoring...', color: '#4A9EFF' },
      { text: `LightGBM: ${randInt(40, 180)}  LSTM: ${randInt(40, 160)}  GNN: ${randInt(30, 150)}  IsoForest: ${randInt(20, 140)}`, color: '#4A9EFF' },
      { text: `Composite score: ${composite} / 1000`, color: composite >= 600 ? '#FF3B5C' : composite >= 300 ? '#FF9F1C' : '#00D4AA' },
      { text: `Decision: ${dec}`, color: dec === 'BLOCK' ? '#FF3B5C' : dec === 'STEP-UP' ? '#FF9F1C' : '#00D4AA' },
      ...(dec === 'BLOCK' ? [
        { text: `Fraud case ${cId} opened`, color: '#FF3B5C' },
      ] : dec === 'STEP-UP' ? [
        { text: 'Requesting biometric re-auth (60s timeout)...', color: '#FF9F1C' },
      ] : [
        { text: 'Transaction approved — TrustConfirm written to blockchain', color: '#00D4AA' },
      ]),
    ];

    const allLines = [...commonLines, ...(isFastPath ? fastPathLines : mlLines)];

    for (const line of allLines) {
      await delay(randInt(100, 280));
      setLogLines(prev => [...prev, line]);
    }

    setDecision(dec);
    setLatencyMs(lat);
    setShownCase(cId);
    recordDecision(dec, lat);
    setSLA({
      telecomContext: randInt(28, 58),
      mlEnsemble: isFastPath ? undefined : randInt(80, 180),
      fullPath: lat,
    });
    pushLog(
      `[SOCIAL ENG] telecom=${telecomScore} composite=${composite} → ${dec} (${lat}ms)`,
      dec === 'BLOCK' ? 'block' : dec === 'STEP-UP' ? 'stepup' : 'approve'
    );
    setRunning(false);
  };

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#E8EDF5', marginBottom: 6 }}>
          🎭 Social Engineering Detector
        </h2>
        <p style={{ color: '#8A95A8', fontSize: 14 }}>
          Pre-transaction telecom context detection. Closes G3 — the social engineering blind spot
          that defeats every existing fraud platform.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* ── LEFT: Controls ── */}
        <div>
          <div className="cg-card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: '#E8EDF5', fontSize: 15, marginBottom: 16 }}>
              Live Signal Configuration
            </div>

            {/* Call slider */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: 'rgba(255,255,255,.03)',
              border: '1px solid rgba(255,255,255,.07)',
              marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#E8EDF5', fontWeight: 600 }}>
                  Unknown inbound calls (15-min window)
                </span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: calls >= 6 ? '#FF3B5C' : calls >= 3 ? '#FF9F1C' : '#00D4AA',
                  fontWeight: 700,
                }}>
                  {calls} calls
                </span>
              </div>
              <input
                type="range"
                min={0} max={10}
                value={calls}
                onChange={e => setCalls(Number(e.target.value))}
              />
              <div style={{ fontSize: 11, color: '#8A95A8', marginTop: 6 }}>
                Score: +{callScore}{' '}
                {calls >= 6
                  ? '(≥6 calls: max score)'
                  : calls >= 3
                  ? '(≥3 calls: elevated)'
                  : '(normal)'}
              </div>
            </div>

            <Toggle
              checked={screenShare}
              onChange={setScreenShare}
              label="Screen share active during transaction"
              subLabel={screenShare ? 'CRITICAL — attacker watching screen (+100)' : '+0 — safe'}
              critColor="#FF3B5C"
            />
            <Toggle
              checked={clipboard}
              onChange={setClipboard}
              label="Clipboard VPA injected from external source"
              subLabel={clipboard ? 'Attacker injected destination account (+60)' : '+0 — safe'}
              critColor="#FF9F1C"
            />
            <Toggle
              checked={iccidChanged}
              onChange={setIccidChanged}
              label="SIM ICCID changed since last session"
              subLabel={iccidChanged ? 'SIM swap may have occurred (+80)' : '+0 — safe'}
              critColor="#FF9F1C"
            />
            <Toggle
              checked={ported}
              onChange={setPorted}
              label="Phone number ported in last 72 hours"
              subLabel={ported ? 'Porting = SIM swap mechanism (+70)' : '+0 — safe'}
              critColor="#FF9F1C"
            />

            {/* Amount band */}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, color: '#8A95A8', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Transaction Amount Band:
              </label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {AMOUNT_BANDS.map((b, i) => (
                  <button
                    key={i}
                    onClick={() => setAmountIdx(i)}
                    style={{
                      padding: '5px 10px',
                      borderRadius: 6,
                      border: `1px solid ${i === amountIdx ? 'rgba(0,212,170,.4)' : 'rgba(255,255,255,.1)'}`,
                      background: i === amountIdx ? 'rgba(0,212,170,.1)' : 'transparent',
                      color: i === amountIdx ? '#00D4AA' : '#8A95A8',
                      fontSize: 11,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontWeight: 600,
                    }}
                  >
                    {b}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Moat callout */}
          <div style={{
            padding: '14px 16px',
            background: 'rgba(74,158,255,.06)',
            border: '1px solid rgba(74,158,255,.2)',
            borderRadius: 10,
            fontSize: 12,
            color: '#8A95A8',
          }}>
            <div style={{ color: '#4A9EFF', fontWeight: 700, marginBottom: 6 }}>
              ⚔️ Competitive Moat — Bilateral MNO Agreements
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: '#FF3B5C' }}>Bureau:</span> ❌ No telecom signals
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: '#FF9F1C' }}>Protectt.ai:</span> ⚠️ SNA binary only (SIM present? yes/no)
            </div>
            <div>
              <span style={{ color: '#00D4AA' }}>CipherGuard:</span> ✅ Full pre-transaction behavioral context from voice network (Jio + Airtel bilateral CDR)
            </div>
          </div>
        </div>

        {/* ── RIGHT: Live Score ── */}
        <div>
          <div className="cg-card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: '#E8EDF5', fontSize: 15, marginBottom: 16 }}>
              Live Score (updates instantly)
            </div>

            {/* Telecom gauge */}
            <div style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: telecomScore >= 160
                ? 'rgba(255,59,92,.08)'
                : telecomScore >= 80
                ? 'rgba(255,159,28,.08)'
                : 'rgba(0,212,170,.08)',
              border: `1px solid ${telecomScore >= 160 ? 'rgba(255,59,92,.3)' : telecomScore >= 80 ? 'rgba(255,159,28,.3)' : 'rgba(0,212,170,.2)'}`,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#8A95A8', fontWeight: 600 }}>TELECOM_RISK_SCORE</span>
                <span style={{
                  fontSize: 36,
                  fontWeight: 900,
                  color: telecomScore >= 160 ? '#FF3B5C' : telecomScore >= 80 ? '#FF9F1C' : '#00D4AA',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {telecomScore}
                </span>
              </div>
              <ScoreBar value={telecomScore} max={200} label="Telecom Risk (0–200)" />

              {/* Score breakdown */}
              <div style={{
                marginTop: 12,
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 12,
                color: '#8A95A8',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span>Call volume score:</span>
                  <span style={{ color: callScore > 0 ? '#FF9F1C' : '#4A5568' }}>+{callScore}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span>Screen share:</span>
                  <span style={{ color: screenScore > 0 ? '#FF3B5C' : '#4A5568' }}>+{screenScore}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span>Clipboard injection:</span>
                  <span style={{ color: clipScore > 0 ? '#FF9F1C' : '#4A5568' }}>+{clipScore}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span>ICCID change:</span>
                  <span style={{ color: iccidScore > 0 ? '#FF9F1C' : '#4A5568' }}>+{iccidScore}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Porting:</span>
                  <span style={{ color: portScore > 0 ? '#FF9F1C' : '#4A5568' }}>+{portScore}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid rgba(255,255,255,.08)',
                  paddingTop: 6,
                  fontWeight: 700,
                }}>
                  <span style={{ color: '#E8EDF5' }}>TOTAL:</span>
                  <span style={{ color: telecomScore >= 160 ? '#FF3B5C' : telecomScore >= 80 ? '#FF9F1C' : '#00D4AA' }}>
                    {telecomScore} / 200
                  </span>
                </div>
              </div>

              {telecomScore >= 160 && (
                <div style={{
                  marginTop: 10,
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: 'rgba(255,59,92,.15)',
                  border: '1px solid rgba(255,59,92,.4)',
                  color: '#FF3B5C',
                  fontSize: 12,
                  fontWeight: 700,
                  textAlign: 'center',
                  animation: 'badge-pulse 1.2s ease-in-out infinite',
                }}>
                  ⚡ FAST PATH WILL TRIGGER
                </div>
              )}
            </div>

            {/* Composite gauge */}
            <div style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: 'rgba(255,255,255,.03)',
              border: '1px solid rgba(255,255,255,.08)',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#8A95A8', fontWeight: 600 }}>COMPOSITE SCORE</span>
                <span style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: composite >= 600 ? '#FF3B5C' : composite >= 300 ? '#FF9F1C' : '#00D4AA',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {composite}
                </span>
              </div>

              {/* Decision zone bar */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#8A95A8', marginBottom: 4 }}>Decision bands:</div>
                <div style={{ display: 'flex', height: 20, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ flex: 3, background: 'rgba(0,212,170,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#00D4AA', fontWeight: 700 }}>
                    APPROVE
                  </div>
                  <div style={{ flex: 3, background: 'rgba(255,159,28,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#FF9F1C', fontWeight: 700 }}>
                    STEP-UP
                  </div>
                  <div style={{ flex: 4, background: 'rgba(255,59,92,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#FF3B5C', fontWeight: 700 }}>
                    BLOCK
                  </div>
                </div>
                {/* Indicator */}
                <div style={{ position: 'relative', height: 8, marginTop: 4 }}>
                  <div style={{
                    position: 'absolute',
                    left: `${Math.min(98, composite / 10)}%`,
                    transform: 'translateX(-50%)',
                    width: 2,
                    height: 8,
                    background: composite >= 600 ? '#FF3B5C' : composite >= 300 ? '#FF9F1C' : '#00D4AA',
                    borderRadius: 2,
                    transition: 'left .3s',
                  }} />
                </div>
              </div>

              <div style={{
                fontSize: 14,
                fontWeight: 800,
                color: liveDecision === 'BLOCK' ? '#FF3B5C' : liveDecision === 'STEP-UP' ? '#FF9F1C' : '#00D4AA',
                textAlign: 'center',
              }}>
                Expected: {liveDecision}
                {fastPath && ' (FAST PATH)'}
              </div>
            </div>

            {/* SHAP preview */}
            <div style={{ fontSize: 12, color: '#8A95A8' }}>
              <div style={{ fontWeight: 600, color: '#E8EDF5', marginBottom: 8 }}>
                SHAP Feature Importance (top signals):
              </div>
              {[
                ['SCREEN_SHARE_ACTIVE', screenScore, '#FF3B5C'],
                ['CALL_VOLUME_PRE_TXN', callScore, '#FF9F1C'],
                ['CLIPBOARD_INJECTED', clipScore, '#FF9F1C'],
                ['ICCID_CHANGED', iccidScore, '#FF9F1C'],
                ['PORTED_RECENTLY', portScore, '#FF9F1C'],
                ['ML_ENSEMBLE_BASE', mlBase, '#4A9EFF'],
              ].map(([feat, val, col]) => (
                <div key={String(feat)} style={{ marginBottom: 6 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{feat}</span>
                    <span style={{ color: String(col), fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>
                      +{val}
                    </span>
                  </div>
                  <div className="score-bar-track" style={{ height: 4 }}>
                    <div
                      className="score-bar-fill"
                      style={{
                        width: `${Math.min(100, (Number(val) / 200) * 100)}%`,
                        background: String(col),
                        transition: 'width .3s',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            className={`btn-teal`}
            onClick={handleRun}
            disabled={running}
          >
            {running ? '⏳ Running transaction check...' : '▶ RUN TRANSACTION CHECK'}
          </button>
        </div>
      </div>

      {/* Result log + decision */}
      {logLines.length > 0 && (
        <div className="cg-card" style={{ marginTop: 24 }}>
          <div style={{ fontWeight: 700, color: '#E8EDF5', fontSize: 15, marginBottom: 12 }}>
            Transaction Pathway
          </div>
          <div className="log-terminal" style={{ marginBottom: 16 }}>
            {logLines.map((l, i) => (
              <div key={i} className="stream-in" style={{ color: l.color, marginBottom: 2 }}>
                {l.text}
              </div>
            ))}
          </div>

          {decision && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }} className="fade-up">
              <div className={`${decision === 'BLOCK' ? 'block-stamp' : decision === 'STEP-UP' ? 'stepup-stamp' : 'approve-stamp'} stamp-in`}>
                {decision}
              </div>
              <div>
                <div style={{ fontSize: 13, color: '#8A95A8', marginBottom: 6 }}>
                  Composite: <span style={{ color: '#E8EDF5', fontWeight: 700 }}>{composite}/1000</span>
                  {' · '}Latency: <span style={{ color: '#00D4AA', fontWeight: 700 }}>{latencyMs}ms</span>
                  {shownCase && <>{' · '}Case: <span style={{ color: '#4A9EFF', fontFamily: "'JetBrains Mono', monospace" }}>{shownCase}</span></>}
                </div>
                <div style={{ fontSize: 12, color: '#8A95A8' }}>
                  {fastPath
                    ? '⚡ Fast path via telecom risk ≥160 — ML queue bypassed'
                    : decision === 'BLOCK'
                    ? 'ML full path — composite ≥600 → block + alert'
                    : decision === 'STEP-UP'
                    ? 'ML full path — composite 300–599 → biometric re-auth requested'
                    : 'ML full path — composite 0–299 → transaction approved'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Gap callout */}
      <div style={{
        marginTop: 20,
        padding: '14px 18px',
        background: 'rgba(0,212,170,.05)',
        border: '1px solid rgba(0,212,170,.15)',
        borderRadius: 10,
        fontSize: 13,
        color: '#8A95A8',
      }}>
        <span style={{ color: '#00D4AA', fontWeight: 700 }}>This closes G3 — Social Engineering Blind Spot.</span>{' '}
        No existing platform can detect pre-transaction manipulation. The telecom context layer is the
        ONLY mechanism that captures this signal before OTP delivery.
      </div>
    </div>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
