'use client';

import { useState } from 'react';
import { computeCompositeScore } from '../../lib/riskdecision';

interface RiskDecisionData {
  transactionId: string;
  amount: number;
  amountBand: string;
  hashMismatch: boolean;
  telecomScore: number;
  mlScore: number;
  iccidChanged: boolean;
  crossBankSeen: boolean;
  compositeScore: number;
  decision: 'APPROVE' | 'STEP-UP' | 'BLOCK';
  riskBand: string;
  fastPathTrigger: string | null;
  breakdown: {
    label: string;
    value: number;
    weight: number;
  }[];
  actions: string[];
}

export default function RiskDecision() {
  const [data, setData] = useState<RiskDecisionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [testAmount, setTestAmount] = useState('5000');
  const [triggers, setTriggers] = useState({
    hashMismatch: false,
    screenShare: false,
    recentPort: false,
    telecomRisk: false,
    muleBlocklist: false,
  });

  const computeDecision = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 600));
    const decision = computeCompositeScore(
      Number(testAmount),
      triggers
    );
    setData(decision);
    setLoading(false);
  };

  const getDecisionColor = (decision: string) => {
    switch (decision) {
      case 'APPROVE':
        return 'text-green-400';
      case 'STEP-UP':
        return 'text-yellow-400';
      case 'BLOCK':
        return 'text-red-400';
      default:
        return 'text-white';
    }
  };

  const getDecisionBg = (decision: string) => {
    switch (decision) {
      case 'APPROVE':
        return 'bg-green-900/20 border-green-500/50';
      case 'STEP-UP':
        return 'bg-yellow-900/20 border-yellow-500/50';
      case 'BLOCK':
        return 'bg-red-900/20 border-red-500/50';
      default:
        return 'bg-slate-700 border-slate-600';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">L6: Composite Risk Decision</h2>
        <p className="text-gray-300">
          Unified scoring matrix combining blockchain (L2), telecom (L3), and ML (L5) signals
        </p>
      </div>

      {/* Transaction Configuration */}
      <div className="bg-slate-700 rounded-lg p-6 border border-purple-500/20">
        <h3 className="text-lg font-bold text-white mb-4">⚙️ Simulate Transaction</h3>
        
        <div className="mb-6">
          <label className="block text-gray-300 font-semibold mb-2">Transaction Amount (INR):</label>
          <input
            type="number"
            value={testAmount}
            onChange={(e) => setTestAmount(e.target.value)}
            className="w-full bg-slate-600 text-white rounded px-4 py-2 border border-slate-500 focus:border-purple-500 focus:outline-none"
          />
          <div className="text-gray-400 text-xs mt-2">
            Band: {Number(testAmount) < 1000 ? 'LOW' : Number(testAmount) < 10000 ? 'MEDIUM' : Number(testAmount) < 100000 ? 'HIGH' : 'VERY_HIGH'}
          </div>
        </div>

        {/* Risk Triggers */}
        <div>
          <label className="block text-gray-300 font-semibold mb-3">Risk Triggers:</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Object.entries(triggers).map(([key, value]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) =>
                    setTriggers(prev => ({ ...prev, [key]: e.target.checked }))
                  }
                  className="w-4 h-4 rounded"
                />
                <span className="text-gray-300 text-sm">
                  {key === 'hashMismatch' ? '🔴 Hash Mismatch (L2)' :
                   key === 'screenShare' ? '🖥️ Screen Share Active (L3)' :
                   key === 'recentPort' ? '📱 Recently Ported (L3)' :
                   key === 'telecomRisk' ? '⚠️ High Telecom Risk ≥160 (L3)' :
                   '🔗 Mule Blocklist Match (L2)'}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Compute Button */}
      <button
        onClick={computeDecision}
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 transition-all"
      >
        {loading ? '⏳ Computing decision...' : '⚖️ Compute Risk Decision'}
      </button>

      {/* Results */}
      {data && (
        <div className="space-y-6">
          {/* Decision Banner */}
          <div className={`rounded-lg p-8 border ${getDecisionBg(data.decision)}`}>
            <div className="text-center">
              <div className="text-gray-400 text-sm uppercase mb-2">Final Decision</div>
              <div className={`text-6xl font-bold ${getDecisionColor(data.decision)} mb-4`}>
                {data.decision === 'APPROVE' ? '✓' : data.decision === 'STEP-UP' ? '⚠️' : '🔴'}
                {' '}
                {data.decision}
              </div>
              <div className="text-gray-300 text-lg">Composite Score: <span className={`font-bold ${getDecisionColor(data.decision)}`}>{data.compositeScore}/1000</span></div>
              {data.fastPathTrigger && (
                <div className="text-orange-300 text-sm mt-3 font-semibold">
                  ⚡ Fast-path triggered: {data.fastPathTrigger}
                </div>
              )}
            </div>
          </div>

          {/* Composite Score Breakdown */}
          <div className="bg-slate-700 rounded-lg p-6 border border-blue-500/30">
            <h3 className="text-lg font-bold text-blue-400 mb-4">📊 Scoring Matrix Breakdown</h3>
            <div className="space-y-4">
              {data.breakdown.map((item, idx) => {
                const percentage = (item.value / 1000) * 100;
                return (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-gray-300">
                        {item.label}
                        <span className="text-gray-500 text-xs ml-2">({(item.weight * 100).toFixed(0)}% weight)</span>
                      </span>
                      <span className="text-white font-bold">{item.value.toFixed(0)}</span>
                    </div>
                    <div className="bg-slate-600 rounded-full h-2 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-orange-500"
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              <div className="flex justify-between pt-4 border-t border-slate-500">
                <span className="text-white font-bold">Total:</span>
                <span className={`text-2xl font-bold ${getDecisionColor(data.decision)}`}>
                  {data.compositeScore}
                </span>
              </div>
            </div>
          </div>

          {/* Decision Bands */}
          <div className="bg-slate-700 rounded-lg p-6 border border-indigo-500/30">
            <h3 className="text-lg font-bold text-indigo-400 mb-4">📏 Decision Bands</h3>
            <div className="space-y-3">
              <div className={`p-4 rounded border ${data.compositeScore < 300 ? 'bg-green-900/30 border-green-500' : 'bg-slate-600 border-slate-500'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-green-400">0–299: APPROVE</span>
                  <span className="text-sm text-gray-400">Proceed immediately</span>
                </div>
              </div>
              <div className={`p-4 rounded border ${data.compositeScore >= 300 && data.compositeScore < 600 ? 'bg-yellow-900/30 border-yellow-500' : 'bg-slate-600 border-slate-500'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-yellow-400">300–599: STEP-UP</span>
                  <span className="text-sm text-gray-400">Biometric or Silent Network Auth</span>
                </div>
              </div>
              <div className={`p-4 rounded border ${data.compositeScore >= 600 ? 'bg-red-900/30 border-red-500' : 'bg-slate-600 border-slate-500'}`}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-red-400">600–1000: BLOCK</span>
                  <span className="text-sm text-gray-400">Immediate fraud alert</span>
                </div>
              </div>
            </div>
          </div>

          {/* Signal Contributions */}
          <div className="bg-slate-700 rounded-lg p-6 border border-purple-500/30">
            <h3 className="text-lg font-bold text-purple-400 mb-4">🎯 Signal Contributions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="bg-slate-600 rounded p-3">
                <div className="text-gray-400 mb-2">IMEI Hash Mismatch (L2)</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {data.breakdown[0].value.toFixed(0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Weight: 35%</div>
              </div>
              <div className="bg-slate-600 rounded p-3">
                <div className="text-gray-400 mb-2">Telecom Risk (L3)</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {data.breakdown[1].value.toFixed(0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Weight: 20%</div>
              </div>
              <div className="bg-slate-600 rounded p-3">
                <div className="text-gray-400 mb-2">ML Ensemble (L5)</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {data.breakdown[2].value.toFixed(0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Weight: 20%</div>
              </div>
              <div className="bg-slate-600 rounded p-3">
                <div className="text-gray-400 mb-2">ICCID Change + Cross-Bank (L2/L3)</div>
                <div className="text-2xl font-bold text-cyan-400">
                  {(data.breakdown[3].value + (data.breakdown[4]?.value || 0)).toFixed(0)}
                </div>
                <div className="text-xs text-gray-500 mt-1">Weight: 25%</div>
              </div>
            </div>
          </div>

          {/* System Actions */}
          <div className="bg-slate-700 rounded-lg p-6 border border-orange-500/30">
            <h3 className="text-lg font-bold text-orange-400 mb-4">🚀 Automated Response Actions</h3>
            <div className="space-y-2">
              {data.actions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-3 text-sm">
                  <span className="text-orange-400 font-bold">→</span>
                  <span className="text-gray-300">{action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* SLAs */}
          <div className="bg-slate-700 rounded-lg p-6 border border-green-500/30">
            <h3 className="text-lg font-bold text-green-400 mb-4">⏱️ Performance SLAs</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex justify-between bg-slate-600 rounded p-3">
                <span className="text-gray-400">Full-path decision</span>
                <span className="text-green-400 font-bold">&lt;180ms P95</span>
              </div>
              <div className="flex justify-between bg-slate-600 rounded p-3">
                <span className="text-gray-400">Hard limit</span>
                <span className="text-green-400 font-bold">&lt;300ms P99</span>
              </div>
              <div className="flex justify-between bg-slate-600 rounded p-3">
                <span className="text-gray-400">Blockchain TPS</span>
                <span className="text-green-400 font-bold">5K sustained</span>
              </div>
              <div className="flex justify-between bg-slate-600 rounded p-3">
                <span className="text-gray-400">Fast-path BLOCK</span>
                <span className="text-green-400 font-bold">&lt;80ms to webhook</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
