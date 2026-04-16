'use client';

import { useState } from 'react';
import { generateDeviceFingerprint } from '../../lib/fingerprint';

interface FingerprintData {
  platform: 'Android' | 'iOS' | 'Web';
  primaryId: string;
  secondaryId: string;
  attestationStatus: string;
  imeiHash: string;
  salt: string;
  raspassStatus: {
    root: string;
    frida: string;
    emulator: string;
    attestation: string;
    clockTampering: string;
  };
}

export default function DeviceFingerprint() {
  const [data, setData] = useState<FingerprintData | null>(null);
  const [platform, setPlatform] = useState<'Android' | 'iOS' | 'Web'>('Android');
  const [loading, setLoading] = useState(false);

  const generateFingerprint = async () => {
    setLoading(true);
    const fingerprint = generateDeviceFingerprint(platform);
    await new Promise(r => setTimeout(r, 800)); // Simulate network delay
    setData(fingerprint);
    setLoading(false);
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white mb-2">L1: Device Fingerprint SDK</h2>
        <p className="text-gray-300">
          Hardware-anchored device identity via IMEI/DeviceCheck hash with RASP integrity checks
        </p>
      </div>

      {/* Platform Selection */}
      <div className="bg-slate-700 rounded-lg p-6 border border-purple-500/20">
        <label className="block text-white font-semibold mb-4">Select Platform:</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {(['Android', 'iOS', 'Web'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`py-3 px-4 rounded-lg font-semibold transition-all ${
                platform === p
                  ? 'bg-purple-600 text-white'
                  : 'bg-slate-600 text-gray-300 hover:bg-slate-500'
              }`}
            >
              {p === 'Android' ? '🤖' : p === 'iOS' ? '🍎' : '🌐'} {p}
            </button>
          ))}
        </div>
      </div>

      {/* Generate Button */}
      <button
        onClick={generateFingerprint}
        disabled={loading}
        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold py-4 px-6 rounded-lg hover:shadow-lg hover:shadow-purple-500/50 disabled:opacity-50 transition-all"
      >
        {loading ? '🔄 Generating Fingerprint...' : '🔐 Generate Device Fingerprint'}
      </button>

      {/* Results */}
      {data && (
        <div className="space-y-4">
          {/* Platform-Specific Data */}
          <div className="bg-slate-700 rounded-lg p-6 border border-green-500/30">
            <h3 className="text-xl font-bold text-green-400 mb-4">✓ Fingerprint Generated</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {platform === 'Android' ? (
                <>
                  <div>
                    <label className="text-gray-400 text-sm">IMEI (Primary)</label>
                    <div className="bg-slate-600 p-3 rounded mt-1 font-mono text-yellow-400 break-all">
                      {data.primaryId}
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">Android ID (Secondary)</label>
                    <div className="bg-slate-600 p-3 rounded mt-1 font-mono text-yellow-400 break-all">
                      {data.secondaryId}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label className="text-gray-400 text-sm">DeviceCheck Token (Hardware-Bound)</label>
                    <div className="bg-slate-600 p-3 rounded mt-1 font-mono text-yellow-400 break-all">
                      {data.primaryId}
                    </div>
                  </div>
                  <div>
                    <label className="text-gray-400 text-sm">IDFV (Identifier For Vendor)</label>
                    <div className="bg-slate-600 p-3 rounded mt-1 font-mono text-yellow-400 break-all">
                      {data.secondaryId}
                    </div>
                  </div>
                </>
              )}

              <div>
                <label className="text-gray-400 text-sm">Server Salt (32-byte CSPRNG)</label>
                <div className="bg-slate-600 p-3 rounded mt-1 font-mono text-cyan-400 break-all">
                  {data.salt}
                </div>
              </div>

              <div>
                <label className="text-gray-400 text-sm">Attestation Status</label>
                <div className="bg-slate-600 p-3 rounded mt-1 font-mono text-purple-400">
                  ✓ {data.attestationStatus}
                </div>
              </div>
            </div>
          </div>

          {/* HMAC Hash Result */}
          <div className="bg-slate-700 rounded-lg p-6 border border-blue-500/30">
            <h3 className="text-xl font-bold text-blue-400 mb-4">🔒 Computed IMEI Hash</h3>
            <div className="bg-slate-600 p-4 rounded font-mono text-sm text-cyan-300 break-all">
              HMAC-SHA-256(...) = <br />
              {data.imeiHash}
            </div>
            <p className="text-gray-400 text-xs mt-3">
              ℹ️ Raw IMEI zeroed from memory after hashing via Arrays.fill()
            </p>
          </div>

          {/* RASP Integrity Checks */}
          <div className="bg-slate-700 rounded-lg p-6 border border-orange-500/30">
            <h3 className="text-xl font-bold text-orange-400 mb-4">🛡️ RASP Integrity Checks</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {Object.entries(data.raspassStatus).map(([check, status]) => {
                const passed = status === 'PASS';
                return (
                  <div
                    key={check}
                    className={`p-3 rounded border ${
                      passed
                        ? 'bg-green-900/20 border-green-500/50 text-green-400'
                        : 'bg-red-900/20 border-red-500/50 text-red-400'
                    }`}
                  >
                    <div className="font-semibold">
                      {passed ? '✓' : '✗'} {check.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-sm opacity-75 mt-1">{status}</div>
                  </div>
                );
              })}
            </div>
            <p className="text-gray-400 text-xs mt-3">
              ℹ️ All checks must pass before hash submission to blockchain
            </p>
          </div>

          {/* SDK Communication */}
          <div className="bg-slate-700 rounded-lg p-6 border border-indigo-500/30">
            <h3 className="text-xl font-bold text-indigo-400 mb-4">📡 SDK Communication (mTLS 1.3)</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-3">
                <span className="text-green-400">✓</span>
                <span>Salt fetch timeout: 3000ms hard (cached max 7 days)</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400">✓</span>
                <span>Hash submit timeout: 2000ms hard</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400">✓</span>
                <span>SDK bundle: Android ≤2MB AAR, iOS ≤1.5MB XCFramework</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400">✓</span>
                <span>Certificate pinned (SHA-256) — no HTTP fallback</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-green-400">✓</span>
                <span>No background polling — hash submitted on-demand</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
