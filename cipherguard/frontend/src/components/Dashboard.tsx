"use client";
import React, { useState } from 'react';
import Header from './layout/Header';
import DeviceFingerprint from './tabs/DeviceFingerprint';
import BlockchainLedger from './tabs/BlockchainLedger';
import TelecomEnrichment from './tabs/TelecomEnrichment';
import MLScoring from './tabs/MLScoring';
import RiskDecision from './tabs/RiskDecision';

const TABS = [
  { label: 'Device Registration', component: DeviceFingerprint },
  { label: 'SIM Swap Attack', component: BlockchainLedger },
  { label: 'Social Engineering', component: TelecomEnrichment },
  { label: 'Mule Detection', component: MLScoring },
  { label: 'Dashboard', component: RiskDecision },
];

export default function Dashboard() {
  const [tab, setTab] = useState(0);
  const TabComponent = TABS[tab].component;
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      <Header />
      <div className="w-full flex justify-center bg-gradient-to-r from-blue-100 to-blue-50 py-2 text-blue-700 font-semibold text-center shadow-sm border-b border-blue-100">
        The attack succeeds at Step 2. Every current platform detects at Step 4. CipherGuard intercepts at Step 0 — before OTP, before ML scoring, before funds move.
      </div>
      <nav className="flex gap-2 justify-center py-6 border-b border-blue-100 bg-white/80 sticky top-0 z-10">
        {TABS.map((t, i) => (
          <button
            key={t.label}
            className={`tab-btn${tab===i?' active':''}`}
            onClick={()=>setTab(i)}
          >{t.label}</button>
        ))}
      </nav>
      <main className="max-w-4xl mx-auto p-4">
        <div className="card">
          <TabComponent />
        </div>
      </main>
    </div>
  );
}
