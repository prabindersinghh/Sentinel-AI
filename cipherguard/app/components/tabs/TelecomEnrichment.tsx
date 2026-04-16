'use client';

import { useState } from 'react';
import { generateTelecomSignals } from '../../lib/telecom';

interface TelecomSignals {
  inboundCalls: number;
  callScore: number;
  screenShare: boolean;
  clipboardVPA: boolean;
  simIccidChange: boolean;
  numberPorting: boolean;
  portingScore: number;
  totalScore: number;
  riskLevel: string;
}

export default function TelecomEnrichment() {
  const [signals, setSignals] = useState<TelecomSignals | null>(null);
  const [loading, setLoading] = useState(false);
  const [windowSize, setWindowSize] = useState<'15min' | '24h'>('15min');

  const generateSignals = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const newSignals = generateTelecomSignals(windowSize);
    setSignals(newSignals);
    setLoading(false);
  };

  const getRiskColor = (score: number) => {
    if (score >= 160) return 'text-red-400';
    if (score >= 100) return 'text-yellow-400';
    return 'text-green-400';
  };

  const getRiskBg = (score: number) => {
    if (score >= 160) return 'bg-red-900/20 border-red-500/50';
    if (score >= 100) return 'bg-yellow-900/20 border-yellow-500/50';
    return 'bg-green-900/20 border-green-500/50';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">L3: Telecom Context Enrichment</h2>
        <p className="text-gray-300">
          Real-time SIM context via CAMARA APIs + bilateral MNO signals
        </p>
      </div>

      {/* Configuration */}
      <div className="bg-slate-700 rounded-lg p-6 border border-purple-500/20">
        <label className="block text-white font-semibold mb-4">Analysis Window:</label>
        <div className="grid grid-cols-2 gap-4">
          {(['15min', '24h'] as const).map((w) => (
            <button
              key={w}
              onClick={() => setWindowSize(w)}
              className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                windowSize === w
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
              }`}
            >
              {w === '15min' ? '⏱️ Last 15 minutes' : '📅 Last 24 hours'}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateSignals}
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 transition-all"
      >
        {loading ? '🔄 Fetching signals...' : '📡 Fetch Telecom Signals'}
      </button>

      {/* Results */}
      {signals && (
        <div className="space-y-6">
          {/* Risk Score */}
          <div className={`rounded-lg p-6 border ${getRiskBg(signals.totalScore)}`}>
            <div className="text-center">
              <div className="text-gray-400 text-sm uppercase mb-2">Telecom Risk Score</div>
              <div className={`text-5xl font-bold ${getRiskColor(signals.totalScore)} mb-2`}>
                {signals.totalScore}
              </div>
              <div className="text-white text-lg font-semibold">{signals.riskLevel}</div>
              {signals.totalScore >= 160 && (
                <div className="text-red-300 text-sm mt-3">
                  ⚠️ Fast-path BLOCK triggered (score ≥160)
                </div>
              )}
            </div>
          </div>

          {/* Signal Breakdown */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Inbound Calls */}
            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-300 font-semibold">📞 Inbound Calls (15min)</span>
                <span className="text-2xl font-bold text-cyan-400">{signals.inboundCalls}</span>
              </div>
              <div className="bg-slate-600 rounded p-2 text-sm text-gray-400">
                {signals.inboundCalls >= 6
                  ? '⚠️ ≥6 calls: +80 score'
                  : signals.inboundCalls >= 3
                  ? '⚠️ ≥3 calls: +40 score'
                  : '✓ Normal'}
              </div>
            </div>

            {/* Screen Share */}
            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-300 font-semibold">🖥️ Screen Share Active</span>
                <span className={`text-2xl font-bold ${signals.screenShare ? 'text-red-400' : 'text-green-400'}`}>
                  {signals.screenShare ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="bg-slate-600 rounded p-2 text-sm text-gray-400">
                {signals.screenShare ? '🚨 CRITICAL: +100 score' : '✓ Safe'}
              </div>
            </div>

            {/* Clipboard VPA */}
            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-300 font-semibold">📋 VPA Clipboard Injected</span>
                <span className={`text-2xl font-bold ${signals.clipboardVPA ? 'text-red-400' : 'text-green-400'}`}>
                  {signals.clipboardVPA ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="bg-slate-600 rounded p-2 text-sm text-gray-400">
                {signals.clipboardVPA ? '⚠️ Non-app source: +60 score' : '✓ Safe'}
              </div>
            </div>

            {/* SIM ICCID Change */}
            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-300 font-semibold">🔄 SIM ICCID Changed</span>
                <span className={`text-2xl font-bold ${signals.simIccidChange ? 'text-red-400' : 'text-green-400'}`}>
                  {signals.simIccidChange ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="bg-slate-600 rounded p-2 text-sm text-gray-400">
                {signals.simIccidChange ? '🚨 CRITICAL: +80 score (SIM Swap indicator)' : '✓ Safe'}
              </div>
            </div>

            {/* Number Porting */}
            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <div className="flex items-center justify-between mb-3">
                <span className="text-gray-300 font-semibold">📱 Number Ported (72h)</span>
                <span className={`text-2xl font-bold ${signals.numberPorting ? 'text-red-400' : 'text-green-400'}`}>
                  {signals.numberPorting ? 'YES' : 'NO'}
                </span>
              </div>
              <div className="bg-slate-600 rounded p-2 text-sm text-gray-400">
                {signals.numberPorting ? '⚠️ Within 72h: +70 score' : '✓ Safe'}
              </div>
            </div>

            {/* Score Breakdown */}
            <div className="bg-slate-700 rounded-lg p-4 border border-slate-600">
              <div className="text-gray-300 font-semibold mb-3">📊 Score Breakdown</div>
              <div className="space-y-1 text-sm font-mono">
                <div className="text-gray-400">Calls: <span className="text-cyan-400">+{signals.callScore}</span></div>
                <div className="text-gray-400">Screen: <span className="text-cyan-400">+{signals.screenShare ? 100 : 0}</span></div>
                <div className="text-gray-400">Porting: <span className="text-cyan-400">+{signals.portingScore}</span></div>
                <div className="flex justify-between mt-2 pt-2 border-t border-slate-500">
                  <span className="text-white font-bold">Total:</span>
                  <span className={getRiskColor(signals.totalScore)}>{signals.totalScore}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="bg-slate-700 rounded-lg p-6 border border-indigo-500/30">
            <h3 className="text-lg font-bold text-indigo-400 mb-4">⚠️ Risk Assessment</h3>
            <div className="space-y-3">
              {signals.totalScore >= 160 ? (
                <div className="text-red-400">
                  <div className="font-bold mb-2">🔴 FAST-PATH BLOCK TRIGGERED</div>
                  <div className="text-sm text-gray-300">
                    Telecom risk score ≥160 triggers immediate block regardless of device hash match
                  </div>
                </div>
              ) : signals.totalScore >= 100 ? (
                <div className="text-yellow-400">
                  <div className="font-bold mb-2">🟡 ELEVATED RISK</div>
                  <div className="text-sm text-gray-300">
                    Consider step-up authentication or additional verification
                  </div>
                </div>
              ) : (
                <div className="text-green-400">
                  <div className="font-bold mb-2">🟢 NORMAL RISK</div>
                  <div className="text-sm text-gray-300">
                    Telecom signals nominal — proceed with standard ML scoring
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MNO Integration */}
          <div className="bg-slate-700 rounded-lg p-6 border border-blue-500/30">
            <h3 className="text-lg font-bold text-blue-400 mb-4">📡 MNO Integration Tiers</h3>
            <div className="space-y-3">
              <div className="border border-blue-500/30 rounded p-3">
                <div className="text-blue-400 font-semibold text-sm">Tier 1 — CAMARA SNA (Available Now)</div>
                <div className="text-gray-400 text-sm mt-1">
                  Binary SIM presence verification via Jio, Airtel, Vi ecosystems
                </div>
              </div>
              <div className="border border-purple-500/30 rounded p-3">
                <div className="text-purple-400 font-semibold text-sm">Tier 2 — Bilateral (Competitive Moat)</div>
                <div className="text-gray-400 text-sm mt-1">
                  Call volume CDR, porting events, SIM reuse, ICCID history — PRIMARY DIFFERENTIATOR
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
