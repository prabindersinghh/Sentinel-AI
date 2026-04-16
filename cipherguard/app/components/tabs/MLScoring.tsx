'use client';

import { useState } from 'react';
import { generateMLEnsembleScore } from '../../lib/ml';

interface MLScore {
  lgbmScore: number;
  lstmScore: number;
  gnnScore: number;
  ifoScore: number;
  baseScore: number;
  shap: {
    feature: string;
    contribution: number;
    impact: string;
  }[];
  features: {
    name: string;
    value: number | boolean | string;
    type: string;
  }[];
}

export default function MLScoring() {
  const [score, setScore] = useState<MLScore | null>(null);
  const [loading, setLoading] = useState(false);
  const [scenario, setScenario] = useState<'normal' | 'mule' | 'social-eng'>('normal');

  const generateScore = async () => {
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    const newScore = generateMLEnsembleScore(scenario);
    setScore(newScore);
    setLoading(false);
  };

  const scenarios = [
    { id: 'normal', label: '✓ Normal Transaction', desc: 'Standard user behavior' },
    { id: 'mule', label: '⚠️ Mule Network', desc: 'Multi-bank suspicious pattern' },
    { id: 'social-eng', label: '🔴 Social Engineering', desc: 'Real-time screen share detected' },
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">L5: ML Ensemble Scoring</h2>
        <p className="text-gray-300">
          4-model ensemble with SHAP interpretation (LightGBM + LSTM + GNN + Isolation Forest)
        </p>
      </div>

      {/* Scenario Selection */}
      <div className="bg-slate-700 rounded-lg p-6 border border-purple-500/20">
        <label className="block text-white font-semibold mb-4">Select Test Scenario:</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {scenarios.map((s: any) => (
            <button
              key={s.id}
              onClick={() => setScenario(s.id)}
              className={`py-4 px-4 rounded-lg transition-all text-left ${
                scenario === s.id
                  ? 'bg-purple-600 text-white border border-purple-400'
                  : 'bg-slate-600 text-gray-300 hover:bg-slate-500 border border-slate-500'
              }`}
            >
              <div className="font-semibold">{s.label}</div>
              <div className="text-sm opacity-75 mt-1">{s.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateScore}
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 transition-all"
      >
        {loading ? '🔄 Computing ensemble score...' : '🤖 Compute ML Ensemble Score'}
      </button>

      {/* Results */}
      {score && (
        <div className="space-y-6">
          {/* Base Score */}
          <div className="bg-slate-700 rounded-lg p-6 border border-blue-500/30">
            <div className="text-center mb-6">
              <div className="text-gray-400 text-sm uppercase mb-2">Ensemble Base Score</div>
              <div className="text-6xl font-bold text-blue-400 mb-2">{score.baseScore}</div>
              <div className="text-gray-400">Out of 200</div>
            </div>

            {/* Model Scores */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-slate-600 rounded p-3 text-center">
                <div className="text-xs text-gray-400 uppercase mb-2">LightGBM</div>
                <div className="text-2xl font-bold text-cyan-400">{score.lgbmScore}</div>
              </div>
              <div className="bg-slate-600 rounded p-3 text-center">
                <div className="text-xs text-gray-400 uppercase mb-2">LSTM</div>
                <div className="text-2xl font-bold text-purple-400">{score.lstmScore}</div>
              </div>
              <div className="bg-slate-600 rounded p-3 text-center">
                <div className="text-xs text-gray-400 uppercase mb-2">GNN (GraphSAGE)</div>
                <div className="text-2xl font-bold text-green-400">{score.gnnScore}</div>
              </div>
              <div className="bg-slate-600 rounded p-3 text-center">
                <div className="text-xs text-gray-400 uppercase mb-2">Isolation Forest</div>
                <div className="text-2xl font-bold text-yellow-400">{score.ifoScore}</div>
              </div>
            </div>
          </div>

          {/* Input Features */}
          <div className="bg-slate-700 rounded-lg p-6 border border-purple-500/30">
            <h3 className="text-lg font-bold text-purple-400 mb-4">📊 Input Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {score.features.map((feat, idx) => (
                <div key={idx} className="bg-slate-600 rounded p-3">
                  <div className="text-gray-400 text-xs uppercase">{feat.name}</div>
                  <div className="text-white font-semibold mt-1">
                    {typeof feat.value === 'boolean' ? (feat.value ? '✓ TRUE' : '✗ FALSE') : feat.value}
                  </div>
                  <div className="text-gray-500 text-xs mt-1">{feat.type}</div>
                </div>
              ))}
            </div>
          </div>

          {/* SHAP Interpretation */}
          <div className="bg-slate-700 rounded-lg p-6 border border-green-500/30">
            <h3 className="text-lg font-bold text-green-400 mb-4">🔍 SHAP Feature Importance</h3>
            <div className="space-y-3">
              {score.shap.map((item, idx) => (
                <div key={idx} className="bg-slate-600 rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-300 font-semibold">{item.feature}</span>
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      item.impact === 'HIGH' ? 'bg-red-900 text-red-400' :
                      item.impact === 'MEDIUM' ? 'bg-yellow-900 text-yellow-400' :
                      'bg-green-900 text-green-400'
                    }`}>
                      {item.impact}
                    </span>
                  </div>
                  <div className="bg-slate-500 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
                      style={{ width: `${Math.min((item.contribution / 200) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-400 mt-1">Contribution: +{item.contribution}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Model Architecture */}
          <div className="bg-slate-700 rounded-lg p-6 border border-indigo-500/30">
            <h3 className="text-lg font-bold text-indigo-400 mb-4">🏗️ Model Architecture</h3>
            <div className="space-y-4 text-sm">
              <div className="border-l-4 border-cyan-500 pl-4">
                <div className="text-cyan-400 font-bold">LightGBM (Primary Tabular)</div>
                <div className="text-gray-400 mt-1">
                  Class weight 1:500 • SHAP per inference • &lt;20ms P95
                </div>
              </div>
              <div className="border-l-4 border-purple-500 pl-4">
                <div className="text-purple-400 font-bold">LSTM (Temporal Behavioral)</div>
                <div className="text-gray-400 mt-1">
                  Sequence 50 events max • 90s sliding window
                </div>
              </div>
              <div className="border-l-4 border-green-500 pl-4">
                <div className="text-green-400 font-bold">GNN (Mule Detection)</div>
                <div className="text-gray-400 mt-1">
                  GraphSAGE/GAT inductive • CROSS_BANK_SEEN edges • 15min embedding refresh
                </div>
              </div>
              <div className="border-l-4 border-yellow-500 pl-4">
                <div className="text-yellow-400 font-bold">Isolation Forest (Anomaly)</div>
                <div className="text-gray-400 mt-1">
                  Semi-supervised • Fires at 3σ deviation
                </div>
              </div>
            </div>
          </div>

          {/* Federated Learning */}
          <div className="bg-slate-700 rounded-lg p-6 border border-orange-500/30">
            <h3 className="text-lg font-bold text-orange-400 mb-4">🌐 Federated Learning (FedAvg)</h3>
            <div className="space-y-3 text-sm">
              <div className="bg-slate-600 rounded p-3">
                <div className="text-orange-300 font-mono">
                  F(w) = Σ_k (n_k/n) F_k(w)
                </div>
                <div className="text-gray-400 mt-2">
                  Each bank k holds local dataset D_k. Sensitive data NEVER leaves institutional firewalls.
                  Global model aggregation via FedAvg at central server.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
