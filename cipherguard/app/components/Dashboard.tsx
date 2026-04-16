'use client';
import { useState } from 'react';
import { AppStateProvider } from './StateProvider';
import Header from './Header';
import HelpPanel from './HelpPanel';
import DeviceRegistration from './tabs/DeviceRegistration';
import SimSwapAttack from './tabs/SimSwapAttack';
import SocialEngineering from './tabs/SocialEngineering';
import MuleDetection from './tabs/MuleDetection';
import LiveDashboard from './tabs/LiveDashboard';

const TABS = [
  { id: 'register',  label: 'Device Registration', icon: '📱', num: '01' },
  { id: 'simswap',   label: 'SIM Swap Attack',      icon: '⚡', num: '02' },
  { id: 'social',    label: 'Social Engineering',   icon: '🎭', num: '03' },
  { id: 'mule',      label: 'Mule Detection',       icon: '🕸️', num: '04' },
  { id: 'dashboard', label: 'Live Dashboard',       icon: '📊', num: '05' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('register');

  return (
    <AppStateProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />

        {/* Subheader callout */}
        <div style={{ padding: '10px 28px', background: 'rgba(10,14,26,0.8)' }}>
          <div
            className="subheader-callout"
            style={{ maxWidth: 1400, margin: '0 auto' }}
          >
            ⚡ The attack succeeds at Step 2. Every current platform detects at Step 4.{' '}
            <strong style={{ color: '#FF9F1C' }}>
              CipherGuard intercepts at Step 0
            </strong>{' '}
            — before OTP, before ML scoring, before funds move.
          </div>
        </div>

        {/* Tab navigation */}
        <div
          style={{
            background: 'rgba(10,14,26,0.9)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            padding: '10px 28px 0',
            position: 'sticky',
            top: 71,
            zIndex: 40,
          }}
        >
          <div
            style={{
              maxWidth: 1400,
              margin: '0 auto',
              display: 'flex',
              gap: 4,
              overflowX: 'auto',
              paddingBottom: 10,
            }}
          >
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`tab-btn${activeTab === t.id ? ' active' : ''}`}
                style={{ display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <span
                  style={{
                    fontFamily: "'JetBrains Mono', monospace",
                    fontSize: 10,
                    color: activeTab === t.id ? 'rgba(0,212,170,.6)' : 'rgba(138,149,168,.5)',
                    marginRight: 2,
                  }}
                >
                  {t.num}
                </span>
                <span style={{ fontSize: 15 }}>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main content */}
        <main
          style={{
            flex: 1,
            maxWidth: 1400,
            width: '100%',
            margin: '0 auto',
            padding: '28px 28px 60px',
          }}
        >
          {activeTab === 'register'  && <DeviceRegistration />}
          {activeTab === 'simswap'   && <SimSwapAttack />}
          {activeTab === 'social'    && <SocialEngineering />}
          {activeTab === 'mule'      && <MuleDetection />}
          {activeTab === 'dashboard' && <LiveDashboard />}
        </main>

        {/* Footer */}
        <footer
          style={{
            borderTop: '1px solid rgba(255,255,255,0.06)',
            padding: '16px 28px',
            textAlign: 'center',
            color: '#4A5568',
            fontSize: 12,
          }}
        >
          CipherGuard · IMEI-Blockchain + ML Fraud Detection · PSB National Hackathon 2026 ·{' '}
          <span style={{ color: '#00D4AA' }}>13B+ monthly UPI transactions protected</span>
        </footer>

        <HelpPanel />
      </div>
    </AppStateProvider>
  );
}
