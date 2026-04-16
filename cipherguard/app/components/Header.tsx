'use client';
import { useEffect, useState } from 'react';

const BADGES = ['RBI ✓', 'NPCI ✓', 'DPDP 2023 ✓', 'GSMA ✓', 'ISO 27001 ✓', 'ISO 42001 ✓'];

function LiveClock() {
  const [time, setTime] = useState('');
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString('en-IN', { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 15,
        color: '#00D4AA',
        letterSpacing: '0.08em',
        minWidth: 80,
        display: 'inline-block',
        textAlign: 'center',
      }}
    >
      {time || '──:──:──'}
    </span>
  );
}

export default function Header() {
  return (
    <header
      style={{
        background: 'rgba(10,14,26,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        padding: '14px 28px',
      }}
    >
      <div
        style={{
          maxWidth: 1400,
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        {/* Logo + Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Diamond icon */}
          <div
            style={{
              width: 42,
              height: 42,
              background: 'linear-gradient(135deg, #00D4AA, #0096FF)',
              borderRadius: 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 900,
              color: '#0A0E1A',
              boxShadow: '0 0 20px rgba(0,212,170,0.35)',
              transform: 'rotate(45deg)',
              flexShrink: 0,
            }}
          >
            <span style={{ transform: 'rotate(-45deg)', display: 'block' }}>⬡</span>
          </div>
          <div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 20,
                color: '#E8EDF5',
                letterSpacing: '0.04em',
                lineHeight: 1.2,
              }}
            >
              CipherGuard
            </div>
            <div
              style={{
                fontSize: 11,
                color: '#8A95A8',
                letterSpacing: '0.02em',
                marginTop: 2,
              }}
            >
              IMEI-Blockchain + ML Fraud Detection Platform
            </div>
          </div>
        </div>

        {/* Compliance badges */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            justifyContent: 'center',
            flex: 1,
          }}
        >
          {BADGES.map((b) => (
            <span key={b} className="compliance-badge">{b}</span>
          ))}
        </div>

        {/* Right: team + clock */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            flexShrink: 0,
          }}
        >
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#E8EDF5' }}>
              Team CipherGuard
            </div>
            <div style={{ fontSize: 11, color: '#4A9EFF', marginTop: 2 }}>
              PSB Hackathon 2026
            </div>
          </div>
          <div
            style={{
              background: 'rgba(0,212,170,0.08)',
              border: '1px solid rgba(0,212,170,0.2)',
              borderRadius: 8,
              padding: '6px 14px',
            }}
          >
            <LiveClock />
          </div>
        </div>
      </div>
    </header>
  );
}
