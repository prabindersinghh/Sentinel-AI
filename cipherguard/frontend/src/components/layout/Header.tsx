import React from 'react';
import LiveClock from './LiveClock';

export default function Header() {
  return (
    <header className="w-full flex flex-col md:flex-row items-center justify-between py-6 px-8 bg-white/80 shadow-sm border-b border-blue-100 mb-2">
      <div className="flex items-center gap-4 mb-2 md:mb-0">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-300 rounded-2xl flex items-center justify-center font-bold text-2xl text-white shadow">◆</div>
        <div>
          <div className="font-bold text-2xl tracking-wide text-blue-900">CipherGuard</div>
          <div className="text-xs text-blue-400 font-medium">IMEI-Blockchain + ML Fraud Detection Platform</div>
        </div>
      </div>
      <div className="flex gap-2 flex-wrap justify-center animate-pulse">
        {['RBI ✓','NPCI ✓','DPDP 2023 ✓','GSMA ✓','ISO 27001 ✓','ISO 42001 ✓'].map(badge => (
          <span key={badge} className="bg-blue-100 text-blue-700 text-xs px-3 py-1 rounded-full font-semibold shadow-sm border border-blue-200">{badge}</span>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-2 md:mt-0">
        <span className="font-semibold text-blue-700">Team CipherGuard</span>
        <LiveClock />
        <span className="text-xs text-blue-400 font-medium">PSB Hackathon 2026</span>
      </div>
    </header>
  );
}
