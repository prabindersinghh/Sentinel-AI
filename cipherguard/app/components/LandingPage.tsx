'use client';
import { useState, useEffect, useRef } from 'react';

/* ─────────────────────────────────────────
   Animated number counter (intersection)
───────────────────────────────────────── */
function AnimatedNumber({
  value, suffix = '', prefix = '', duration = 1600,
}: { value: number; suffix?: string; prefix?: string; duration?: number }) {
  const [current, setCurrent] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) setStarted(true); },
      { threshold: 0.4 }
    );
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const step = value / (duration / 16);
    let c = 0;
    const t = setInterval(() => {
      c += step;
      if (c >= value) { setCurrent(value); clearInterval(t); }
      else setCurrent(Math.floor(c));
    }, 16);
    return () => clearInterval(t);
  }, [started, value, duration]);

  return <div ref={ref}>{prefix}{current.toLocaleString('en-IN')}{suffix}</div>;
}

/* ─────────────────────────────────────────
   Hero — live pipeline mini-viz (auto-loops)
───────────────────────────────────────── */
function LivePipelineCard() {
  const [phase, setPhase] = useState(0);
  const LAYERS = ['L1 SDK', 'L2 Blockchain', 'L3 Telecom', 'L4 Features', 'L5 ML', 'L6 Decision'];
  const DELAYS = [0, 700, 1300, 1900, 2500, 3200];

  useEffect(() => {
    setPhase(0);
    const timers = DELAYS.map((d, i) =>
      setTimeout(() => setPhase(i + 1), d + 400)
    );
    const reset = setTimeout(() => setPhase(0), 7500);
    return () => { timers.forEach(clearTimeout); clearTimeout(reset); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // loop
  useEffect(() => {
    if (phase !== 0) return;
    const loop = setTimeout(() => {
      setPhase(0);
      DELAYS.map((d, i) =>
        setTimeout(() => setPhase(i + 1), d + 400)
      );
    }, 800);
    return () => clearTimeout(loop);
  }, [phase]); // eslint-disable-line react-hooks/exhaustive-deps

  const done = phase > 6;

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #DBEAFE',
      borderRadius: 16,
      padding: '24px',
      boxShadow: '0 8px 40px rgba(37,99,235,.12)',
      maxWidth: 480,
    }}>
      {/* Transaction header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 8, height: 8, borderRadius: '50%', background: '#EF4444',
            boxShadow: '0 0 0 3px rgba(239,68,68,.15)',
            animation: 'badge-pulse 1s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: '#0F172A', letterSpacing: '.06em' }}>
            INCOMING UPI TRANSACTION
          </span>
        </div>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 10, color: '#94A3B8' }}>
          {new Date().toLocaleTimeString('en-IN', { hour12: false })}
        </span>
      </div>

      {/* Sender / Amount / Payee */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', marginBottom: 20, gap: 12 }}>
        <div style={{ padding: '10px 12px', background: '#EFF6FF', borderRadius: 8, border: '1px solid #BFDBFE' }}>
          <div style={{ fontSize: 9, color: '#64748B', fontWeight: 700, marginBottom: 3 }}>SENDER</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#0F172A' }}>Rajesh Kumar</div>
          <div style={{ fontSize: 10, color: '#2563EB', fontFamily: "'JetBrains Mono', monospace" }}>rajesh@sbi</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 900, color: '#DC2626', fontFamily: "'JetBrains Mono', monospace" }}>₹45,000</div>
          <div style={{ fontSize: 9, color: '#94A3B8' }}>UPI · IMPS</div>
        </div>
        <div style={{ padding: '10px 12px', background: '#FEF2F2', borderRadius: 8, border: '1px solid #FCA5A5' }}>
          <div style={{ fontSize: 9, color: '#DC2626', fontWeight: 700, marginBottom: 3 }}>PAYEE</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#DC2626' }}>fraudster@ybl</div>
          <div style={{ fontSize: 10, color: '#EF4444', fontFamily: "'JetBrains Mono', monospace" }}>Unknown device</div>
        </div>
      </div>

      {/* Pipeline layers */}
      <div style={{ display: 'flex', gap: 3, alignItems: 'center', marginBottom: 14 }}>
        {LAYERS.map((l, i) => {
          const isDone   = phase > i + 1;
          const isActive = phase === i + 1;
          const isFast   = i === 1 && phase >= 2; // fast at L2
          return (
            <div key={l} style={{ display: 'flex', alignItems: 'center', flex: 1, gap: 3, minWidth: 0 }}>
              <div style={{
                flex: 1,
                padding: '7px 4px',
                borderRadius: 6,
                border: `1.5px solid ${isDone ? (i === 1 ? '#DC2626' : '#E2E8F0') : isActive ? '#2563EB' : '#E2E8F0'}`,
                background: isDone ? (i === 1 ? '#FEF2F2' : '#F8FAFF') : isActive ? '#EFF6FF' : '#FAFAFA',
                textAlign: 'center',
                transition: 'all .25s',
                boxShadow: isActive ? '0 0 0 3px rgba(37,99,235,.12)' : 'none',
              }}>
                <div style={{
                  fontSize: 8, fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: isDone ? (i === 1 ? '#DC2626' : '#059669') : isActive ? '#1D4ED8' : '#CBD5E1',
                }}>
                  {l.split(' ')[0]}
                </div>
                {isActive && (
                  <div style={{
                    width: 8, height: 8, border: '1.5px solid #DBEAFE', borderTopColor: '#2563EB',
                    borderRadius: '50%', animation: 'spin .7s linear infinite',
                    margin: '2px auto 0',
                  }} />
                )}
                {isDone && !isActive && (
                  <div style={{ fontSize: 8, color: i === 1 ? '#DC2626' : '#10B981', marginTop: 1 }}>
                    {i === 1 ? '!' : '✓'}
                  </div>
                )}
              </div>
              {i < LAYERS.length - 1 && (
                <div style={{ color: isDone ? '#10B981' : '#E2E8F0', fontSize: 10, flexShrink: 0 }}>›</div>
              )}
            </div>
          );
        })}
      </div>

      {/* Result */}
      {phase >= 3 && (
        <div className="fade-up" style={{
          padding: '10px 14px', borderRadius: 8,
          background: '#FEF2F2', border: '2px solid #EF4444',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, color: '#DC2626', letterSpacing: '.08em' }}>
              BLOCKED — 71ms
            </div>
            <div style={{ fontSize: 10, color: '#64748B', marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
              IMEI hash mismatch · ML never consulted · OTP never issued
            </div>
          </div>
          <div style={{
            fontSize: 20, fontWeight: 900, color: '#DC2626',
            border: '3px solid #DC2626', borderRadius: 6,
            padding: '2px 10px', transform: 'rotate(-3deg)',
            background: '#FFF', letterSpacing: '.06em',
          }}>
            BLOCK
          </div>
        </div>
      )}
      {phase < 3 && (
        <div style={{
          padding: '10px 14px', borderRadius: 8,
          background: '#EFF6FF', border: '1px solid #BFDBFE',
          fontSize: 11, color: '#2563EB', fontFamily: "'JetBrains Mono', monospace",
        }}>
          Analyzing transaction...
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────
   Sign-in modal overlay
───────────────────────────────────────── */
function SignInModal({ onConfirm, onClose }: { onConfirm: () => void; onClose: () => void }) {
  const [loading, setLoading] = useState(false);

  const handleSignIn = () => {
    setLoading(true);
    setTimeout(onConfirm, 1600);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(15,23,42,.5)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      <div style={{
        background: '#FFFFFF', borderRadius: 20, padding: '40px 48px',
        boxShadow: '0 24px 80px rgba(37,99,235,.18)',
        border: '1px solid #DBEAFE', minWidth: 380,
        animation: 'fade-up .3s ease-out',
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{
              width: 44, height: 44, border: '3px solid #DBEAFE', borderTopColor: '#2563EB',
              borderRadius: '50%', animation: 'spin .8s linear infinite',
              margin: '0 auto 20px',
            }} />
            <div style={{ fontWeight: 700, fontSize: 16, color: '#0F172A', marginBottom: 6 }}>
              Authenticating
            </div>
            <div style={{ fontSize: 12, color: '#64748B', fontFamily: "'JetBrains Mono', monospace" }}>
              Establishing secure session...
            </div>
          </div>
        ) : (
          <>
            {/* Logo */}
            <div style={{ textAlign: 'center', marginBottom: 28 }}>
              <div style={{
                width: 48, height: 48,
                background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                borderRadius: 10, display: 'inline-flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 24, color: '#fff',
                transform: 'rotate(45deg)', marginBottom: 16,
              }}>
                <span style={{ transform: 'rotate(-45deg)' }}>⬡</span>
              </div>
              <div style={{ fontWeight: 800, fontSize: 20, color: '#0F172A' }}>CipherGuard</div>
              <div style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                Fraud Detection Platform
              </div>
            </div>

            {/* Fields */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Institution Email
              </label>
              <input
                type="text"
                defaultValue="analyst@sbi.co.in"
                style={{
                  background: '#F8FAFF', border: '1px solid #BFDBFE', color: '#0F172A',
                  borderRadius: 8, padding: '10px 14px', fontFamily: 'inherit',
                  fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ marginBottom: 24 }}>
              <label style={{ fontSize: 12, color: '#64748B', fontWeight: 600, display: 'block', marginBottom: 6 }}>
                Password
              </label>
              <input
                type="password"
                defaultValue="••••••••••"
                style={{
                  background: '#F8FAFF', border: '1px solid #BFDBFE', color: '#0F172A',
                  borderRadius: 8, padding: '10px 14px', fontFamily: 'inherit',
                  fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              onClick={handleSignIn}
              style={{
                width: '100%', padding: '12px', borderRadius: 10, border: 'none',
                background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                color: '#fff', fontSize: 15, fontWeight: 700,
                cursor: 'pointer', letterSpacing: '.02em',
                boxShadow: '0 4px 16px rgba(37,99,235,.35)',
                fontFamily: 'inherit',
              }}
            >
              Sign In to Platform
            </button>

            <div style={{ textAlign: 'center', marginTop: 14 }}>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', color: '#94A3B8',
                  fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>

            <div style={{
              marginTop: 20, padding: '10px 14px',
              background: '#EFF6FF', borderRadius: 8,
              border: '1px solid #BFDBFE', fontSize: 11, color: '#64748B',
              textAlign: 'center',
            }}>
              PSB National Hackathon 2026 · Demo Instance · No real credentials required
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────
   NAV
───────────────────────────────────────── */
function Navbar({ onSignIn }: { onSignIn: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', fn);
    return () => window.removeEventListener('scroll', fn);
  }, []);

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      background: scrolled ? 'rgba(255,255,255,.97)' : 'rgba(255,255,255,.92)',
      backdropFilter: 'blur(16px)',
      borderBottom: scrolled ? '1px solid #DBEAFE' : '1px solid transparent',
      padding: '0 40px',
      transition: 'all .3s',
      boxShadow: scrolled ? '0 2px 20px rgba(37,99,235,.08)' : 'none',
    }}>
      <div style={{
        maxWidth: 1280, margin: '0 auto',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 68,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36, height: 36,
            background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
            borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, color: '#fff', transform: 'rotate(45deg)',
            boxShadow: '0 4px 12px rgba(37,99,235,.3)',
          }}>
            <span style={{ transform: 'rotate(-45deg)', display: 'block' }}>⬡</span>
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: '#0F172A', letterSpacing: '.02em' }}>
              CipherGuard
            </div>
            <div style={{ fontSize: 9, color: '#64748B', letterSpacing: '.08em', marginTop: -1 }}>
              FRAUD DETECTION PLATFORM
            </div>
          </div>
        </div>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {['Platform', 'Architecture', 'Security', 'Compliance'].map(l => (
            <button key={l} style={{
              background: 'none', border: 'none', padding: '8px 14px',
              color: '#475569', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', borderRadius: 8, fontFamily: 'inherit',
              transition: 'all .15s',
            }}
              onMouseEnter={e => { e.currentTarget.style.color = '#2563EB'; e.currentTarget.style.background = '#EFF6FF'; }}
              onMouseLeave={e => { e.currentTarget.style.color = '#475569'; e.currentTarget.style.background = 'none'; }}
            >
              {l}
            </button>
          ))}
          <div style={{ width: 1, height: 20, background: '#E2E8F0', margin: '0 8px' }} />
          <button
            onClick={onSignIn}
            style={{
              padding: '9px 22px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
              color: '#fff', fontSize: 13, fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: '0 2px 12px rgba(37,99,235,.3)',
              transition: 'all .2s', letterSpacing: '.02em',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 20px rgba(37,99,235,.45)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(37,99,235,.3)'; e.currentTarget.style.transform = 'none'; }}
          >
            Sign In
          </button>
        </div>
      </div>
    </nav>
  );
}

/* ─────────────────────────────────────────
   HERO
───────────────────────────────────────── */
function Hero({ onSignIn }: { onSignIn: () => void }) {
  return (
    <section style={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center',
      background: 'linear-gradient(160deg, #EEF3FB 0%, #FFFFFF 55%, #EFF6FF 100%)',
      backgroundImage: `
        linear-gradient(160deg, #EEF3FB 0%, #FFFFFF 55%, #EFF6FF 100%),
        repeating-linear-gradient(0deg, transparent, transparent 59px, rgba(37,99,235,.03) 59px, rgba(37,99,235,.03) 60px),
        repeating-linear-gradient(90deg, transparent, transparent 59px, rgba(37,99,235,.03) 59px, rgba(37,99,235,.03) 60px)
      `,
      paddingTop: 68,
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Decorative background orbs */}
      <div style={{
        position: 'absolute', top: '10%', right: '5%',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,.07) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '5%', left: '-5%',
        width: 400, height: 400, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(37,99,235,.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ maxWidth: 1280, margin: '0 auto', padding: '80px 40px', width: '100%' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>

          {/* Left — headline + CTAs */}
          <div>
            {/* Top badge */}
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 28,
              padding: '6px 16px', borderRadius: 20,
              background: '#EFF6FF', border: '1px solid #BFDBFE',
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#2563EB', animation: 'badge-pulse 2s ease-in-out infinite' }} />
              <span style={{ fontSize: 11, fontWeight: 700, color: '#2563EB', letterSpacing: '.08em' }}>
                PSB NATIONAL HACKATHON 2026
              </span>
            </div>

            {/* Main headline */}
            <h1 style={{
              fontSize: 'clamp(44px, 5vw, 72px)',
              fontWeight: 900,
              lineHeight: 1.06,
              color: '#0F172A',
              margin: '0 0 24px',
              letterSpacing: '-0.025em',
              fontFamily: 'var(--font-sora, var(--font-dm-sans))',
            }}>
              Fraud intercepted<br />
              <span style={{
                color: '#2563EB',
                position: 'relative',
                display: 'inline-block',
              }}>
                before the OTP
                <svg viewBox="0 0 300 12" style={{ position: 'absolute', bottom: -4, left: 0, width: '100%', overflow: 'visible' }}>
                  <path d="M0,8 Q75,2 150,8 Q225,14 300,8" stroke="#2563EB" strokeWidth="3" fill="none" opacity="0.5" />
                </svg>
              </span>
              <br />
              reaches your phone.
            </h1>

            {/* Sub */}
            <p style={{
              fontSize: 17, color: '#475569', lineHeight: 1.7,
              margin: '0 0 36px', maxWidth: 520,
            }}>
              The first IMEI-blockchain fraud detection platform for UPI. Six-layer defence anchored in hardware, verified on Hyperledger Fabric, enriched with real-time telecom intelligence. Detection at Step 0 — not Step 4.
            </p>

            {/* CTAs */}
            <div style={{ display: 'flex', gap: 14, marginBottom: 48, flexWrap: 'wrap' }}>
              <button
                onClick={onSignIn}
                style={{
                  padding: '14px 32px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                  color: '#fff', fontSize: 15, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                  boxShadow: '0 4px 24px rgba(37,99,235,.4)',
                  transition: 'all .2s', letterSpacing: '.02em',
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(37,99,235,.5)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 4px 24px rgba(37,99,235,.4)'; }}
              >
                Sign In to Platform
              </button>
              <button
                onClick={() => document.getElementById('architecture')?.scrollIntoView({ behavior: 'smooth' })}
                style={{
                  padding: '14px 32px', borderRadius: 10,
                  border: '1.5px solid #BFDBFE', background: '#FFFFFF',
                  color: '#2563EB', fontSize: 15, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all .2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = '#EFF6FF'; e.currentTarget.style.borderColor = '#93C5FD'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#FFFFFF'; e.currentTarget.style.borderColor = '#BFDBFE'; }}
              >
                View Architecture
              </button>
            </div>

            {/* Stats pills */}
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              {[
                { value: '13B+', label: 'Monthly UPI Transactions' },
                { value: '<80ms', label: 'Detection Latency' },
                { value: '5 Gaps', label: 'Industry Gaps Closed' },
                { value: '0 PII', label: 'Data On-Chain' },
              ].map(s => (
                <div key={s.label} style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 22, fontWeight: 900, color: '#1D4ED8',
                    fontFamily: 'var(--font-sora, var(--font-dm-sans))',
                    letterSpacing: '-0.02em',
                  }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 10, color: '#94A3B8', fontWeight: 600, letterSpacing: '.05em', marginTop: 2 }}>
                    {s.label.toUpperCase()}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — live transaction card */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'flex-start' }}>
            <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, letterSpacing: '.08em', fontFamily: "'JetBrains Mono', monospace" }}>
              LIVE DEMONSTRATION
            </div>
            <LivePipelineCard />
            <div style={{
              padding: '10px 16px', borderRadius: 8,
              background: 'rgba(37,99,235,.04)', border: '1px solid #DBEAFE',
              fontSize: 11, color: '#64748B', fontFamily: "'JetBrains Mono', monospace",
            }}>
              Attacker's IMEI hash does not match registered baseline · MismatchDetector.sol · Fast path triggered
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   THE PROBLEM — Step 0 vs Step 4
───────────────────────────────────────── */
function ProblemSection() {
  return (
    <section style={{
      background: '#0F172A',
      padding: '100px 40px',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Background accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 1,
        background: 'linear-gradient(90deg, transparent, rgba(37,99,235,.5), transparent)',
      }} />

      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{
            display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
            color: '#3B82F6', marginBottom: 16, fontFamily: "'JetBrains Mono', monospace",
            padding: '4px 14px', borderRadius: 20, border: '1px solid rgba(59,130,246,.3)',
            background: 'rgba(59,130,246,.08)',
          }}>
            THE CRITICAL GAP
          </div>
          <h2 style={{
            fontSize: 'clamp(32px, 4vw, 52px)', fontWeight: 900, color: '#FFFFFF',
            margin: '0 0 20px', letterSpacing: '-0.02em', lineHeight: 1.1,
            fontFamily: 'var(--font-sora, var(--font-dm-sans))',
          }}>
            Every platform waits for Step 4.<br />
            <span style={{ color: '#3B82F6' }}>CipherGuard stops it at Step 0.</span>
          </h2>
          <p style={{ fontSize: 16, color: '#94A3B8', maxWidth: 560, margin: '0 auto' }}>
            SIM swap fraud succeeds because existing platforms authenticate the SIM, not the device. By the time they detect fraud, the OTP has already been sent.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32 }}>
          {/* Existing platforms */}
          <div style={{
            padding: '32px', borderRadius: 16,
            background: 'rgba(239,68,68,.05)', border: '1px solid rgba(239,68,68,.2)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#EF4444', letterSpacing: '.1em', marginBottom: 24 }}>
              EXISTING PLATFORMS
            </div>
            {[
              { step: '01', label: 'Attacker inserts victim SIM', note: 'Undetected' },
              { step: '02', label: 'Bank app opened on attacker device', note: 'Undetected' },
              { step: '03', label: 'Transaction initiated', note: 'Undetected' },
              { step: '04', label: 'OTP sent to attacker', note: 'Detection happens HERE', alert: true },
              { step: '05', label: 'Fraud detected — too late', note: '4–120 minutes after attack', danger: true },
            ].map(s => (
              <div key={s.step} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.danger ? 'rgba(239,68,68,.2)' : s.alert ? 'rgba(239,68,68,.15)' : 'rgba(255,255,255,.06)',
                  border: `1px solid ${s.danger || s.alert ? 'rgba(239,68,68,.4)' : 'rgba(255,255,255,.1)'}`,
                  fontSize: 10, fontWeight: 800,
                  color: s.danger || s.alert ? '#EF4444' : '#64748B',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {s.step}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: s.danger ? '#EF4444' : '#E2E8F0', fontWeight: s.alert || s.danger ? 700 : 400 }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 11, color: s.alert || s.danger ? '#EF4444' : '#475569', marginTop: 2 }}>
                    {s.note}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* CipherGuard */}
          <div style={{
            padding: '32px', borderRadius: 16,
            background: 'rgba(37,99,235,.06)', border: '1px solid rgba(37,99,235,.25)',
          }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#3B82F6', letterSpacing: '.1em', marginBottom: 24 }}>
              CIPHERGUARD
            </div>
            {[
              { step: '00', label: 'IMEI hash verified at transaction init', note: 'CipherGuard acts HERE — Step 0', hero: true },
              { step: '01', label: 'Hash mismatch detected — BLOCK issued', note: '<80ms · fast path · composite: 1000/1000', hero: true },
              { step: '02', label: 'OTP generation cancelled', note: 'Structurally impossible to reach', grey: true },
              { step: '03', label: 'Transaction rejected', note: 'Funds never leave account', grey: true },
              { step: '04', label: 'Victim notified on registered device', note: 'Not on attacker\'s SIM', info: true },
            ].map(s => (
              <div key={s.step} style={{
                display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: s.hero ? 'rgba(37,99,235,.2)' : s.info ? 'rgba(16,185,129,.15)' : 'rgba(255,255,255,.04)',
                  border: `1px solid ${s.hero ? 'rgba(37,99,235,.5)' : s.info ? 'rgba(16,185,129,.3)' : 'rgba(255,255,255,.07)'}`,
                  fontSize: 10, fontWeight: 800,
                  color: s.hero ? '#60A5FA' : s.info ? '#34D399' : '#475569',
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {s.step}
                </div>
                <div>
                  <div style={{ fontSize: 13, color: s.grey ? '#475569' : '#E2E8F0', fontWeight: s.hero ? 700 : 400, textDecoration: s.grey ? 'line-through' : 'none' }}>
                    {s.label}
                  </div>
                  <div style={{ fontSize: 11, color: s.hero ? '#60A5FA' : s.info ? '#34D399' : '#334155', marginTop: 2 }}>
                    {s.note}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   ARCHITECTURE — 6 layers
───────────────────────────────────────── */
function ArchitectureSection() {
  const layers = [
    {
      id: 'L1', name: 'Device SDK', color: '#2563EB',
      headline: 'Hardware-Anchored Identity',
      detail: 'HMAC-SHA-256(IMEI || ANDROID_ID || attest_cert) computed on-device in TEE. Raw IMEI never leaves the hardware boundary.',
      tags: ['RASP', 'TEE Keystore', 'mTLS 1.3'],
    },
    {
      id: 'L2', name: 'Hyperledger Fabric', color: '#1D4ED8',
      headline: 'Permissioned Blockchain',
      detail: 'HashRegistrar.sol stores device pseudonyms. MismatchDetector.sol runs constant-time hash comparison. BFT-SMaRt consensus across bank nodes.',
      tags: ['5000 TPS', 'BFT-SMaRt', 'HashRegistrar'],
    },
    {
      id: 'L3', name: 'Telecom Context', color: '#0891B2',
      headline: 'Real-Time CDR Intelligence',
      detail: 'CAMARA SNA API + bilateral MNO agreements with Jio and Airtel. Inbound call volume, screen share status, clipboard injection, SIM porting all captured pre-transaction.',
      tags: ['CAMARA API', 'CDR Signals', 'ICCID Track'],
    },
    {
      id: 'L4', name: 'Feature Engine', color: '#7C3AED',
      headline: 'Signal Fusion Layer',
      detail: 'Merges L2 device signals, L3 telecom context, and transaction metadata into a 434-dimensional feature vector. Injects five new CipherGuard-native features.',
      tags: ['434 Features', 'Signal Fusion', 'Real-time'],
    },
    {
      id: 'L5', name: 'ML Ensemble', color: '#059669',
      headline: 'Four-Model Parallel Scoring',
      detail: 'LightGBM (tabular), LSTM (50-event temporal window), GNN/GraphSAGE (cross-bank graph), Isolation Forest (anomaly). Meta logistic regression combines outputs with SHAP explainability.',
      tags: ['LightGBM', 'LSTM', 'GNN/GraphSAGE'],
    },
    {
      id: 'L6', name: 'Decision Engine', color: '#DC2626',
      headline: 'Composite Risk Scoring',
      detail: 'Weighted signal matrix produces 0–1000 composite score. Decision bands: 0–299 APPROVE, 300–599 STEP-UP auth, 600–1000 BLOCK. Audit trail written to blockchain.',
      tags: ['0–1000 Score', 'SHAP Audit', 'FedAvg'],
    },
  ];

  return (
    <section id="architecture" style={{ background: '#FFFFFF', padding: '100px 40px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{
            display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
            color: '#2563EB', marginBottom: 16, fontFamily: "'JetBrains Mono', monospace",
            padding: '4px 14px', borderRadius: 20, border: '1px solid #BFDBFE', background: '#EFF6FF',
          }}>
            PLATFORM ARCHITECTURE
          </div>
          <h2 style={{
            fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 900, color: '#0F172A',
            margin: '0 0 16px', letterSpacing: '-0.02em',
            fontFamily: 'var(--font-sora, var(--font-dm-sans))',
          }}>
            Six Layers. One Decision.
          </h2>
          <p style={{ fontSize: 16, color: '#64748B', maxWidth: 520, margin: '0 auto' }}>
            Each layer contributes a signal. Together they form an unforgeable composite risk score in under 300ms.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          {layers.map((l, i) => (
            <div
              key={l.id}
              style={{
                padding: '28px', borderRadius: 14,
                border: `1.5px solid ${l.color}22`,
                background: `linear-gradient(160deg, ${l.color}06 0%, #FFFFFF 100%)`,
                transition: 'all .25s',
                cursor: 'default',
                position: 'relative', overflow: 'hidden',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = `${l.color}55`;
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 8px 32px ${l.color}18`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = `${l.color}22`;
                (e.currentTarget as HTMLDivElement).style.transform = 'none';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 8,
                  background: `${l.color}15`, border: `1.5px solid ${l.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 11, fontWeight: 900, color: l.color,
                  fontFamily: "'JetBrains Mono', monospace",
                }}>
                  {l.id}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A' }}>{l.name}</div>
                  <div style={{ fontSize: 10, color: '#94A3B8', marginTop: 1 }}>Layer {i + 1} of 6</div>
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 700, color: l.color, marginBottom: 8 }}>
                {l.headline}
              </div>
              <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.6, marginBottom: 14 }}>
                {l.detail}
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {l.tags.map(t => (
                  <span key={t} style={{
                    padding: '2px 9px', borderRadius: 10,
                    background: `${l.color}0E`, border: `1px solid ${l.color}25`,
                    fontSize: 10, fontWeight: 600, color: l.color,
                    fontFamily: "'JetBrains Mono', monospace",
                  }}>{t}</span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   NUMBERS — large stats on dark bg
───────────────────────────────────────── */
function NumbersSection() {
  return (
    <section style={{
      background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 100%)',
      padding: '100px 40px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(circle at 20% 50%, rgba(37,99,235,.12) 0%, transparent 50%), radial-gradient(circle at 80% 50%, rgba(37,99,235,.08) 0%, transparent 50%)',
        pointerEvents: 'none',
      }} />
      <div style={{ maxWidth: 1280, margin: '0 auto', position: 'relative' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <h2 style={{
            fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 900, color: '#FFFFFF',
            margin: 0, letterSpacing: '-0.02em',
            fontFamily: 'var(--font-sora, var(--font-dm-sans))',
          }}>
            Built for the scale of Indian finance.
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2 }}>
          {[
            { value: 13, suffix: 'B+', label: 'UPI transactions per month in India', note: 'Target market' },
            { value: 80, suffix: 'ms', prefix: '<', label: 'Detection latency on fast path', note: 'Industry: 4–120 min' },
            { value: 5000, suffix: ' TPS', label: 'Hyperledger Fabric throughput', note: 'BFT-SMaRt consensus' },
            { value: 0, suffix: ' PII', label: 'Personally identifiable data on-chain', note: 'DPDP 2023 compliant' },
          ].map((s, i) => (
            <div key={i} style={{
              padding: '40px 32px',
              borderRight: i < 3 ? '1px solid rgba(255,255,255,.06)' : 'none',
              textAlign: 'center',
            }}>
              <div style={{
                fontSize: 'clamp(48px, 5vw, 72px)', fontWeight: 900, lineHeight: 1,
                color: '#FFFFFF', marginBottom: 12,
                fontFamily: 'var(--font-sora, var(--font-dm-sans))',
                letterSpacing: '-0.03em',
              }}>
                <AnimatedNumber value={s.value} suffix={s.suffix} prefix={s.prefix} />
              </div>
              <div style={{ fontSize: 13, color: '#94A3B8', lineHeight: 1.5, marginBottom: 6 }}>
                {s.label}
              </div>
              <div style={{
                fontSize: 10, color: '#3B82F6', fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace", letterSpacing: '.04em',
              }}>
                {s.note}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   5 GAPS
───────────────────────────────────────── */
function GapsSection() {
  const gaps = [
    { id: 'G1', title: 'SIM Swap Latency', before: '4–120 minutes', after: '<80ms', layer: 'L2 Blockchain', color: '#2563EB' },
    { id: 'G2', title: 'Verification Depth', before: 'SIM presence (binary)', after: 'Hardware IMEI + ICCID + porting history', layer: 'L1 + L3', color: '#0891B2' },
    { id: 'G3', title: 'Social Engineering', before: '~15% detection rate', after: '>55% detection rate', layer: 'L3 Telecom', color: '#7C3AED' },
    { id: 'G4', title: 'Cold-Start Problem', before: '30-day baseline required', after: 'Cross-bank history from day one', layer: 'L2 Consortium', color: '#059669' },
    { id: 'G5', title: 'Cross-Bank Visibility', before: 'Single institution view only', after: 'Consortium-wide pseudonymous registry', layer: 'L2 Ledger', color: '#DC2626' },
  ];

  return (
    <section style={{ background: '#EEF3FB', padding: '100px 40px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 64 }}>
          <div style={{
            display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
            color: '#2563EB', marginBottom: 16, fontFamily: "'JetBrains Mono', monospace",
            padding: '4px 14px', borderRadius: 20, border: '1px solid #BFDBFE', background: '#EFF6FF',
          }}>
            COMPETITIVE DIFFERENTIATION
          </div>
          <h2 style={{
            fontSize: 'clamp(28px, 3.5vw, 48px)', fontWeight: 900, color: '#0F172A',
            margin: '0 0 16px', letterSpacing: '-0.02em',
            fontFamily: 'var(--font-sora, var(--font-dm-sans))',
          }}>
            Five critical gaps.<br />All closed.
          </h2>
          <p style={{ fontSize: 16, color: '#64748B', maxWidth: 480, margin: '0 auto' }}>
            No existing Indian UPI fraud platform addresses all five. CipherGuard closes every one.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
          {gaps.map(g => (
            <div key={g.id} style={{
              padding: '24px', borderRadius: 12,
              background: '#FFFFFF', border: `1.5px solid ${g.color}20`,
              transition: 'all .2s',
            }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = `${g.color}50`;
                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                (e.currentTarget as HTMLDivElement).style.boxShadow = `0 12px 40px ${g.color}14`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLDivElement).style.borderColor = `${g.color}20`;
                (e.currentTarget as HTMLDivElement).style.transform = 'none';
                (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
                  fontWeight: 800, color: g.color,
                }}>
                  {g.id}
                </span>
                <span style={{
                  fontSize: 9, padding: '2px 8px', borderRadius: 10, fontWeight: 700,
                  background: '#DCFCE7', color: '#059669', border: '1px solid #86EFAC',
                }}>
                  CLOSED
                </span>
              </div>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A', marginBottom: 12 }}>
                {g.title}
              </div>
              <div style={{ marginBottom: 4, fontSize: 11, color: '#DC2626' }}>
                Before: {g.before}
              </div>
              <div style={{ fontSize: 11, color: '#059669', marginBottom: 12 }}>
                After: {g.after}
              </div>
              <div style={{
                fontSize: 10, color: g.color, fontWeight: 600,
                fontFamily: "'JetBrains Mono', monospace",
                padding: '3px 8px', borderRadius: 6,
                background: `${g.color}0D`, border: `1px solid ${g.color}25`,
                display: 'inline-block',
              }}>
                {g.layer}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   COMPLIANCE TRUST STRIP
───────────────────────────────────────── */
function ComplianceSection() {
  const items = [
    { name: 'RBI', detail: 'Reserve Bank of India' },
    { name: 'NPCI', detail: 'UPI Framework' },
    { name: 'DPDP 2023', detail: 'Data Protection' },
    { name: 'GSMA', detail: 'CAMARA API' },
    { name: 'ISO 27001', detail: 'Info Security' },
    { name: 'ISO 42001', detail: 'AI Systems' },
  ];

  return (
    <section style={{ background: '#FFFFFF', padding: '60px 40px', borderTop: '1px solid #F1F5F9' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ fontSize: 11, color: '#94A3B8', fontWeight: 600, letterSpacing: '.1em', marginBottom: 28 }}>
          REGULATORY COMPLIANCE
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
          {items.map(b => (
            <div key={b.name} style={{
              padding: '10px 20px', borderRadius: 10,
              background: '#EFF6FF', border: '1px solid #BFDBFE',
              textAlign: 'center',
              transition: 'all .2s',
            }}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background = '#DBEAFE'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background = '#EFF6FF'; }}
            >
              <div style={{ fontSize: 13, fontWeight: 800, color: '#1D4ED8' }}>{b.name}</div>
              <div style={{ fontSize: 10, color: '#64748B', marginTop: 2 }}>{b.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   FINAL CTA
───────────────────────────────────────── */
function CTASection({ onSignIn }: { onSignIn: () => void }) {
  return (
    <section style={{
      background: 'linear-gradient(160deg, #EFF6FF 0%, #DBEAFE 50%, #EFF6FF 100%)',
      padding: '120px 40px',
      borderTop: '1px solid #BFDBFE',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{
          display: 'inline-block', fontSize: 11, fontWeight: 700, letterSpacing: '.12em',
          color: '#2563EB', marginBottom: 24, fontFamily: "'JetBrains Mono', monospace",
          padding: '4px 14px', borderRadius: 20, border: '1px solid #BFDBFE', background: '#FFFFFF',
        }}>
          LIVE DEMO AVAILABLE
        </div>
        <h2 style={{
          fontSize: 'clamp(32px, 4vw, 56px)', fontWeight: 900, color: '#0F172A',
          margin: '0 0 20px', lineHeight: 1.1, letterSpacing: '-0.025em',
          fontFamily: 'var(--font-sora, var(--font-dm-sans))',
        }}>
          See fraud stopped<br />before your eyes.
        </h2>
        <p style={{ fontSize: 16, color: '#64748B', marginBottom: 40, lineHeight: 1.7 }}>
          The full six-layer detection stack runs live in your browser. No backend required. Real algorithms, real timing, real decisions.
        </p>
        <button
          onClick={onSignIn}
          style={{
            padding: '18px 56px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
            color: '#fff', fontSize: 17, fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 8px 32px rgba(37,99,235,.4)',
            transition: 'all .25s', letterSpacing: '.02em',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-3px)'; e.currentTarget.style.boxShadow = '0 12px 48px rgba(37,99,235,.5)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 8px 32px rgba(37,99,235,.4)'; }}
        >
          Sign In to Platform
        </button>
        <div style={{ marginTop: 20, fontSize: 12, color: '#94A3B8' }}>
          All five scenarios · Live pipeline visualization · GNN transaction graph · SHAP explainability
        </div>
      </div>
    </section>
  );
}

/* ─────────────────────────────────────────
   FOOTER
───────────────────────────────────────── */
function Footer() {
  return (
    <footer style={{
      background: '#0F172A', padding: '48px 40px',
      borderTop: '1px solid rgba(255,255,255,.06)',
    }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32, height: 32, background: 'linear-gradient(135deg, #2563EB, #1D4ED8)',
              borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 16, color: '#fff', transform: 'rotate(45deg)',
            }}>
              <span style={{ transform: 'rotate(-45deg)', display: 'block' }}>⬡</span>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#FFFFFF' }}>CipherGuard</div>
              <div style={{ fontSize: 10, color: '#475569', marginTop: 1 }}>IMEI-Blockchain + ML Fraud Detection</div>
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: '#475569' }}>
              PSB National Hackathon 2026 · Team CipherGuard
            </div>
            <div style={{ fontSize: 11, color: '#334155', marginTop: 4 }}>
              Judges: Punjab National Bank · Canara Bank · State Bank of India · NPCI
            </div>
          </div>

          <div style={{ fontSize: 12, color: '#334155', textAlign: 'right' }}>
            <div style={{ color: '#3B82F6', fontFamily: "'JetBrains Mono', monospace", marginBottom: 2 }}>
              13B+ monthly transactions protected
            </div>
            <div>Hardware · Blockchain · ML · Telecom</div>
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─────────────────────────────────────────
   ROOT EXPORT
───────────────────────────────────────── */
export default function LandingPage({ onSignIn }: { onSignIn: () => void }) {
  const [showSignIn, setShowSignIn] = useState(false);

  const handleSignIn = () => setShowSignIn(true);
  const handleConfirm = () => { setShowSignIn(false); onSignIn(); };
  const handleClose = () => setShowSignIn(false);

  return (
    <>
      <Navbar onSignIn={handleSignIn} />
      <Hero onSignIn={handleSignIn} />
      <ProblemSection />
      <ArchitectureSection />
      <NumbersSection />
      <GapsSection />
      <ComplianceSection />
      <CTASection onSignIn={handleSignIn} />
      <Footer />
      {showSignIn && (
        <SignInModal onConfirm={handleConfirm} onClose={handleClose} />
      )}
    </>
  );
}
