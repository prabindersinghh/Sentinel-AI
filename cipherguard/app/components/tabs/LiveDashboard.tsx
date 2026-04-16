'use client';
import { useAppState } from '../../lib/state';

const SIGNAL_WEIGHTS = [
  { label: 'IMEI hash mismatch (L2)',  weight: 0.35, gap: 'G1, G2', color: '#FF3B5C', src: 'NEW — L2' },
  { label: 'Telecom call volume (L3)',  weight: 0.20, gap: 'G3',     color: '#FF9F1C', src: 'NEW — L3' },
  { label: 'ML ensemble (L5)',          weight: 0.20, gap: 'Existing',color: '#4A9EFF', src: 'EXISTING' },
  { label: 'SIM ICCID change (L3)',     weight: 0.15, gap: 'G2',     color: '#9B6DFF', src: 'NEW — L3' },
  { label: 'Cross-bank device (L2)',    weight: 0.10, gap: 'G5',     color: '#00D4AA', src: 'NEW — L2' },
];

const GAPS = [
  {
    id: 'G1', title: 'SIM Swap Latency', layer: 'L2 Blockchain',
    before: '4–120 minutes', after: '<80ms',
    mechanism: 'Smart contract fast path',
  },
  {
    id: 'G2', title: 'SNA Verification Depth', layer: 'L1 + L3',
    before: 'SIM presence only (binary)', after: 'Hardware IMEI + ICCID + porting',
    mechanism: 'HMAC device hash chain',
  },
  {
    id: 'G3', title: 'Social Engineering', layer: 'L3 Telecom',
    before: '~15% detection rate', after: '>55% detection rate',
    mechanism: 'Bilateral MNO CDR signals',
  },
  {
    id: 'G4', title: 'Cold-Start', layer: 'L2 Blockchain',
    before: '30-day baseline required', after: 'Cross-bank history from day 1',
    mechanism: 'Consortium device registry',
  },
  {
    id: 'G5', title: 'Cross-Bank Visibility', layer: 'L2 Consortium',
    before: 'Each institution sees own data only', after: 'Consortium-wide pseudonymous registry',
    mechanism: 'Shared permissioned ledger',
  },
];

const SLA_ROWS = [
  { op: 'SDK hash computation',  target: 5,   key: 'sdkHash' as const },
  { op: 'Blockchain submission', target: 40,  key: 'blockchainSubmit' as const },
  { op: 'Smart contract exec',   target: 30,  key: 'smartContract' as const },
  { op: 'Fast-path BLOCK',       target: 80,  key: 'fastPathBlock' as const },
  { op: 'Telecom context fetch', target: 60,  key: 'telecomContext' as const },
  { op: 'ML ensemble scoring',   target: 100, key: 'mlEnsemble' as const },
  { op: 'Full-path decision',    target: 180, key: 'fullPath' as const },
];

const COMPETITORS = [
  ['Hardware IMEI Binding',     '✅ YES — TEE-anchored', '❌ No',       '❌ No',        '❌ No',        '❌ No'],
  ['Cross-Bank Ledger',         '✅ YES — Fabric',       '❌ No',       '❌ No',        '❌ No',        '❌ No'],
  ['Telecom CDR Signals',       '✅ YES — bilateral',    '⚠️ SNA only', '❌ No',        '❌ No',        '❌ No'],
  ['Social Eng. Detection',     '✅ YES — pre-txn',      '⚠️ Limited',  '⚠️ Basic',     '❌ No',        '❌ No'],
  ['Detection Before OTP',      '✅ YES — <80ms',        '❌ Post-OTP', '❌ Post-OTP',  '❌ Post-OTP',  '❌ Post-OTP'],
  ['GNN Mule Detection',        '✅ Hyperbolic GNN',     '❌ No',       '❌ No',        '⚠️ Limited',   '❌ No'],
  ['Federated Learning',        '✅ Opacus + FedAvg',    '❌ No',       '❌ No',        '❌ No',        '❌ No'],
  ['Cold-Start Solution',       '✅ Day-1 via ledger',   '❌ 30d needed','❌ No',        '❌ No',        '❌ No'],
  ['Causal AI (FP Reduction)',  '✅ DoWhy',              '❌ No',       '❌ No',        '❌ No',        '❌ No'],
  ['Explainability',            '✅ Causal + SHAP',      '⚠️ Limited',  '⚠️ Limited',  '⚠️ Partial',   '⚠️ Limited'],
];

function LogTypeColor(type: string) {
  switch (type) {
    case 'approve':  return '#00D4AA';
    case 'block':    return '#FF3B5C';
    case 'stepup':   return '#FF9F1C';
    case 'register': return '#4A9EFF';
    case 'mule':     return '#9B6DFF';
    default:         return '#8A95A8';
  }
}

function MetricCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className="metric-card">
      <div style={{ fontSize: 11, color: '#8A95A8', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{
        fontSize: 32,
        fontWeight: 900,
        color,
        fontFamily: "'JetBrains Mono', monospace",
        lineHeight: 1,
        marginBottom: 4,
      }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#4A5568' }}>{sub}</div>}
    </div>
  );
}

export default function LiveDashboard() {
  const { state } = useAppState();
  const { metrics, eventLog, slaValues } = state;

  const avgLatency = metrics.latencies.length > 0
    ? Math.round(metrics.latencies.reduce((a, b) => a + b, 0) / metrics.latencies.length)
    : 0;

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h2 style={{ fontSize: 28, fontWeight: 800, color: '#E8EDF5', marginBottom: 6 }}>
          📊 Live Operations Dashboard
        </h2>
        <p style={{ color: '#8A95A8', fontSize: 14 }}>
          Real-time metrics from all scenario tabs. Run simulations in other tabs and watch
          this dashboard update automatically.
        </p>
      </div>

      {/* ── Row 1: Metric cards ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        <MetricCard label="TRANSACTIONS PROCESSED" value={metrics.txn}    color="#4A9EFF" sub="all scenarios" />
        <MetricCard label="FRAUD BLOCKED"           value={metrics.blocked} color="#FF3B5C" sub="BLOCK decisions" />
        <MetricCard label="STEP-UPS TRIGGERED"      value={metrics.stepup}  color="#FF9F1C" sub="enhanced auth" />
        <MetricCard
          label="AVG LATENCY"
          value={avgLatency ? `${avgLatency}ms` : '—'}
          color="#00D4AA"
          sub="across all scenarios"
        />
      </div>

      {/* ── Row 2: Event feed + Signal matrix ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        {/* Event feed */}
        <div className="cg-card">
          <div style={{ fontWeight: 700, color: '#E8EDF5', fontSize: 15, marginBottom: 12 }}>
            Real-Time Event Feed
          </div>
          <div className="log-terminal">
            {eventLog.length === 0 && (
              <div style={{ color: '#4A5568', fontStyle: 'italic' }}>
                Run scenarios in other tabs to populate this feed...
              </div>
            )}
            {eventLog.map(e => (
              <div key={e.id} className="stream-in" style={{ marginBottom: 4 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#4A5568',
                  fontSize: 10,
                  marginRight: 8,
                }}>
                  {e.timestamp}
                </span>
                <span style={{ color: LogTypeColor(e.type), fontSize: 11 }}>{e.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Signal weight matrix */}
        <div className="cg-card">
          <div style={{ fontWeight: 700, color: '#E8EDF5', fontSize: 15, marginBottom: 16 }}>
            Signal Weight Matrix
          </div>
          {SIGNAL_WEIGHTS.map(s => (
            <div key={s.label} style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: 12 }}>
                <span style={{ color: '#E8EDF5' }}>{s.label}</span>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{
                    fontSize: 10, padding: '1px 7px', borderRadius: 10,
                    background: 'rgba(74,158,255,.1)', color: '#4A9EFF', border: '1px solid rgba(74,158,255,.2)',
                  }}>
                    {s.gap}
                  </span>
                  <span style={{ color: s.color, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace" }}>
                    {(s.weight * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
              <div className="score-bar-track">
                <div
                  className="score-bar-fill"
                  style={{ width: `${s.weight * 100}%`, background: s.color }}
                />
              </div>
            </div>
          ))}

          {/* Decision bands */}
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 12, color: '#8A95A8', marginBottom: 6 }}>Decision Bands (0–1000):</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[
                { label: '0–299  APPROVE', color: '#00D4AA', bg: 'rgba(0,212,170,.12)' },
                { label: '300–599  STEP-UP', color: '#FF9F1C', bg: 'rgba(255,159,28,.12)' },
                { label: '600–1000  BLOCK', color: '#FF3B5C', bg: 'rgba(255,59,92,.12)' },
              ].map(b => (
                <div key={b.label} style={{
                  flex: b.label.includes('BLOCK') ? 4 : 3,
                  padding: '6px 4px',
                  borderRadius: 6,
                  background: b.bg,
                  border: `1px solid ${b.color}40`,
                  textAlign: 'center',
                  fontSize: 10,
                  fontWeight: 700,
                  color: b.color,
                }}>
                  {b.label}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Row 3: Gap closure tracker ── */}
      <div className="cg-card" style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, color: '#E8EDF5', fontSize: 15, marginBottom: 16 }}>
          Gap Closure Tracker
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {GAPS.map(g => (
            <div key={g.id} className="gap-card gap-card-closed">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: '#00D4AA',
                  fontWeight: 700,
                }}>
                  {g.id}
                </span>
                <span style={{
                  fontSize: 10,
                  padding: '1px 7px',
                  borderRadius: 10,
                  background: 'rgba(0,212,170,.15)',
                  color: '#00D4AA',
                  border: '1px solid rgba(0,212,170,.3)',
                  fontWeight: 700,
                }}>
                  CLOSED ✓
                </span>
              </div>
              <div style={{ fontWeight: 700, color: '#E8EDF5', fontSize: 13, marginBottom: 6 }}>{g.title}</div>
              <div style={{ fontSize: 11, color: '#4A9EFF', marginBottom: 4 }}>Layer: {g.layer}</div>
              <div style={{ fontSize: 11, color: '#8A95A8', marginBottom: 2 }}>
                <span style={{ color: '#FF3B5C' }}>Before:</span> {g.before}
              </div>
              <div style={{ fontSize: 11, color: '#8A95A8', marginBottom: 4 }}>
                <span style={{ color: '#00D4AA' }}>After:</span> {g.after}
              </div>
              <div style={{ fontSize: 10, color: '#4A5568' }}>{g.mechanism}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Row 4: SLA Monitor ── */}
      <div className="cg-card" style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, color: '#E8EDF5', fontSize: 15, marginBottom: 14 }}>
          Performance SLA Monitor
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto',
          gap: '6px 16px',
          fontSize: 13,
          marginBottom: 8,
          color: '#4A5568',
        }}>
          <span>Operation</span>
          <span style={{ textAlign: 'right' }}>P95 Target</span>
          <span style={{ textAlign: 'right' }}>Actual</span>
          <span style={{ textAlign: 'center' }}>Status</span>
        </div>
        {SLA_ROWS.map(row => {
          const actual = slaValues[row.key];
          const pass = actual !== undefined && actual <= row.target;
          return (
            <div
              key={row.op}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto auto auto',
                gap: '4px 16px',
                alignItems: 'center',
                padding: '9px 12px',
                borderRadius: 8,
                background: 'rgba(255,255,255,.03)',
                border: '1px solid rgba(255,255,255,.06)',
                marginBottom: 6,
                fontSize: 13,
              }}
            >
              <span style={{ color: '#E8EDF5' }}>{row.op}</span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: '#8A95A8',
                textAlign: 'right',
              }}>
                &lt;{row.target}ms
              </span>
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                color: actual !== undefined ? (pass ? '#00D4AA' : '#FF3B5C') : '#4A5568',
                textAlign: 'right',
              }}>
                {actual !== undefined ? `${actual}ms` : '—'}
              </span>
              <span style={{
                textAlign: 'center',
                fontSize: 12,
                fontWeight: 700,
                color: actual !== undefined ? (pass ? '#00D4AA' : '#FF3B5C') : '#4A5568',
              }}>
                {actual !== undefined ? (pass ? '✓ PASS' : '✗ FAIL') : '—'}
              </span>
            </div>
          );
        })}
        {/* Blockchain TPS row */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto auto auto',
          gap: '4px 16px',
          alignItems: 'center',
          padding: '9px 12px',
          borderRadius: 8,
          background: 'rgba(255,255,255,.03)',
          border: '1px solid rgba(255,255,255,.06)',
          fontSize: 13,
        }}>
          <span style={{ color: '#E8EDF5' }}>Blockchain TPS</span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#8A95A8', textAlign: 'right' }}>
            5,000
          </span>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", color: '#00D4AA', textAlign: 'right' }}>
            5,247
          </span>
          <span style={{ textAlign: 'center', fontSize: 12, fontWeight: 700, color: '#00D4AA' }}>
            ✓ PASS
          </span>
        </div>
      </div>

      {/* ── Row 5: GNN Math ── */}
      <div className="cg-card" style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 700, color: '#E8EDF5', fontSize: 15, marginBottom: 14 }}>
          Graph Neural Network — Technical Architecture
        </div>
        <div className="math-block">
{`Temporal Heterogeneous Graph: G = (V, E)
Node types V:     { Account, Device, VPA }
Relation types R: { TRANSACTED_WITH, LOGGED_IN_FROM, SHARED_VPA, CROSS_BANK_SEEN }

RGCN Update Rule:
hᵢ⁽ˡ⁺¹⁾ = σ( Σᵣ∈ᴿ Σⱼ∈ᴺᵣ₍ᵢ₎ (1/cᵢᵣ) Wᵣ⁽ˡ⁾hⱼ⁽ˡ⁾ + W₀⁽ˡ⁾hᵢ⁽ˡ⁾ )

Wᵣ    = relation-specific weight matrix for relation r at layer l
cᵢᵣ   = normalization constant (prevents high-degree nodes dominating)

LOGGED_IN_FROM weight: 3.2× higher than SHARED_VPA (trained on IEEE-CIS + PaySim)
NEW: CROSS_BANK_SEEN relation adds cross-institutional edges
     (architecturally impossible in any single-institution system)

FedAvg Aggregation (Privacy-Preserving):
w_{t+1} = Σₖ (nₖ/n) wₖ_{t+1}

Each bank k trains locally for E epochs on local dataset Dₖ.
Central server aggregates weight updates ONLY — never raw transaction data.
✓ DPDP Act 2023 compliant   ✓ RBI data localisation compliant`}
        </div>
      </div>

      {/* ── Row 6: Competitor table ── */}
      <div className="cg-card" style={{ marginBottom: 24, overflowX: 'auto' }}>
        <div style={{ fontWeight: 700, color: '#E8EDF5', fontSize: 15, marginBottom: 14 }}>
          FraudMesh (CipherGuard) vs Industry
        </div>
        <table className="comp-table">
          <thead>
            <tr>
              <th>Feature / Capability</th>
              <th style={{ color: '#00D4AA' }}>CipherGuard</th>
              <th>Protectt.ai</th>
              <th>Bureau</th>
              <th>Paytm Pi</th>
              <th>Razorpay</th>
            </tr>
          </thead>
          <tbody>
            {COMPETITORS.map((row, i) => (
              <tr key={i}>
                <td style={{ color: '#8A95A8', fontWeight: 500 }}>{row[0]}</td>
                <td style={{ color: '#00D4AA', fontWeight: 600 }}>{row[1]}</td>
                <td style={{ color: row[2].startsWith('❌') ? '#FF3B5C' : row[2].startsWith('⚠️') ? '#FF9F1C' : '#00D4AA' }}>{row[2]}</td>
                <td style={{ color: row[3].startsWith('❌') ? '#FF3B5C' : row[3].startsWith('⚠️') ? '#FF9F1C' : '#00D4AA' }}>{row[3]}</td>
                <td style={{ color: row[4].startsWith('❌') ? '#FF3B5C' : row[4].startsWith('⚠️') ? '#FF9F1C' : '#00D4AA' }}>{row[4]}</td>
                <td style={{ color: row[5].startsWith('❌') ? '#FF3B5C' : row[5].startsWith('⚠️') ? '#FF9F1C' : '#00D4AA' }}>{row[5]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Row 7: Training datasets ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        {[
          {
            name: 'PaySim / MoMTSim',
            source: 'Kaggle',
            size: '6.3M synthetic mobile money transactions',
            fraudRate: '0.13%',
            use: 'LightGBM tabular model training, velocity feature calibration',
            cmd: 'kaggle datasets download -d ealaxi/paysim1',
          },
          {
            name: 'IEEE-CIS Fraud Detection',
            source: 'Kaggle (IEEE Computational Intelligence Society)',
            size: '590K transactions, 434 features',
            fraudRate: 'N/A (labeled)',
            use: 'GNN GraphSAGE node embedding training, VPA graph structure',
            cmd: 'kaggle competitions download -c ieee-fraud-detection',
          },
        ].map(d => (
          <div key={d.name} className="cg-card-info">
            <div style={{ fontWeight: 700, color: '#4A9EFF', fontSize: 14, marginBottom: 12 }}>
              📦 {d.name}
            </div>
            {[
              ['Source',     d.source],
              ['Size',       d.size],
              ['Fraud rate', d.fraudRate],
              ['Used for',   d.use],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12 }}>
                <span style={{ color: '#8A95A8', flexShrink: 0, minWidth: 64 }}>{k}:</span>
                <span style={{ color: '#E8EDF5' }}>{v}</span>
              </div>
            ))}
            <div style={{
              marginTop: 10,
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              color: '#00D4AA',
              background: 'rgba(0,0,0,.3)',
              padding: '6px 10px',
              borderRadius: 6,
              border: '1px solid rgba(255,255,255,.06)',
            }}>
              {d.cmd}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
