'use client';

import { useState } from 'react';
import { registerDeviceOnBlockchain, simulateBlockchainEvents } from '../../lib/blockchain';

interface BlockchainEntry {
  transactionId: string;
  eventType: string;
  deviceHash: string;
  customerPseudonym: string;
  timestamp: string;
  riskFlags: string[];
  status: string;
  gasUsed: number;
}

export default function BlockchainLedger() {
  const [entries, setEntries] = useState<BlockchainEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<BlockchainEntry | null>(null);

  const registerDevice = async () => {
    setLoading(true);
    setEvents([]);
    const newEntry = registerDeviceOnBlockchain();
    await new Promise(r => setTimeout(r, 1200)); // Simulate consensus
    setEntries(prev => [newEntry, ...prev]);
    setLoading(false);
  };

  const triggerMismatchDetector = async () => {
    setLoading(true);
    setEvents([]);
    const blockchainEvents = simulateBlockchainEvents('MISMATCH');
    
    for (const event of blockchainEvents) {
      await new Promise(r => setTimeout(r, 400));
      setEvents(prev => [...prev, event]);
    }

    const newEntry = registerDeviceOnBlockchain();
    newEntry.eventType = 'TRANSACTION_INIT + MISMATCH_DETECTED';
    newEntry.riskFlags = ['HASH_MISMATCH', 'HIGH_CONFIDENCE'];
    newEntry.status = 'BLOCKED';
    setEntries(prev => [newEntry, ...prev]);
    setLoading(false);
  };

  const triggerMuleDetector = async () => {
    setLoading(true);
    setEvents([]);
    const blockchainEvents = simulateBlockchainEvents('MULE');
    
    for (const event of blockchainEvents) {
      await new Promise(r => setTimeout(r, 400));
      setEvents(prev => [...prev, event]);
    }

    const newEntry = registerDeviceOnBlockchain();
    newEntry.eventType = 'MULE_DEVICE_ALERT';
    newEntry.riskFlags = ['MULE_SUSPECTED', 'CROSS_BANK_SEEN'];
    newEntry.status = 'UNDER_CONSORTIUM_REVIEW';
    setEntries(prev => [newEntry, ...prev]);
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">L2: Hyperledger Fabric Blockchain</h2>
        <p className="text-gray-300">
          Hardware-anchor device identity via permissioned blockchain shared across banks
        </p>
      </div>

      {/* Network Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-700 rounded-lg p-4 border border-blue-500/30">
          <div className="text-blue-400 text-sm font-semibold">Throughput</div>
          <div className="text-white text-2xl font-bold mt-2">5,000 TPS</div>
          <div className="text-gray-400 text-xs mt-1">Sustained / 10K burst</div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4 border border-green-500/30">
          <div className="text-green-400 text-sm font-semibold">Finality</div>
          <div className="text-white text-2xl font-bold mt-2">&lt;1s</div>
          <div className="text-gray-400 text-xs mt-1">Deterministic (BFT)</div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4 border border-purple-500/30">
          <div className="text-purple-400 text-sm font-semibold">Consensus</div>
          <div className="text-white text-2xl font-bold mt-2">BFT-SMaRt</div>
          <div className="text-gray-400 text-xs mt-1">Hyperledger Fabric 2.4+</div>
        </div>
        <div className="bg-slate-700 rounded-lg p-4 border border-orange-500/30">
          <div className="text-orange-400 text-sm font-semibold">Residency</div>
          <div className="text-white text-2xl font-bold mt-2">India Only</div>
          <div className="text-gray-400 text-xs mt-1">RBI data localization</div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-slate-700 rounded-lg p-6 border border-purple-500/20">
        <h3 className="text-lg font-bold text-white mb-4">Smart Contract Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={registerDevice}
            disabled={loading}
            className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-all"
          >
            {loading ? '⏳ Processing...' : '➕ REGISTRATION - HashRegistrar'}
          </button>
          <button
            onClick={triggerMismatchDetector}
            disabled={loading}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-all"
          >
            {loading ? '⏳ Processing...' : '⚠️ HASH MISMATCH - MismatchDetector'}
          </button>
          <button
            onClick={triggerMuleDetector}
            disabled={loading}
            className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 px-4 rounded-lg disabled:opacity-50 transition-all"
          >
            {loading ? '⏳ Processing...' : '🔗 MULE ALERT - MuleDetector'}
          </button>
        </div>
      </div>

      {/* Event Stream */}
      {events.length > 0 && (
        <div className="bg-slate-700 rounded-lg p-6 border border-cyan-500/30">
          <h3 className="text-lg font-bold text-cyan-400 mb-4">📡 Blockchain Event Bus</h3>
          <div className="space-y-2 font-mono text-sm">
            {events.map((event, idx) => (
              <div key={idx} className="text-gray-300 flex items-start gap-2">
                <span className="text-cyan-400">→</span>
                <span>{event}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ledger Entries */}
      {entries.length > 0 && (
        <div className="bg-slate-700 rounded-lg p-6 border border-blue-500/30">
          <h3 className="text-lg font-bold text-blue-400 mb-4">
            📋 Ledger Entries ({entries.length})
          </h3>

          {/* Entry List */}
          <div className="space-y-3 mb-6">
            {entries.map((entry, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedEntry(entry)}
                className={`w-full text-left p-4 rounded-lg border transition-all ${
                  selectedEntry?.transactionId === entry.transactionId
                    ? 'bg-slate-600 border-blue-500'
                    : 'bg-slate-600 border-slate-500 hover:border-slate-400'
                }`}
              >
                <div className="flex items-center justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="text-blue-400 font-mono text-sm truncate">
                      TX: {entry.transactionId.substring(0, 16)}...
                    </div>
                    <div className="text-white font-semibold mt-1">{entry.eventType}</div>
                  </div>
                  <div className={`px-3 py-1 rounded text-xs font-bold whitespace-nowrap ${
                    entry.status === 'CONFIRMED'
                      ? 'bg-green-900 text-green-400'
                      : entry.status === 'BLOCKED'
                      ? 'bg-red-900 text-red-400'
                      : 'bg-yellow-900 text-yellow-400'
                  }`}>
                    {entry.status}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {/* Selected Entry Details */}
          {selectedEntry && (
            <div className="bg-slate-600 rounded-lg p-4 border border-blue-500/50 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-gray-400 text-xs uppercase">Transaction ID</label>
                  <div className="text-blue-400 font-mono text-sm mt-1 break-all">
                    {selectedEntry.transactionId}
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-xs uppercase">Customer Pseudonym</label>
                  <div className="text-purple-400 font-mono text-sm mt-1 break-all">
                    {selectedEntry.customerPseudonym}
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-xs uppercase">Device Hash</label>
                  <div className="text-cyan-400 font-mono text-sm mt-1 break-all">
                    {selectedEntry.deviceHash.substring(0, 32)}...
                  </div>
                </div>
                <div>
                  <label className="text-gray-400 text-xs uppercase">Timestamp</label>
                  <div className="text-gray-300 text-sm mt-1">{selectedEntry.timestamp}</div>
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-xs uppercase">Risk Flags (Bitmap)</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {selectedEntry.riskFlags.map((flag, idx) => (
                    <span
                      key={idx}
                      className="bg-orange-900/50 text-orange-300 px-3 py-1 rounded text-xs font-mono"
                    >
                      {flag}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-xs uppercase">Gas Used</label>
                <div className="text-gray-300 text-sm mt-1">{selectedEntry.gasUsed} units</div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Data Schema */}
      <div className="bg-slate-700 rounded-lg p-6 border border-indigo-500/30">
        <h3 className="text-lg font-bold text-indigo-400 mb-4">📊 On-Chain Data Schema (ZERO PII)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <div className="flex gap-3">
            <span className="text-indigo-400 font-mono">device_hash</span>
            <span className="text-gray-400">HMAC-SHA-256 (irreversible)</span>
          </div>
          <div className="flex gap-3">
            <span className="text-indigo-400 font-mono">customer_pseudonym</span>
            <span className="text-gray-400">SHA-256(bank_id ‖ customer_id)</span>
          </div>
          <div className="flex gap-3">
            <span className="text-indigo-400 font-mono">event_type</span>
            <span className="text-gray-400">REGISTRATION / MISMATCH / MULE / ...</span>
          </div>
          <div className="flex gap-3">
            <span className="text-indigo-400 font-mono">risk_flags</span>
            <span className="text-gray-400">Bitmap uint8 (8 flags)</span>
          </div>
          <div className="flex gap-3">
            <span className="text-indigo-400 font-mono">timestamp</span>
            <span className="text-gray-400">Unix epoch ms (±300s validation)</span>
          </div>
          <div className="flex gap-3">
            <span className="text-indigo-400 font-mono">prev_hash</span>
            <span className="text-gray-400">Change detection (O(1))</span>
          </div>
        </div>
      </div>
    </div>
  );
}
