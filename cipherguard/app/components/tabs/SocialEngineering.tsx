'use client';
import { useState } from 'react';
import { useAppState } from '../../lib/state';
import { computeTelecomScore, computeComposite, scoreToDecision, randInt, caseId } from '../../lib/utils';
import PipelineVisualization, { type PipelineInputs } from '../PipelineVisualization';

const AMOUNT_BANDS = ['LOW (<₹1k)', 'MEDIUM (₹1k–10k)', 'HIGH (₹10k–100k)', 'VERY HIGH (>₹1L)'];

function ScoreBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = Math.min(100, (value / max) * 100);
  const color = pct >= 80 ? '#DC2626' : pct >= 40 ? '#D97706' : '#059669';
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
        <span style={{ color: '#64748B' }}>{label}</span>
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
  const isRed = critColor === '#FF3B5C' || critColor === '#DC2626';
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 14px',
      borderRadius: 8,
      background: checked
        ? (isRed ? '#FEF2F2' : '#FFFBEB')
        : '#F8FAFF',
      border: `1px solid ${checked
        ? (isRed ? '#FCA5A5' : '#FDE68A')
        : '#E2E8F0'}`,
      marginBottom: 8,
      gap: 12,
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: '#0F172A', fontWeight: 600 }}>{label}</div>
        {subLabel && (
          <div style={{
            fontSize: 11,
            color: checked ? (isRed ? '#DC2626' : '#D97706') : '#94A3B8',
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

  const [pipelineTrigger, setPipelineTrigger] = useState(0);

  const callScore     = calls >= 6 ? 80 : calls >= 3 ? 40 : Math.round(calls * 6.67);
  const screenScore   = screenShare ? 100 : 0;
  const clipScore     = clipboard   ? 60  : 0;
  const iccidScore    = iccidChanged ? 80 : 0;
  const portScore     = ported       ? 70 : 0;
  const telecomScore  = Math.min(200, callScore + screenScore + clipScore + iccidScore + portScore);
  const mlBase        = 85;
  const composite     = computeComposite({
    hashMismatch: false,
    telecomScore,
    mlBaseScore: mlBase,
    iccidChanged,
    crossBankSeen: false,
  });
  const fastPath      = telecomScore >= 160;
  const liveDecision  = scoreToDecision(composite);

  const pipelineInputs: PipelineInputs = {
    scenario: 'social',
    victimImei: '490154203237518',
    customerId: 'CUST_884712',
    bank: 'SBI',
    amountBand: AMOUNT_BANDS[amountIdx],
    telecomCalls: calls,
    telecomScreenShare: screenShare,
    telecomClipboard: clipboard,
    telecomIccid: iccidChanged,
    telecomPorted: ported,
    telecomScore,
  };

  const handleRun = async () => {
    if (running) return;
    setRunning(true);
    setLogLines([]);
    setDecision(null);
    setPipelineTrigger(t => t + 1);

    const lat = randInt(140, 290);
    const isFastPath = fastPath;
    const dec = isFastPath ? 'BLOCK' : liveDecision;
    const cId = caseId();

    const commonLines: Array<{ text: string; color: string }> = [
      { text: 'TRANSACTION_INIT received...', color: '#94A3B8' },
      { text: 'L3: Fetching telecom context from MNO CAMARA API...', color: '#3B82F6' },
      { text: `L3 signals: calls=${calls}, screen=${screenShare}, clipboard=${clipboard}, iccid=${iccidChanged}, ported=${ported}`, color: '#3B82F6' },
      { text: `TELECOM_RISK_SCORE = ${telecomScore} / 200`, color: telecomScore >= 160 ? '#DC2626' : telecomScore >= 80 ? '#D97706' : '#059669' },
    ];

    const fastPathLines: Array<{ text: string; color: string }> = [
      { text: '⚡ TELECOM_RISK_SCORE ≥ 160 — FAST PATH TRIGGERED', color: '#DC2626' },
      { text: 'ML scoring queue: *** BYPASSED — NOT CONSULTED ***', color: '#D97706' },
      { text: 'OTP: CANCELLED — NOT ISSUED', color: '#D97706' },
      { text: `Decision: BLOCK (composite=${composite}) — telecom fast path`, color: '#DC2626' },
      { text: `Push notification → registered device`, color: '#3B82F6' },
      { text: `Fraud case ${cId} opened — social engineering indicators logged`, color: '#3B82F6' },
    ];

    const mlLines: Array<{ text: string; color: string }> = [
      { text: 'L2: device_hash verified — MATCH (not a SIM swap)', color: '#059669' },
      { text: 'L5: ML ensemble scoring...', color: '#3B82F6' },
      { text: `LightGBM: ${randInt(40, 180)}  LSTM: ${randInt(40, 160)}  GNN: ${randInt(30, 150)}  IsoForest: ${randInt(20, 140)}`, color: '#3B82F6' },
      { text: `Composite score: ${composite} / 1000`, color: composite >= 600 ? '#DC2626' : composite >= 300 ? '#D97706' : '#059669' },
      { text: `Decision: ${dec}`, color: dec === 'BLOCK' ? '#DC2626' : dec === 'STEP-UP' ? '#D97706' : '#059669' },
      ...(dec === 'BLOCK' ? [
        { text: `Fraud case ${cId} opened`, color: '#DC2626' },
      ] : dec === 'STEP-UP' ? [
        { text: 'Requesting biometric re-auth (60s timeout)...', color: '#D97706' },
      ] : [
        { text: 'Transaction approved — TrustConfirm written to blockchain', color: '#059669' },
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
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
          🎭 Social Engineering Detector
        </h2>
        <p style={{ color: '#64748B', fontSize: 14 }}>
          Pre-transaction telecom context detection. Closes G3 — the social engineering blind spot
          that defeats every existing fraud platform.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* ── LEFT: Controls ── */}
        <div>
          <div className="cg-card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 15, marginBottom: 16 }}>
              Live Signal Configuration
            </div>

            {/* Call slider */}
            <div style={{
              padding: '12px 14px',
              borderRadius: 8,
              background: '#F8FAFF',
              border: '1px solid #E2E8F0',
              marginBottom: 8,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: '#0F172A', fontWeight: 600 }}>
                  Unknown inbound calls (15-min window)
                </span>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: calls >= 6 ? '#DC2626' : calls >= 3 ? '#D97706' : '#059669',
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
              <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 6 }}>
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
              critColor="#DC2626"
            />
            <Toggle
              checked={clipboard}
              onChange={setClipboard}
              label="Clipboard VPA injected from external source"
              subLabel={clipboard ? 'Attacker injected destination account (+60)' : '+0 — safe'}
              critColor="#D97706"
            />
            <Toggle
              checked={iccidChanged}
              onChange={setIccidChanged}
              label="SIM ICCID changed since last session"
              subLabel={iccidChanged ? 'SIM swap may have occurred (+80)' : '+0 — safe'}
              critColor="#D97706"
            />
            <Toggle
              checked={ported}
              onChange={setPorted}
              label="Phone number ported in last 72 hours"
              subLabel={ported ? 'Porting = SIM swap mechanism (+70)' : '+0 — safe'}
              critColor="#D97706"
            />

            {/* Amount band */}
            <div style={{ marginTop: 12 }}>
              <label style={{ fontSize: 12, color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 8 }}>
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
                      border: `1px solid ${i === amountIdx ? '#BFDBFE' : '#E2E8F0'}`,
                      background: i === amountIdx ? '#EFF6FF' : '#F8FAFF',
                      color: i === amountIdx ? '#1D4ED8' : '#64748B',
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
            background: '#EFF6FF',
            border: '1px solid #BFDBFE',
            borderRadius: 10,
            fontSize: 12,
            color: '#475569',
          }}>
            <div style={{ color: '#1D4ED8', fontWeight: 700, marginBottom: 6 }}>
              ⚔️ Competitive Moat — Bilateral MNO Agreements
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: '#DC2626' }}>Bureau:</span> ❌ No telecom signals
            </div>
            <div style={{ marginBottom: 4 }}>
              <span style={{ color: '#D97706' }}>Protectt.ai:</span> ⚠️ SNA binary only (SIM present? yes/no)
            </div>
            <div>
              <span style={{ color: '#2563EB' }}>CipherGuard:</span> ✅ Full pre-transaction behavioral context from voice network (Jio + Airtel bilateral CDR)
            </div>
          </div>
        </div>

        {/* ── RIGHT: Live Score ── */}
        <div>
          <div className="cg-card" style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 15, marginBottom: 16 }}>
              Live Score (updates instantly)
            </div>

            {/* Telecom gauge */}
            <div style={{
              padding: '14px 16px',
              borderRadius: 10,
              background: telecomScore >= 160
                ? '#FEF2F2'
                : telecomScore >= 80
                ? '#FFFBEB'
                : '#ECFDF5',
              border: `1px solid ${telecomScore >= 160 ? '#FCA5A5' : telecomScore >= 80 ? '#FDE68A' : '#86EFAC'}`,
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>TELECOM_RISK_SCORE</span>
                <span style={{
                  fontSize: 36,
                  fontWeight: 900,
                  color: telecomScore >= 160 ? '#DC2626' : telecomScore >= 80 ? '#D97706' : '#059669',
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
                color: '#64748B',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span>Call volume score:</span>
                  <span style={{ color: callScore > 0 ? '#D97706' : '#94A3B8' }}>+{callScore}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span>Screen share:</span>
                  <span style={{ color: screenScore > 0 ? '#DC2626' : '#94A3B8' }}>+{screenScore}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span>Clipboard injection:</span>
                  <span style={{ color: clipScore > 0 ? '#D97706' : '#94A3B8' }}>+{clipScore}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span>ICCID change:</span>
                  <span style={{ color: iccidScore > 0 ? '#D97706' : '#94A3B8' }}>+{iccidScore}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span>Porting:</span>
                  <span style={{ color: portScore > 0 ? '#D97706' : '#94A3B8' }}>+{portScore}</span>
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid #E2E8F0',
                  paddingTop: 6,
                  fontWeight: 700,
                }}>
                  <span style={{ color: '#0F172A' }}>TOTAL:</span>
                  <span style={{ color: telecomScore >= 160 ? '#DC2626' : telecomScore >= 80 ? '#D97706' : '#059669' }}>
                    {telecomScore} / 200
                  </span>
                </div>
              </div>

              {telecomScore >= 160 && (
                <div style={{
                  marginTop: 10,
                  padding: '6px 12px',
                  borderRadius: 6,
                  background: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#DC2626',
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
              background: '#F8FAFF',
              border: '1px solid #E2E8F0',
              marginBottom: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
                <span style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>COMPOSITE SCORE</span>
                <span style={{
                  fontSize: 32,
                  fontWeight: 900,
                  color: composite >= 600 ? '#DC2626' : composite >= 300 ? '#D97706' : '#059669',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {composite}
                </span>
              </div>

              {/* Decision zone bar */}
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: 11, color: '#94A3B8', marginBottom: 4 }}>Decision bands:</div>
                <div style={{ display: 'flex', height: 20, borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ flex: 3, background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#059669', fontWeight: 700 }}>
                    APPROVE
                  </div>
                  <div style={{ flex: 3, background: '#FEF9C3', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#D97706', fontWeight: 700 }}>
                    STEP-UP
                  </div>
                  <div style={{ flex: 4, background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: '#DC2626', fontWeight: 700 }}>
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
                    background: composite >= 600 ? '#DC2626' : composite >= 300 ? '#D97706' : '#059669',
                    borderRadius: 2,
                    transition: 'left .3s',
                  }} />
                </div>
              </div>

              <div style={{
                fontSize: 14,
                fontWeight: 800,
                color: liveDecision === 'BLOCK' ? '#DC2626' : liveDecision === 'STEP-UP' ? '#D97706' : '#059669',
                textAlign: 'center',
              }}>
                Expected: {liveDecision}
                {fastPath && ' (FAST PATH)'}
              </div>
            </div>

            {/* SHAP preview */}
            <div style={{ fontSize: 12, color: '#64748B' }}>
              <div style={{ fontWeight: 600, color: '#0F172A', marginBottom: 8 }}>
                SHAP Feature Importance (top signals):
              </div>
              {[
                ['SCREEN_SHARE_ACTIVE', screenScore, '#DC2626'],
                ['CALL_VOLUME_PRE_TXN', callScore, '#D97706'],
                ['CLIPBOARD_INJECTED', clipScore, '#D97706'],
                ['ICCID_CHANGED', iccidScore, '#D97706'],
                ['PORTED_RECENTLY', portScore, '#D97706'],
                ['ML_ENSEMBLE_BASE', mlBase, '#2563EB'],
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
            className="btn-primary"
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
          <div style={{ fontWeight: 700, color: '#0F172A', fontSize: 15, marginBottom: 12 }}>
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
                <div style={{ fontSize: 13, color: '#64748B', marginBottom: 6 }}>
                  Composite: <span style={{ color: '#0F172A', fontWeight: 700 }}>{composite}/1000</span>
                  {' · '}Latency: <span style={{ color: '#2563EB', fontWeight: 700 }}>{latencyMs}ms</span>
                  {shownCase && <>{' · '}Case: <span style={{ color: '#2563EB', fontFamily: "'JetBrains Mono', monospace" }}>{shownCase}</span></>}
                </div>
                <div style={{ fontSize: 12, color: '#64748B' }}>
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

      {/* Pipeline Visualization */}
      <PipelineVisualization trigger={pipelineTrigger} inputs={pipelineInputs} />

      {/* Gap callout */}
      <div style={{
        marginTop: 20,
        padding: '14px 18px',
        background: '#EFF6FF',
        border: '1px solid #BFDBFE',
        borderRadius: 10,
        fontSize: 13,
        color: '#475569',
      }}>
        <span style={{ color: '#1D4ED8', fontWeight: 700 }}>This closes G3 — Social Engineering Blind Spot.</span>{' '}
        No existing platform can detect pre-transaction manipulation. The telecom context layer is the
        ONLY mechanism that captures this signal before OTP delivery.
      </div>
    </div>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
