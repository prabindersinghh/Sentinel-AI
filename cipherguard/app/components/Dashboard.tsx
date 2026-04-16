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
import OneClickDemo from './tabs/OneClickDemo';

const TABS = [
  { id: 'demo',      label: 'One-Click Demo',       icon: '🎬', num: '00' },
  { id: 'register',  label: 'Device Registration', icon: '📱', num: '01' },
  { id: 'simswap',   label: 'SIM Swap Attack',      icon: '⚡', num: '02' },
  { id: 'social',    label: 'Social Engineering',   icon: '🎭', num: '03' },
  { id: 'mule',      label: 'Mule Detection',       icon: '🕸️', num: '04' },
  { id: 'dashboard', label: 'Live Dashboard',       icon: '📊', num: '05' },
] as const;

type TabId = (typeof TABS)[number]['id'];

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabId>('demo');

  return (
    <AppStateProvider>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Header />

        {/* Subheader callout */}
        <div style={{ padding: '10px 28px', background: '#FFFFFF', borderBottom: '1px solid #F1F5F9' }}>
          <div
            className="subheader-callout"
            style={{ maxWidth: 1400, margin: '0 auto' }}
          >
            ⚡ The attack succeeds at Step 2. Every current platform detects at Step 4.{' '}
            <strong style={{ color: '#1D4ED8' }}>
              CipherGuard intercepts at Step 0
            </strong>{' '}
            — before OTP, before ML scoring, before funds move.
          </div>
        </div>

        {/* Tab navigation */}
        <div
          style={{
            background: 'rgba(238,243,251,0.96)',
            borderBottom: '1px solid #DBEAFE',
            padding: '10px 28px 0',
            position: 'sticky',
            top: 71,
            zIndex: 40,
            backdropFilter: 'blur(8px)',
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
                    color: activeTab === t.id ? 'rgba(37,99,235,.55)' : '#CBD5E1',
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
          {activeTab === 'demo'      && <OneClickDemo />}
          {activeTab === 'register'  && <DeviceRegistration />}
          {activeTab === 'simswap'   && <SimSwapAttack />}
          {activeTab === 'social'    && <SocialEngineering />}
          {activeTab === 'mule'      && <MuleDetection />}
          {activeTab === 'dashboard' && <LiveDashboard />}
        </main>

        {/* Footer */}
        <footer
          style={{
            borderTop: '1px solid #E2E8F0',
            padding: '16px 28px',
            textAlign: 'center',
            color: '#94A3B8',
            fontSize: 12,
            background: '#FFFFFF',
          }}
        >
          CipherGuard · IMEI-Blockchain + ML Fraud Detection · PSB National Hackathon 2026 ·{' '}
          <span style={{ color: '#2563EB' }}>13B+ monthly UPI transactions protected</span>
        </footer>

        <HelpPanel />
      </div>
    </AppStateProvider>
  );
}
