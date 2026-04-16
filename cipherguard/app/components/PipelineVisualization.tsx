'use client';
import { useState, useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { deterministicHash, randomHex, randInt } from '../lib/utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip);

/* ── Types ── */
export interface PipelineInputs {
  scenario: 'simswap' | 'social' | 'mule';
  victimImei: string;
  attackerImei?: string;
  customerId: string;
  bank: string;
  amountBand: string;
  telecomCalls?: number;
  telecomScreenShare?: boolean;
  telecomClipboard?: boolean;
  telecomIccid?: boolean;
  telecomPorted?: boolean;
  telecomScore?: number;
}

type LayerStatus = 'idle' | 'active' | 'done' | 'skipped' | 'fast';

interface LayerState {
  l1: LayerStatus; l2: LayerStatus; l3: LayerStatus;
  l4: LayerStatus; l5: LayerStatus; l6: LayerStatus;
}

interface ComputedData {
  deviceHash: string;
  attackerHash: string;
  hashMatch: boolean;
  telecomScore: number;
  mlLgbm: number; mlLstm: number; mlGnn: number; mlIfo: number; mlMeta: number;
  shap: { feature: string; value: number; color: string }[];
  composite: number;
  decision: 'APPROVE' | 'STEP-UP' | 'BLOCK';
  fastPathAt: 'l2' | 'l3' | null;
  fastPathReason: string;
  latency: number;
  txId: string;
  blockNumber: number;
  features: { name: string; value: string | number | boolean; source: string }[];
}

/* ── Compute pipeline data from inputs ── */
function computeData(inputs: PipelineInputs): ComputedData {
  const deviceHash   = deterministicHash(inputs.victimImei + inputs.customerId + inputs.bank);
  const attackerHash = inputs.attackerImei
    ? deterministicHash(inputs.attackerImei + inputs.customerId + inputs.bank + '_atk')
    : deviceHash;
  const hashMatch = attackerHash === deviceHash;

  const calls      = inputs.telecomCalls ?? 0;
  const screen     = inputs.telecomScreenShare ?? false;
  const clipboard  = inputs.telecomClipboard  ?? false;
  const iccid      = inputs.telecomIccid      ?? false;
  const ported     = inputs.telecomPorted     ?? false;
  const callScore  = calls >= 6 ? 80 : calls >= 3 ? 40 : Math.round(calls * 6.67);
  const telecomScore = inputs.telecomScore ??
    Math.min(200, callScore + (screen?100:0) + (clipboard?60:0) + (iccid?80:0) + (ported?70:0));

  const fastPathAt: 'l2' | 'l3' | null =
    !hashMatch ? 'l2' :
    telecomScore >= 160 ? 'l3' :
    null;

  const fastPathReason =
    !hashMatch ? 'Hash Mismatch — MismatchDetector.sol' :
    telecomScore >= 160 ? 'TELECOM_RISK_SCORE ≥ 160' : '';

  // ML scores
  const isMule   = inputs.scenario === 'mule';
  const isSocial = inputs.scenario === 'social';
  const mlBase   = fastPathAt ? 0 : (isSocial ? randInt(150, 200) : isMule ? randInt(120, 175) : randInt(40, 90));
  const mlLgbm   = fastPathAt ? 0 : (isSocial ? randInt(140,200) : isMule ? randInt(110,170) : randInt(30,85));
  const mlLstm   = fastPathAt ? 0 : (isSocial ? randInt(130,195) : isMule ? randInt(100,165) : randInt(25,80));
  const mlGnn    = fastPathAt ? 0 : (isMule   ? randInt(140,190) : isSocial ? randInt(120,180) : randInt(20,75));
  const mlIfo    = fastPathAt ? 0 : (isSocial ? randInt(145,195) : isMule ? randInt(100,160) : randInt(15,70));
  const mlMeta   = mlBase;

  // SHAP values
  const shap = [
    { feature: 'SCREEN_SHARE_ACTIVE',  value: screen     ? randInt(120,180) : randInt(0,15),   color: '#EF4444' },
    { feature: 'TELECOM_RISK_SCORE',   value: Math.round(telecomScore*0.85), color: '#F59E0B' },
    { feature: 'CALL_VOLUME_PRE_TXN',  value: callScore  ? randInt(60,90)   : randInt(0,12),   color: '#F59E0B' },
    { feature: 'CLIPBOARD_INJECTED',   value: clipboard  ? randInt(40,70)   : randInt(0,8),    color: '#F59E0B' },
    { feature: 'CROSS_BANK_SEEN',      value: isMule     ? randInt(100,150) : randInt(0,10),   color: '#7C3AED' },
    { feature: 'ICCID_CHANGED',        value: iccid      ? randInt(70,110)  : randInt(0,10),   color: '#2563EB' },
    { feature: 'ML_ENSEMBLE_BASE',     value: mlMeta,                                          color: '#1D4ED8' },
    { feature: 'PORTED_RECENTLY',      value: ported     ? randInt(50,80)   : randInt(0,8),    color: '#0891B2' },
    { feature: 'DEVICE_TRUSTED',       value: hashMatch  ? randInt(0,15)    : randInt(80,120), color: '#1E40AF' },
  ].sort((a,b) => b.value - a.value);

  const crossBank = isMule ? 100 : 0;
  const iccidScore = iccid ? 150 : 0;
  const composite = fastPathAt
    ? 1000
    : Math.min(1000, (hashMatch?0:350) + Math.round(telecomScore) + Math.round(mlMeta) + iccidScore + crossBank);

  const decision: 'APPROVE' | 'STEP-UP' | 'BLOCK' =
    fastPathAt ? 'BLOCK' : composite >= 600 ? 'BLOCK' : composite >= 300 ? 'STEP-UP' : 'APPROVE';

  const latency = fastPathAt === 'l2' ? randInt(62,78) : fastPathAt === 'l3' ? randInt(95,120) : randInt(160,290);

  const features = [
    { name: 'DEVICE_TRUSTED',         value: hashMatch,                   source: 'L2' },
    { name: 'HASH_MATCH',             value: hashMatch,                   source: 'L2' },
    { name: 'CROSS_BANK_SEEN',        value: isMule,                      source: 'L2' },
    { name: 'DAYS_SINCE_REGISTRATION',value: randInt(30,180),             source: 'L2' },
    { name: 'TELECOM_RISK_SCORE',     value: telecomScore,                source: 'L3' },
    { name: 'SCREEN_SHARE_ACTIVE',    value: screen,                      source: 'L3' },
    { name: 'CALL_VOLUME_PRE_TXN',    value: inputs.telecomCalls ?? 0,    source: 'L3' },
    { name: 'CLIPBOARD_INJECTED',     value: clipboard,                   source: 'L3' },
    { name: 'ICCID_CHANGED',          value: iccid,                       source: 'L3' },
    { name: 'PORTED_RECENTLY',        value: ported,                      source: 'L3' },
    { name: 'AMOUNT_BAND',            value: inputs.amountBand,           source: 'L4' },
  ];

  return {
    deviceHash, attackerHash, hashMatch, telecomScore,
    mlLgbm, mlLstm, mlGnn, mlIfo, mlMeta,
    shap, composite, decision, fastPathAt, fastPathReason, latency,
    txId: randomHex(24), blockNumber: randInt(100000, 999999),
    features,
  };
}

/* ══════════════════════════════════════════════════
   GNN Graph (SVG)
════════════════════════════════════════════════════ */
function GNNGraph({ data }: { data: ComputedData }) {
  const isFraud = data.decision === 'BLOCK';
  const nodeColor = isFraud ? '#EF4444' : '#2563EB';

  const accounts = [
    { id:'A1', x:80,  y:60,  label:'Acct-3827', risk: randInt(12,95) },
    { id:'A2', x:220, y:40,  label:'Acct-9142', risk: randInt(8,65) },
    { id:'A3', x:360, y:45,  label:'Acct-5571', risk: randInt(15,80) },
    { id:'A4', x:490, y:70,  label:'Acct-1203', risk: randInt(10,70) },
    { id:'A5', x:60,  y:310, label:'Acct-7764', risk: randInt(20,90) },
    { id:'A6', x:500, y:300, label:'Acct-2295', risk: randInt(5,55) },
  ];
  const vpas = [
    { id:'V1', x:140, y:160, label:'upi@sbi',    risk: randInt(20,70) },
    { id:'V2', x:290, y:140, label:'pay@hdfc',   risk: randInt(15,60) },
    { id:'V3', x:430, y:165, label:'vpa@icici',  risk: randInt(10,50) },
    { id:'V4', x:190, y:295, label:'ybl@kotak',  risk: randInt(25,85) },
  ];
  const device = { x: 290, y: 225, label: data.deviceHash.substring(0,8)+'...' };

  const edges = [
    { from: device, to: vpas[0], rel: 'LOGGED_IN_FROM', w: 3.2 },
    { from: device, to: vpas[1], rel: 'TRANSACTED_WITH', w: 1.0 },
    { from: device, to: vpas[2], rel: 'TRANSACTED_WITH', w: 1.0 },
    { from: device, to: vpas[3], rel: 'CROSS_BANK_SEEN', w: 2.0 },
    { from: vpas[0], to: accounts[0], rel: 'SHARED_VPA', w: 1.0 },
    { from: vpas[0], to: accounts[1], rel: 'SHARED_VPA', w: 1.0 },
    { from: vpas[1], to: accounts[2], rel: 'SHARED_VPA', w: 1.0 },
    { from: vpas[2], to: accounts[3], rel: 'SHARED_VPA', w: 1.0 },
    { from: vpas[3], to: accounts[4], rel: 'CROSS_BANK_SEEN', w: 2.0 },
    { from: vpas[3], to: accounts[5], rel: 'SHARED_VPA', w: 1.0 },
  ];

  const edgeColor = (rel: string) =>
    rel === 'LOGGED_IN_FROM' ? (isFraud ? '#EF4444' : '#1D4ED8') :
    rel === 'CROSS_BANK_SEEN' ? '#7C3AED' : '#93C5FD';

  const riskRing = (risk: number) =>
    risk > 70 ? '#EF4444' : risk > 40 ? '#F59E0B' : '#10B981';

  return (
    <div className="cg-card fade-up" style={{ marginTop: 20 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ fontWeight:800, color:'#0F172A', fontSize:16 }}>
            GNN Transaction Graph — Final State
          </div>
          <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>
            Temporal Heterogeneous Graph G=(V,E) · Nodes: Account, Device, VPA · RGCN embeddings
          </div>
        </div>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          {[
            { label:'Account', color:'#3B82F6', shape:'●' },
            { label:'Device',  color:isFraud?'#EF4444':'#1E40AF', shape:'■' },
            { label:'VPA',     color:'#7C3AED', shape:'◆' },
          ].map(l => (
            <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'#475569' }}>
              <span style={{ color:l.color }}>{l.shape}</span>{l.label}
            </div>
          ))}
        </div>
      </div>

      <svg viewBox="0 0 580 370" style={{ width:'100%', maxHeight:370 }}>
        {/* Edges */}
        {edges.map((e,i) => (
          <g key={i}>
            <line
              x1={e.from.x} y1={e.from.y} x2={e.to.x} y2={e.to.y}
              stroke={edgeColor(e.rel)}
              strokeWidth={e.w === 3.2 ? 2.5 : e.w === 2.0 ? 2 : 1.2}
              strokeDasharray={e.rel === 'CROSS_BANK_SEEN' ? '5 3' : undefined}
              opacity={0.7}
            />
            <text
              x={(e.from.x + e.to.x)/2}
              y={(e.from.y + e.to.y)/2 - 4}
              fontSize={8.5}
              fill={edgeColor(e.rel)}
              textAnchor="middle"
              fontFamily="JetBrains Mono, monospace"
              opacity={0.8}
            >
              {e.rel}
            </text>
          </g>
        ))}

        {/* Account nodes */}
        {accounts.map(a => (
          <g key={a.id}>
            <circle cx={a.x} cy={a.y} r={18}
              fill="#EFF6FF" stroke="#3B82F6" strokeWidth={2} />
            <circle cx={a.x} cy={a.y} r={22}
              fill="none" stroke={riskRing(a.risk)} strokeWidth={2.5} strokeDasharray="4 2" opacity={0.6} />
            <text x={a.x} y={a.y+4} textAnchor="middle" fontSize={9} fill="#1D4ED8"
              fontWeight="700" fontFamily="DM Sans, sans-serif">Acct</text>
            <text x={a.x} y={a.y+18} textAnchor="middle" fontSize={8} fill="#64748B"
              fontFamily="JetBrains Mono, monospace">R:{a.risk}%</text>
          </g>
        ))}

        {/* VPA nodes */}
        {vpas.map(v => {
          const s = 16;
          return (
            <g key={v.id}>
              <polygon
                points={`${v.x},${v.y-s} ${v.x+s},${v.y} ${v.x},${v.y+s} ${v.x-s},${v.y}`}
                fill="#F5F3FF" stroke="#7C3AED" strokeWidth={2}
              />
              <text x={v.x} y={v.y+4} textAnchor="middle" fontSize={8} fill="#6D28D9"
                fontWeight="700" fontFamily="JetBrains Mono, monospace">{v.label}</text>
              <text x={v.x} y={v.y+18} textAnchor="middle" fontSize={8} fill="#64748B"
                fontFamily="JetBrains Mono, monospace">R:{v.risk}%</text>
            </g>
          );
        })}

        {/* Device node */}
        <rect x={device.x-26} y={device.y-24} width={52} height={48} rx={6}
          fill={isFraud ? '#FEF2F2' : '#EFF6FF'}
          stroke={isFraud ? '#EF4444' : '#1E40AF'}
          strokeWidth={3}
        />
        {isFraud && (
          <rect x={device.x-30} y={device.y-28} width={60} height={56} rx={8}
            fill="none" stroke="#EF4444" strokeWidth={2} strokeDasharray="4 2"
            opacity={0.5}
          />
        )}
        <text x={device.x} y={device.y-4} textAnchor="middle" fontSize={9} fill={isFraud?'#DC2626':'#1E40AF'}
          fontWeight="800" fontFamily="DM Sans, sans-serif">DEVICE</text>
        <text x={device.x} y={device.y+8} textAnchor="middle" fontSize={7.5} fill={isFraud?'#EF4444':'#475569'}
          fontFamily="JetBrains Mono, monospace">{device.label}</text>
        {isFraud && (
          <>
            <text x={device.x} y={device.y+24} textAnchor="middle" fontSize={9}
              fill="#EF4444" fontWeight="800">⚠ FRAUD</text>
          </>
        )}

        {/* Risk score legend */}
        <g transform="translate(10, 330)">
          {[{c:'#10B981',l:'Low risk (<40%)'},{c:'#F59E0B',l:'Med (40–70%)'},{c:'#EF4444',l:'High (>70%)'}].map((x,i) => (
            <g key={i} transform={`translate(${i*130}, 0)`}>
              <circle cx={6} cy={6} r={5} fill={x.c} opacity={0.7}/>
              <text x={14} y={10} fontSize={9} fill="#64748B" fontFamily="DM Sans, sans-serif">{x.l}</text>
            </g>
          ))}
        </g>

        {/* RGCN relation weight label */}
        <text x={290} y={358} textAnchor="middle" fontSize={9} fill="#94A3B8"
          fontFamily="JetBrains Mono, monospace">
          W(LOGGED_IN_FROM) = 3.2× · W(CROSS_BANK_SEEN) = 2.0× · W(SHARED_VPA) = 1.0×
        </text>
      </svg>

      {/* Embeddings mini-panel */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:14 }}>
        {[
          { type:'Account nodes', count: accounts.length, dim:128, update:'15 min', color:'#3B82F6' },
          { type:'Device nodes',  count: 1, dim:256, update:'Real-time', color: isFraud?'#EF4444':'#1E40AF' },
          { type:'VPA nodes',     count: vpas.length, dim:64, update:'15 min', color:'#7C3AED' },
        ].map(e => (
          <div key={e.type} style={{
            padding:'10px 12px', borderRadius:8,
            background: '#F8FAFF', border:'1px solid #DBEAFE', fontSize:12,
          }}>
            <div style={{ fontWeight:700, color:e.color, marginBottom:4 }}>{e.type}</div>
            <div style={{ color:'#475569' }}>Count: <b>{e.count}</b></div>
            <div style={{ color:'#475569' }}>Embedding dim: <b>{e.dim}d</b></div>
            <div style={{ color:'#94A3B8', fontSize:11 }}>Refresh: {e.update}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   SHAP Bar Chart (Chart.js)
════════════════════════════════════════════════════ */
function SHAPChart({ shap }: { shap: ComputedData['shap'] }) {
  const top8 = shap.slice(0, 8);
  const data = {
    labels: top8.map(s => s.feature),
    datasets: [{
      label: 'SHAP Contribution',
      data: top8.map(s => s.value),
      backgroundColor: top8.map(s => s.color + 'CC'),
      borderColor: top8.map(s => s.color),
      borderWidth: 1.5,
      borderRadius: 4,
    }],
  };
  const options = {
    indexAxis: 'y' as const,
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: false },
      tooltip: {
        callbacks: {
          label: (ctx: any) => ` Contribution: +${ctx.raw}`,
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: '#F1F5F9' },
        ticks: { color: '#64748B', font: { size: 11 } },
        title: { display: true, text: 'SHAP Value', color: '#94A3B8', font: { size: 11 } },
      },
      y: {
        grid: { display: false },
        ticks: {
          color: '#334155',
          font: { size: 11, family: "'JetBrains Mono', monospace" },
        },
      },
    },
  };
  return (
    <div style={{ height: 260, marginTop: 8 }}>
      <Bar data={data} options={options} />
    </div>
  );
}

/* ══════════════════════════════════════════════════
   Layer Detail panels
════════════════════════════════════════════════════ */
function L1Detail({ data, lines }: { data: ComputedData; lines: string[] }) {
  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:12, flexWrap:'wrap' }}>
        <InfoBox label="Platform" value="Android 14 / Pixel 8" color="#2563EB" />
        <InfoBox label="Hash Algo" value="HMAC-SHA-256 + djb2" color="#2563EB" />
        <InfoBox label="TEE Level" value="STRONG (Keystore)" color="#10B981" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
        <div>
          <div style={{ fontSize:11, color:'#64748B', marginBottom:4, fontWeight:600 }}>
            RASP Integrity Checks
          </div>
          {lines.map((l,i) => (
            <div key={i} className="stream-in" style={{ fontSize:12, color: l.includes('PASS') ? '#10B981' : '#475569', marginBottom:3, display:'flex', gap:6 }}>
              <span>{l.includes('PASS') ? '✓' : '›'}</span><span>{l}</span>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize:11, color:'#64748B', marginBottom:6, fontWeight:600 }}>Device Hash Output</div>
          <div style={{
            fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:'#1D4ED8',
            background:'#EFF6FF', border:'1px solid #BFDBFE', borderRadius:6,
            padding:'8px 10px', wordBreak:'break-all',
          }}>
            {data.deviceHash}
          </div>
          <div style={{ fontSize:11, color:'#94A3B8', marginTop:6 }}>
            Raw IMEI zeroed from memory after hash · mTLS 1.3 transport
          </div>
        </div>
      </div>
    </div>
  );
}

function L2Detail({ data, step }: { data: ComputedData; step: number }) {
  const steps = [
    { label:'Blockchain gateway lookup', ms:19 },
    { label:`HashRegistrar.sol — customer_pseudonym found`, ms:26 },
    { label:'MismatchDetector.sol — constant-time comparison', ms:31 },
    { label: data.hashMatch ? '✓ HASH MATCH — DEVICE_TRUSTED=true' : '✗ HASH MISMATCH — risk_flags.HASH_MISMATCH=1', ms:34 },
    ...(data.hashMatch ? [] : [
      { label:'FraudAlert(HIGH_CONFIDENCE) emitted → event bus', ms:37 },
      { label:'⚡ FAST PATH TRIGGERED — ML bypassed', ms:41 },
    ]),
  ];
  return (
    <div>
      <div style={{ display:'flex', gap:12, marginBottom:12, flexWrap:'wrap' }}>
        <InfoBox label="Fabric Block" value={`#${data.blockNumber}`} color="#2563EB" />
        <InfoBox label="TX ID" value={data.txId.substring(0,10)+'...'} color="#2563EB" mono />
        <InfoBox label="BFT Nodes" value="3 / 3 confirmed" color="#10B981" />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        <div>
          <div style={{ fontSize:11, color:'#64748B', marginBottom:6, fontWeight:600 }}>Hash Comparison</div>
          <HashRow label="Baseline (victim)" hash={data.deviceHash}   color="#10B981" />
          <HashRow label="Incoming (request)" hash={data.attackerHash} color={data.hashMatch ? '#10B981' : '#EF4444'} />
          <div style={{
            marginTop:8, padding:'8px 12px', borderRadius:8, fontSize:13, fontWeight:700,
            background: data.hashMatch ? '#ECFDF5' : '#FEF2F2',
            color: data.hashMatch ? '#059669' : '#DC2626',
            border: `1px solid ${data.hashMatch ? '#6EE7B7' : '#FCA5A5'}`,
          }}>
            {data.hashMatch ? '✓ MATCH — proceed to L3' : '✗ MISMATCH — FAST PATH → BLOCK'}
          </div>
        </div>
        <div>
          <div style={{ fontSize:11, color:'#64748B', marginBottom:6, fontWeight:600 }}>Blockchain Timeline</div>
          {steps.slice(0, Math.max(1, step+1)).map((s,i) => (
            <div key={i} className="stream-in" style={{
              fontSize:12, marginBottom:4, display:'flex', gap:8,
              color: s.label.includes('MISMATCH') || s.label.includes('FAST PATH') ? '#DC2626'
                   : s.label.includes('MATCH') ? '#059669' : '#334155',
            }}>
              <span style={{ color:'#94A3B8', flexShrink:0, fontFamily:"'JetBrains Mono', monospace" }}>
                +{s.ms}ms
              </span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function L3Detail({ data, revealCount }: { data: ComputedData; revealCount: number }) {
  const signals = [
    { name:'Unknown inbound calls (15-min)', value: `${data.features.find(f=>f.name==='CALL_VOLUME_PRE_TXN')?.value ?? 0} calls`, score: data.shap.find(s=>s.feature==='CALL_VOLUME_PRE_TXN')?.value ?? 0, color:'#F59E0B' },
    { name:'Screen share active',            value: data.features.find(f=>f.name==='SCREEN_SHARE_ACTIVE')?.value ? 'YES' : 'NO', score: data.features.find(f=>f.name==='SCREEN_SHARE_ACTIVE')?.value ? 100 : 0, color:'#EF4444' },
    { name:'VPA clipboard injected',         value: data.features.find(f=>f.name==='CLIPBOARD_INJECTED')?.value ? 'YES' : 'NO', score: data.features.find(f=>f.name==='CLIPBOARD_INJECTED')?.value ? 60 : 0, color:'#F59E0B' },
    { name:'SIM ICCID changed',              value: data.features.find(f=>f.name==='ICCID_CHANGED')?.value ? 'YES' : 'NO', score: data.features.find(f=>f.name==='ICCID_CHANGED')?.value ? 80 : 0, color:'#EF4444' },
    { name:'Number ported (72h)',            value: data.features.find(f=>f.name==='PORTED_RECENTLY')?.value ? 'YES' : 'NO', score: data.features.find(f=>f.name==='PORTED_RECENTLY')?.value ? 70 : 0, color:'#F59E0B' },
  ];
  const running = signals.slice(0, revealCount);
  const runTotal = running.reduce((s,x) => s+x.score, 0);
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 240px', gap:16 }}>
        <div>
          <div style={{ fontSize:11, color:'#64748B', marginBottom:8, fontWeight:600 }}>
            Signal Contributions (building live)
          </div>
          {running.map((s,i) => (
            <div key={i} className="stream-in" style={{
              display:'flex', justifyContent:'space-between', alignItems:'center',
              padding:'8px 12px', borderRadius:8, marginBottom:6,
              background: s.score > 0 ? '#FFFBEB' : '#F8FAFF',
              border: `1px solid ${s.score > 0 ? 'rgba(245,158,11,.25)' : '#DBEAFE'}`,
            }}>
              <span style={{ fontSize:12, color:'#334155' }}>{s.name}</span>
              <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                <span style={{ fontSize:12, fontWeight:600, color: s.score > 60 ? '#DC2626' : s.score > 0 ? '#D97706' : '#10B981' }}>
                  {s.value}
                </span>
                <span style={{
                  fontFamily:"'JetBrains Mono', monospace", fontSize:11, fontWeight:700,
                  color: s.score > 0 ? s.color : '#94A3B8',
                }}>
                  +{s.score}
                </span>
              </div>
            </div>
          ))}
        </div>
        <div>
          <div style={{ fontSize:11, color:'#64748B', marginBottom:8, fontWeight:600 }}>Running Total</div>
          <div style={{
            textAlign:'center', padding:'16px 12px',
            background: runTotal >= 160 ? '#FEF2F2' : runTotal >= 80 ? '#FFFBEB' : '#ECFDF5',
            border: `2px solid ${runTotal >= 160 ? '#EF4444' : runTotal >= 80 ? '#F59E0B' : '#10B981'}`,
            borderRadius:10,
          }}>
            <div style={{ fontSize:11, color:'#64748B', marginBottom:4 }}>TELECOM_RISK_SCORE</div>
            <div style={{
              fontSize:42, fontWeight:900, lineHeight:1,
              color: runTotal >= 160 ? '#DC2626' : runTotal >= 80 ? '#D97706' : '#059669',
              fontFamily:"'JetBrains Mono', monospace",
            }}>
              {Math.min(runTotal, 200)}
            </div>
            <div style={{ fontSize:11, color:'#94A3B8', marginTop:4 }}>/ 200</div>
            {runTotal >= 160 && (
              <div style={{
                marginTop:8, fontSize:11, fontWeight:700, color:'#DC2626',
                animation:'badge-pulse 1.2s ease-in-out infinite',
              }}>
                ⚡ FAST PATH TRIGGERS
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function L4Detail({ data, revealCount }: { data: ComputedData; revealCount: number }) {
  const shown = data.features.slice(0, revealCount);
  return (
    <div>
      <div style={{ fontSize:12, color:'#64748B', marginBottom:10 }}>
        Feature vector injecting new CipherGuard signals at Protectt.ai Step 2 — no model retraining required:
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
        {shown.map((f,i) => (
          <div key={i} className="stream-in" style={{
            padding:'8px 12px', borderRadius:8, fontSize:12,
            background: f.source==='L2' ? '#EFF6FF' : f.source==='L3' ? '#FFFBEB' : '#F8FAFF',
            border: `1px solid ${f.source==='L2' ? '#BFDBFE' : f.source==='L3' ? 'rgba(245,158,11,.25)' : '#E2E8F0'}`,
            display:'flex', justifyContent:'space-between', alignItems:'center', gap:8,
          }}>
            <span style={{
              fontFamily:"'JetBrains Mono', monospace", fontSize:11, color:'#334155',
            }}>
              {f.name}
            </span>
            <div style={{ display:'flex', gap:6, alignItems:'center', flexShrink:0 }}>
              <span style={{
                fontWeight:700,
                color: f.value === true ? '#059669' : f.value === false ? '#DC2626' : '#2563EB',
                fontSize:11, fontFamily:"'JetBrains Mono', monospace",
              }}>
                {f.value === true ? 'TRUE' : f.value === false ? 'FALSE' : String(f.value)}
              </span>
              <span style={{
                fontSize:9, padding:'1px 6px', borderRadius:8, fontWeight:600,
                background: f.source==='L2' ? '#DBEAFE' : f.source==='L3' ? 'rgba(245,158,11,.15)' : '#E2E8F0',
                color: f.source==='L2' ? '#1D4ED8' : f.source==='L3' ? '#92400E' : '#64748B',
              }}>
                {f.source}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function L5Detail({ data }: { data: ComputedData }) {
  const models = [
    { name:'LightGBM',        score:data.mlLgbm, color:'#2563EB', desc:'Tabular — SHAP per inference, <20ms P95' },
    { name:'LSTM',            score:data.mlLstm, color:'#7C3AED', desc:'Temporal — 50 events, 90s window' },
    { name:'GNN (GraphSAGE)', score:data.mlGnn,  color:'#0891B2', desc:'Graph — inductive, cross-bank edges' },
    { name:'Isolation Forest',score:data.mlIfo,  color:'#D97706', desc:'Anomaly — semi-supervised, 3σ' },
  ];
  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        {/* Model scores */}
        <div>
          <div style={{ fontSize:11, color:'#64748B', marginBottom:10, fontWeight:600 }}>
            Model Scores (0–200) — Parallel inference
          </div>
          {models.map(m => (
            <div key={m.name} style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12 }}>
                <span style={{ color:'#334155', fontWeight:600 }}>{m.name}</span>
                <span style={{ fontFamily:"'JetBrains Mono', monospace", fontWeight:700, color:m.color, fontSize:15 }}>
                  {m.score}
                </span>
              </div>
              <div className="score-bar-track">
                <div className="score-bar-fill fade-up" style={{ width:`${(m.score/200)*100}%`, background:m.color }} />
              </div>
              <div style={{ fontSize:10, color:'#94A3B8', marginTop:2 }}>{m.desc}</div>
            </div>
          ))}
          <div style={{
            padding:'10px 14px', borderRadius:8, marginTop:4,
            background:'#EFF6FF', border:'1px solid #BFDBFE',
            display:'flex', justifyContent:'space-between', alignItems:'center',
          }}>
            <span style={{ fontSize:13, color:'#334155', fontWeight:700 }}>Meta-model (Logistic Reg.)</span>
            <span style={{ fontSize:20, fontWeight:900, color:'#1D4ED8', fontFamily:"'JetBrains Mono', monospace" }}>
              {data.mlMeta}
            </span>
          </div>
        </div>
        {/* SHAP chart */}
        <div>
          <div style={{ fontSize:11, color:'#64748B', marginBottom:6, fontWeight:600 }}>
            SHAP Feature Importance (regulatory audit trail)
          </div>
          <SHAPChart shap={data.shap} />
        </div>
      </div>
    </div>
  );
}

function L6Detail({ data, barCount }: { data: ComputedData; barCount: number }) {
  const weights = [
    { label:'IMEI hash mismatch (L2)', weight:0.35, score: data.hashMatch?0:350, color:'#EF4444' },
    { label:'Telecom risk (L3)',        weight:0.20, score: Math.round(data.telecomScore), color:'#F59E0B' },
    { label:'ML ensemble (L5)',         weight:0.20, score: data.mlMeta, color:'#2563EB' },
    { label:'SIM ICCID change (L3)',    weight:0.15, score: data.features.find(f=>f.name==='ICCID_CHANGED')?.value ? 150 : 0, color:'#7C3AED' },
    { label:'Cross-bank device (L2)',   weight:0.10, score: data.features.find(f=>f.name==='CROSS_BANK_SEEN')?.value ? 100 : 0, color:'#0891B2' },
  ];
  const shown = weights.slice(0, barCount);
  const runScore = shown.reduce((s,w) => s+w.score, 0);
  const finalScore = barCount >= weights.length ? data.composite : Math.min(runScore, 1000);
  const dec = barCount >= weights.length ? data.decision : null;

  return (
    <div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16 }}>
        <div>
          <div style={{ fontSize:11, color:'#64748B', marginBottom:10, fontWeight:600 }}>
            Signal Weighting Matrix — filling bar by bar
          </div>
          {shown.map((w,i) => (
            <div key={i} className="stream-in fade-up" style={{ marginBottom:12 }}>
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4, fontSize:12 }}>
                <span style={{ color:'#334155' }}>{w.label}</span>
                <div style={{ display:'flex', gap:8 }}>
                  <span style={{ color:'#94A3B8' }}>{(w.weight*100).toFixed(0)}%</span>
                  <span style={{ fontWeight:700, color:w.color, fontFamily:"'JetBrains Mono', monospace" }}>
                    +{w.score}
                  </span>
                </div>
              </div>
              <div className="score-bar-track">
                <div className="score-bar-fill" style={{ width:`${(w.score/1000)*100}%`, background:w.color }} />
              </div>
            </div>
          ))}
        </div>
        {/* Running composite */}
        <div>
          <div style={{ fontSize:11, color:'#64748B', marginBottom:8, fontWeight:600 }}>
            Composite Score (0–1000)
          </div>
          <div style={{
            padding:'16px 14px', borderRadius:10, textAlign:'center',
            background: finalScore>=600 ? '#FEF2F2' : finalScore>=300 ? '#FFFBEB' : '#ECFDF5',
            border: `2px solid ${finalScore>=600 ? '#EF4444' : finalScore>=300 ? '#F59E0B' : '#10B981'}`,
            marginBottom: 12,
          }}>
            <div style={{ fontSize:11, color:'#64748B', marginBottom:4 }}>COMPOSITE</div>
            <div style={{
              fontSize:50, fontWeight:900, lineHeight:1,
              color: finalScore>=600 ? '#DC2626' : finalScore>=300 ? '#D97706' : '#059669',
              fontFamily:"'JetBrains Mono', monospace",
              animation: 'count-up .3s ease-out',
            }}>
              {finalScore}
            </div>
            <div style={{ fontSize:12, color:'#94A3B8', marginTop:4 }}>/ 1000</div>
          </div>

          {/* Decision bands */}
          <div style={{ display:'flex', borderRadius:8, overflow:'hidden', height:28, marginBottom:12 }}>
            <div style={{ flex:3, background:finalScore<300&&barCount>=5?'#2563EB':'#DBEAFE', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:finalScore<300&&barCount>=5?'#fff':'#64748B' }}>APPROVE</div>
            <div style={{ flex:3, background:finalScore>=300&&finalScore<600&&barCount>=5?'#F59E0B':'#FEF9C3', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:finalScore>=300&&finalScore<600&&barCount>=5?'#fff':'#92400E' }}>STEP-UP</div>
            <div style={{ flex:4, background:finalScore>=600&&barCount>=5?'#EF4444':'#FEE2E2', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:finalScore>=600&&barCount>=5?'#fff':'#DC2626' }}>BLOCK</div>
          </div>

          {dec && (
            <div className="stamp-in" style={{ textAlign:'center' }}>
              <div className={dec==='BLOCK'?'block-stamp':dec==='STEP-UP'?'stepup-stamp':'approve-stamp'}>
                {dec}
              </div>
              {data.fastPathAt && (
                <div style={{ fontSize:11, color:'#EF4444', fontWeight:600, marginTop:8 }}>
                  ⚡ Fast path: {data.fastPathReason}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Helper sub-components ── */
function InfoBox({ label, value, color, mono=false }: { label:string;value:string;color:string;mono?:boolean }) {
  return (
    <div style={{ padding:'6px 12px', borderRadius:8, background:'#F8FAFF', border:'1px solid #DBEAFE', fontSize:12 }}>
      <div style={{ color:'#94A3B8', fontSize:10, marginBottom:2 }}>{label}</div>
      <div style={{ color, fontWeight:700, fontFamily:mono?"'JetBrains Mono', monospace":undefined }}>{value}</div>
    </div>
  );
}
function HashRow({ label, hash, color }: { label:string;hash:string;color:string }) {
  return (
    <div style={{ marginBottom:6 }}>
      <div style={{ fontSize:10, color:'#94A3B8', marginBottom:2 }}>{label}</div>
      <div style={{ fontFamily:"'JetBrains Mono', monospace", fontSize:11, color, background:'#F8FAFF', border:'1px solid #E2E8F0', borderRadius:6, padding:'5px 8px', wordBreak:'break-all' }}>
        {hash.substring(0,32)}...
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════
   MAIN EXPORT: PipelineVisualization
════════════════════════════════════════════════════ */
const LAYER_LABELS = [
  { id:'l1', label:'L1: Device SDK',    icon:'📱' },
  { id:'l2', label:'L2: Blockchain',    icon:'⛓️' },
  { id:'l3', label:'L3: Telecom',       icon:'📡' },
  { id:'l4', label:'L4: Features',      icon:'🧩' },
  { id:'l5', label:'L5: ML Ensemble',   icon:'🤖' },
  { id:'l6', label:'L6: Decision',      icon:'⚖️' },
] as const;

export default function PipelineVisualization({
  trigger,
  inputs,
}: {
  trigger: number;
  inputs: PipelineInputs;
}) {
  const [layers, setLayers] = useState<LayerState>({ l1:'idle',l2:'idle',l3:'idle',l4:'idle',l5:'idle',l6:'idle' });
  const [currentDetail, setCurrentDetail] = useState<string | null>(null);
  const [data, setData]       = useState<ComputedData | null>(null);
  const [complete, setComplete] = useState(false);
  const [l1Lines, setL1Lines] = useState<string[]>([]);
  const [l2Step,  setL2Step]  = useState(0);
  const [l3Rev,   setL3Rev]   = useState(0);
  const [l4Rev,   setL4Rev]   = useState(0);
  const [l6Bar,   setL6Bar]   = useState(0);
  const abortRef = useRef(false);

  useEffect(() => {
    if (trigger === 0) return;
    abortRef.current = false;
    setComplete(false);
    setData(null);
    setL1Lines([]); setL2Step(0); setL3Rev(0); setL4Rev(0); setL6Bar(0);
    setLayers({ l1:'idle',l2:'idle',l3:'idle',l4:'idle',l5:'idle',l6:'idle' });
    setCurrentDetail(null);
    runPipeline();
    return () => { abortRef.current = true; };
  }, [trigger]); // eslint-disable-line react-hooks/exhaustive-deps

  async function runPipeline() {
    const d = computeData(inputs);
    setData(d);

    // ── L1 ──
    setLayers(s => ({...s, l1:'active'})); setCurrentDetail('l1');
    const raspLines = [
      'Root detection: PASS (RootBeer + /system/bin/su)',
      'Frida scan (/proc/self/maps): PASS',
      'Emulator detection (Build.FINGERPRINT): PASS',
      'Hardware attestation (TEE): PASS',
      'Clock drift check (NTP sync): PASS',
      `HMAC-SHA-256 computed → ${d.deviceHash.substring(0,12)}...`,
      'Raw IMEI zeroed [Arrays.fill() — compliance]',
    ];
    for (const l of raspLines) {
      if (abortRef.current) return;
      await delay(120);
      setL1Lines(p => [...p, l]);
    }
    await delay(200);
    setLayers(s => ({...s, l1:'done'}));

    // ── L2 ──
    setLayers(s => ({...s, l2:'active'})); setCurrentDetail('l2');
    for (let i=0; i<=4; i++) {
      if (abortRef.current) return;
      await delay(180);
      setL2Step(i);
    }
    await delay(150);

    if (!d.hashMatch) {
      setLayers(s => ({...s, l2:'fast', l3:'skipped', l4:'skipped', l5:'skipped', l6:'fast'}));
      setCurrentDetail('l6');
      // L6 fast path
      for (let i=1; i<=5; i++) {
        if (abortRef.current) return;
        await delay(150);
        setL6Bar(i);
      }
      await delay(300);
      setComplete(true);
      return;
    }
    setLayers(s => ({...s, l2:'done'}));

    // ── L3 ──
    setLayers(s => ({...s, l3:'active'})); setCurrentDetail('l3');
    for (let i=1; i<=5; i++) {
      if (abortRef.current) return;
      await delay(200);
      setL3Rev(i);
    }
    await delay(200);

    if (d.fastPathAt === 'l3') {
      setLayers(s => ({...s, l3:'fast', l4:'skipped', l5:'skipped', l6:'fast'}));
      setCurrentDetail('l6');
      for (let i=1; i<=5; i++) {
        if (abortRef.current) return;
        await delay(150);
        setL6Bar(i);
      }
      await delay(300);
      setComplete(true);
      return;
    }
    setLayers(s => ({...s, l3:'done'}));

    // ── L4 ──
    setLayers(s => ({...s, l4:'active'})); setCurrentDetail('l4');
    for (let i=1; i<=d.features.length; i++) {
      if (abortRef.current) return;
      await delay(120);
      setL4Rev(i);
    }
    await delay(200);
    setLayers(s => ({...s, l4:'done'}));

    // ── L5 ──
    setLayers(s => ({...s, l5:'active'})); setCurrentDetail('l5');
    await delay(800); // Model inference time
    setLayers(s => ({...s, l5:'done'}));

    // ── L6 ──
    setLayers(s => ({...s, l6:'active'})); setCurrentDetail('l6');
    for (let i=1; i<=5; i++) {
      if (abortRef.current) return;
      await delay(220);
      setL6Bar(i);
    }
    await delay(300);
    setComplete(true);
  }

  if (trigger === 0 && !complete) return null;

  return (
    <div style={{ marginTop:24 }}>
      {/* Pipeline header */}
      <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between',
        marginBottom:16, paddingBottom:12,
        borderBottom:'1px solid #DBEAFE',
      }}>
        <div>
          <div style={{ fontWeight:800, fontSize:18, color:'#0F172A' }}>
            🔄 Live Pipeline Processing
          </div>
          <div style={{ fontSize:12, color:'#64748B', marginTop:2 }}>
            Six-layer fraud detection stack executing in real time
          </div>
        </div>
        {complete && data && (
          <div style={{
            padding:'6px 16px', borderRadius:20,
            background: data.decision==='BLOCK' ? '#FEF2F2' : data.decision==='STEP-UP' ? '#FFFBEB' : '#ECFDF5',
            border: `1px solid ${data.decision==='BLOCK' ? '#FCA5A5' : data.decision==='STEP-UP' ? '#FDE68A' : '#6EE7B7'}`,
            fontSize:13, fontWeight:700,
            color: data.decision==='BLOCK' ? '#DC2626' : data.decision==='STEP-UP' ? '#D97706' : '#059669',
          }}>
            {data.decision} · {data.latency}ms · Score: {data.composite}/1000
          </div>
        )}
      </div>

      {/* Flow diagram */}
      <div style={{ display:'flex', alignItems:'stretch', gap:4, marginBottom:16, overflow:'auto', paddingBottom:4 }}>
        {LAYER_LABELS.map((l, i) => {
          const status = layers[l.id as keyof LayerState];
          const isActive = currentDetail === l.id;
          return (
            <div key={l.id} style={{ display:'flex', alignItems:'center', flex:1, minWidth:0, gap:4 }}>
              <div
                className={`pipeline-layer${status==='active'?' active':status==='done'?' done':status==='skipped'?' skipped':status==='fast'?' fast-path':''}`}
                onClick={() => status!=='idle' && setCurrentDetail(l.id)}
                style={{ cursor: status!=='idle' ? 'pointer' : 'default' }}
              >
                <div style={{ fontSize:16, marginBottom:2 }}>{l.icon}</div>
                <div style={{ fontSize:10, fontWeight:700, color:
                  status==='active' ? '#1D4ED8' : status==='done' ? '#059669' :
                  status==='fast' ? '#DC2626' : status==='skipped' ? '#94A3B8' : '#334155',
                  lineHeight:1.2,
                }}>
                  {l.label.split(':')[0]}
                </div>
                <div style={{ fontSize:9, color:'#94A3B8', marginTop:1 }}>{l.label.split(':')[1]}</div>
                {status==='active' && <div className="spinner" style={{ margin:'4px auto 0' }} />}
                {status==='done'   && <div style={{ fontSize:12, color:'#10B981', marginTop:3 }}>✓</div>}
                {status==='fast'   && <div style={{ fontSize:12, color:'#EF4444', marginTop:3 }}>⚡</div>}
                {status==='skipped'&& <div style={{ fontSize:11, color:'#94A3B8', marginTop:3 }}>—</div>}
              </div>
              {i < LAYER_LABELS.length - 1 && (
                <div className={`pipeline-arrow${status==='fast'?' fast':''}`}>
                  {layers[`l${i+2}` as keyof LayerState]==='skipped' ? '⇢' : '›'}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Fast path line */}
      {data && (data.fastPathAt === 'l2' || data.fastPathAt === 'l3') && !layers.l3.includes('idle') && (
        <div className="fade-up" style={{
          margin:'0 0 12px',
          padding:'8px 16px',
          background:'#FEF2F2',
          border:'1px solid #FCA5A5',
          borderRadius:8,
          fontSize:12,
          color:'#DC2626',
          fontWeight:600,
          display:'flex', alignItems:'center', gap:8,
        }}>
          <span style={{ fontSize:16 }}>⚡</span>
          <span>FAST PATH at {data.fastPathAt.toUpperCase()}: {data.fastPathReason}</span>
          <span style={{ marginLeft:'auto', color:'#94A3B8', fontWeight:400 }}>
            {data.fastPathAt==='l2' ? 'L3, L4, L5' : 'L4, L5'} ML queue bypassed → direct to BLOCK
          </span>
        </div>
      )}

      {/* Layer detail panel */}
      {currentDetail && data && (
        <div className="layer-detail fade-up" style={{ marginBottom:16 }}>
          <div style={{ fontWeight:700, color:'#0F172A', fontSize:15, marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
            {LAYER_LABELS.find(l=>l.id===currentDetail)?.icon}
            {LAYER_LABELS.find(l=>l.id===currentDetail)?.label}
            <div className="spinner" style={{ marginLeft:4, display:
              layers[currentDetail as keyof LayerState]==='active'?'block':'none',
            }} />
          </div>
          {currentDetail==='l1' && <L1Detail data={data} lines={l1Lines} />}
          {currentDetail==='l2' && <L2Detail data={data} step={l2Step} />}
          {currentDetail==='l3' && <L3Detail data={data} revealCount={l3Rev} />}
          {currentDetail==='l4' && <L4Detail data={data} revealCount={l4Rev} />}
          {currentDetail==='l5' && <L5Detail data={data} />}
          {currentDetail==='l6' && <L6Detail data={data} barCount={l6Bar} />}
        </div>
      )}

      {/* GNN Graph (after complete) */}
      {complete && data && <GNNGraph data={data} />}

      {/* Final score card */}
      {complete && data && (
        <div className={`cg-card${data.decision==='BLOCK'?' cg-card-danger':data.decision==='STEP-UP'?' cg-card-warning':' cg-card-success'} fade-up`} style={{ marginTop:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
            <div>
              <div style={{ fontSize:12, color:'#64748B', marginBottom:4 }}>Final Composite Score</div>
              <div style={{ display:'flex', alignItems:'baseline', gap:8 }}>
                <span style={{
                  fontSize:56, fontWeight:900, lineHeight:1,
                  fontFamily:"'JetBrains Mono', monospace",
                  color: data.decision==='BLOCK'?'#DC2626':data.decision==='STEP-UP'?'#D97706':'#059669',
                }}>
                  {data.composite}
                </span>
                <span style={{ fontSize:18, color:'#94A3B8' }}>/1000</span>
              </div>
              <div style={{ fontSize:12, color:'#94A3B8', marginTop:4 }}>
                Latency: <strong style={{ color:'#2563EB' }}>{data.latency}ms</strong>
                {data.fastPathAt && <span style={{ color:'#EF4444', marginLeft:8 }}>⚡ fast path</span>}
              </div>
            </div>
            <div className="stamp-in">
              <div className={data.decision==='BLOCK'?'block-stamp':data.decision==='STEP-UP'?'stepup-stamp':'approve-stamp'}>
                {data.decision}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }
