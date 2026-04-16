# CipherGuard — Master Build Prompt
## IMEI-Blockchain + ML Fraud Detection Platform
### Team CipherGuard | PSB National Hackathon 2026
### For: Claude Haiku (claude-haiku-4-5) | Single HTML File Output

---

## INSTRUCTION TO MODEL

You are building the complete, production-grade, fully functional single-page demo
application for Team CipherGuard's "IMEI-Blockchain + ML Fraud Detection Platform"
for a PSB National Hackathon (judges from PNB, Canara, SBI, NPCI).

Output: ONE complete self-contained HTML file. No external dependencies except
fonts and Chart.js from CDN. Works 100% offline when opened in Chrome.
Every button works. Every animation runs. Every score computes correctly.
This is a national hackathon final — it must be flawless.

---

## PART 1 — SYSTEM CONTEXT (read everything before writing code)

### What This Platform Is

India processes 13B+ UPI transactions/month — the world's largest real-time
payment network and its most targeted fraud surface.

**The core architectural flaw in every existing platform:**
All current fraud platforms (Protectt.ai, Bureau, Paytm Pi, Razorpay) authenticate
the SIM card, not the physical device. A SIM swap attack exploits this at Step 2
(MNO impersonation). Every ML model fires at Step 4 — after OTP delivery.
Structurally too late for sub-second UPI settlement.

**CipherGuard's solution:**
Hardware-anchor device identity via IMEI hash on a permissioned Hyperledger Fabric
blockchain shared across banks. Hash mismatch = BLOCK in <80ms, before OTP is
ever issued, before ML scoring queue is consulted.

**The five gaps this closes:**
- G1: SIM swap detection latency (4–120min → <80ms)
- G2: Binary SNA depth (SIM≠Device, porting/cloning invisible)
- G3: Social engineering blind spot (pre-txn manipulation undetectable)
- G4: Cold-start for new users (30-day baseline required → day-1 via cross-bank)
- G5: Cross-bank visibility gap (mule networks invisible to any single institution)

---

## PART 2 — FULL TECHNICAL ARCHITECTURE

### Six-Layer Stack

```
L1 — Device Fingerprint SDK (Android + iOS)
L2 — Hyperledger Fabric Blockchain (HashRegistrar + MismatchDetector + MuleDetector)
L3 — Telecom Context Enrichment (CAMARA SNA + bilateral MNO signals)
L4 — Signal Capture & Feature Engine (Protectt.ai Step 1–2 enriched)
L5 — ML Ensemble Scoring (LightGBM + LSTM + GNN + Isolation Forest)
L6 — Composite Decision Engine (APPROVE / STEP-UP / BLOCK)
```

### L1 — Device Fingerprint SDK

**Android:**
- Primary: `TelephonyManager.getImei()` — requires READ_PHONE_STATE, user grant on API 29+
- Secondary: `Settings.Secure.ANDROID_ID` — stable per user account
- Attestation anchor: `KeyStore API — KEY_HARDWARE_LEVEL_STRONG` — TEE-bound certificate
- Hash: `HMAC-SHA-256(IMEI || ANDROID_ID || attest_cert_thumbprint, server_salt)`
- server_salt: 32-byte CSPRNG, unique per customer, fetched over mTLS, cached in
  Android Keystore EncryptedSharedPreferences, NEVER written to disk in plaintext
- Raw IMEI zeroed from memory immediately after HMAC via `Arrays.fill()`
- Salt rotation: 90 days. On rotation: event_type=SALT_ROTATION, prior hash preserved

**iOS:**
- Primary: `DCDevice token` (DeviceCheck framework) — hardware-bound, Apple-verified
- Secondary: `UIDevice.identifierForVendor` (IDFV)
- Attestation anchor: `DCAppAttestService` (iOS 14+) — cryptographic proof of genuine hardware
- Hash: `HMAC-SHA-256(DCDevice_token || IDFV || appAttest_keyId, server_salt)`
- IMPORTANT: iOS does NOT expose raw IMEI to third-party apps. DeviceCheck is the
  correct hardware-bound equivalent. Never display "IMEI" for iOS in the UI —
  display "DeviceCheck Token (hardware-bound)"

**RASP Integrity Checks (must pass before hash submission):**

| Check | Detection Method | On Failure |
|-------|-----------------|------------|
| Root/su binary | RootBeer library + /system/bin/su scan | Reject hash, log INTEGRITY_FAILURE |
| Frida injection | Scan /proc/self/maps for frida-agent | Reject hash, terminate session |
| Emulator | Check Build.FINGERPRINT, QEMU props | Reject hash, log EMULATOR_DETECTED |
| Hardware attestation | Server-side cert chain vs Google roots | Reject, escalate STEP-UP |
| Clock tampering (>5min drift) | Compare device time vs NTP server | Reject, flag timestamp anomaly |

**SDK Communication:**
- Transport: HTTPS/mTLS 1.3 ONLY. Certificate pinned (SHA-256). No HTTP fallback.
- Timeout salt fetch: 3000ms hard. On failure: use cached salt (max 7-day stale).
- Timeout hash submit: 2000ms hard. On timeout: proceed with DEVICE_TRUSTED=false.
- SDK bundle: Android ≤2MB AAR, iOS ≤1.5MB XCFramework. No background polling.

### L2 — Blockchain Ledger

**Infrastructure:**
- Platform: Hyperledger Fabric 2.4+ with BFT consensus (BFT-SMaRt)
- Throughput: 5,000 TPS sustained / 10,000 TPS burst
- Finality: Sub-second deterministic (probabilistic finality architecturally unacceptable)
- Block: max 500 transactions, 500ms block timeout
- Node identity: HSM-backed X.509 certificates (PKCS#11 compliant)
- Data residency: ALL nodes within India (RBI data localisation mandate)

**On-Chain Data Schema (ZERO PII):**

| Field | Type | Description |
|-------|------|-------------|
| device_hash | bytes32 | HMAC-SHA-256 of composite fingerprint. Irreversible without salt. |
| customer_pseudonym | bytes32 | SHA-256(bank_id ‖ customer_id). No raw identity on-chain. |
| event_type | enum | REGISTRATION / LOGIN / TRANSACTION_INIT / DEVICE_CHANGE / DEREGISTRATION / SALT_ROTATION / INTEGRITY_FAILURE |
| bank_node_id | string(32) | Opaque consortium-assigned bank peer node ID |
| timestamp | uint64 | Unix epoch ms. Must be within ±300s of orderer wall clock. |
| prev_hash | bytes32 | HMAC of previous event for this pseudonym. O(1) change detection. |
| risk_flags | bitmap uint8 | Bit0:HASH_MISMATCH / Bit1:NEW_DEVICE / Bit2:HIGH_VELOCITY / Bit3:CROSS_BANK_SEEN / Bit4:MULE_SUSPECTED |
| telecom_risk_score | uint16 | 0–200 from L3. Written to ledger for audit. 0 if L3 not invoked. |
| tx_amount_band | enum | LOW(<1k) / MEDIUM(1k–10k) / HIGH(10k–100k) / VERY_HIGH(>100k) INR |

**Smart Contracts:**

`HashRegistrar.sol`
- First REGISTRATION: write baseline, risk_flags=0x00
- Subsequent REGISTRATION (DEVICE_CHANGE): emit DEVICE_CHANGE, risk_flags.NEW_DEVICE=1
  invoke bank webhook synchronously (max 500ms), await 2-of-3 orderer confirmation
- Re-registration within 24h of DEVICE_CHANGE → HIGH_VELOCITY flag
- Attestation cert validated by endorsing peer against Google/Apple roots

`MismatchDetector.sol`
- Executes on EVERY TRANSACTION_INIT
- Constant-time byte comparison (prevents timing oracle attack)
- MATCH: emit TrustConfirm, return DEVICE_TRUSTED=true, HASH_MATCH=true
- MISMATCH: risk_flags.HASH_MISMATCH=1, emit FraudAlert(HIGH_CONFIDENCE)
  invoke bank webhook within 80ms HARD SLA, return BLOCK immediately

`MuleDetector.sol`
- Asynchronous — runs as scheduled Fabric event listener, NOT on hot path
- Scan for device_hash appearing under ≥3 distinct bank_node_id in 48h window
- On detection: emit MULE_DEVICE_ALERT to all consortium members via event bus
- All banks receive alert via webhook within 5 minutes
- Confirmed mule hashes added to consortium shared blocklist (private data collection)
- Future MismatchDetector calls check blocklist FIRST

**Blockchain Event Bus:**

| Event | Producer | Consumer Action |
|-------|----------|----------------|
| TrustConfirm | MismatchDetector | L6: DEVICE_TRUSTED=true, proceed to ML |
| FraudAlert(HIGH_CONFIDENCE) | MismatchDetector | L6: fast-path BLOCK, webhook, freeze UPI 60min |
| DEVICE_CHANGE | HashRegistrar | Bank fraud team: notify customer, initiate step-up re-registration |
| MULE_DEVICE_ALERT | MuleDetector | All consortium banks: blocklist, block existing accounts |
| INTEGRITY_FAILURE | SDK via Gateway | L6: route to STEP-UP AUTH, log for RASP analytics |

### L3 — Telecom Context Enrichment

Runs as independent microservice, invoked IN PARALLEL with L2 on every TRANSACTION_INIT.
Must return TELECOM_RISK_SCORE within 60ms P95 (hard limit 100ms).
Timeout fallback: TELECOM_RISK_SCORE=0 with TELECOM_UNAVAILABLE=true flag.

**Signal Specifications:**

| Signal | Source | Score Contribution | Risk Threshold |
|--------|--------|--------------------|----------------|
| Inbound calls from unknown numbers (15-min window) | MNO CAMARA /call-volume | 0–80 linear | ≥3 calls: +40 / ≥6 calls: +80 |
| Active screen-share session | OS-level API (Android MediaProjection / iOS RPScreenRecorder) | 0 or 100 | Active = +100 (CRITICAL) |
| Clipboard VPA injected externally | SDK ContentResolver clipboard source tracking | 0 or 60 | Non-app source = +60 |
| SIM ICCID change since last session | TelephonyManager.getSimSerialNumber() delta | 0 or 80 | Change = +80 (CRITICAL) |
| Phone number ported within last 72h | MNO portability API / CAMARA /number-portability | 0 or 70 | Ported = +70 AND amount>10k: FAST PATH |

**Score Formula:**
```
TELECOM_RISK_SCORE = min(200, call_score + screen_share_score + clipboard_score + iccid_score + porting_score)
```
Score ≥160 triggers fast-path BLOCK regardless of device hash match result.

**MNO Integration Tiers:**
- Tier 1 — CAMARA SNA: Binary SIM presence, basic number verification. Available now from Jio, Airtel, Vi.
- Tier 2 — Bilateral: Call volume CDR, porting events, SIM reuse, ICCID history. PRIMARY COMPETITIVE MOAT.

### L4-L5 — ML Feature Engine & Ensemble Scoring

**New flags injected at Protectt.ai Step 2 (NO model retraining required):**

| Flag | Type | Source | ML Impact |
|------|------|--------|-----------|
| DEVICE_TRUSTED | boolean | L2 | Eliminates cold-start penalty |
| HASH_MATCH | boolean | L2 | First-time hash check modelling |
| CROSS_BANK_SEEN | boolean | L2 | Additional GNN graph edges |
| DAYS_SINCE_REGISTRATION | uint16 | L2 | Replaces 30-day baseline dependency |
| TELECOM_RISK_SCORE | uint16 0–200 | L3 | High importance for social engineering patterns |
| CALL_VOLUME_PRE_TXN | uint8 | L3 | Continuous feature |
| SCREEN_SHARE_ACTIVE | boolean | L3 | Critical social engineering indicator |
| PORTED_RECENTLY | boolean | L3 | Combined with HASH_MATCH → SIM swap vs port |
| ICCID_CHANGED | boolean | L1+L3 | Key SIM swap indicator |

**Models:**

| Model | Framework | Technical Notes |
|-------|-----------|----------------|
| Primary tabular | LightGBM/XGBoost | SHAP per inference. Class weight 1:500. <20ms P95. |
| Temporal behavioral | LSTM/Transformer encoder | Sequence 50 events max. 90s sliding window. |
| Graph mule detection | GNN — GraphSAGE or GAT | Inductive. CROSS_BANK_SEEN adds cross-institutional edges. Embedding refresh 15min. |
| Zero-day anomaly | Isolation Forest / One-Class SVM | Semi-supervised. Fires at 3σ deviation. |
| Meta-model | Logistic Regression | Final composite score 0–1000. Retrained monthly. |

**GNN Mathematical Foundation (RGCN — Relational Graph Convolutional Network):**

The transaction network is modelled as a Temporal Heterogeneous Graph:
G = (V, E) where V is partitioned into node types: {Account, Device, VPA}

RGCN update rule for node i:
```
h_i^(l+1) = σ( Σ_{r∈R} Σ_{j∈N_r(i)} (1/c_{i,r}) W_r^(l) h_j^(l) + W_0^(l) h_i^(l) )
```
Where:
- W_r^(l) = relation-specific weight matrix for relation r at layer l
- c_{i,r} = normalization constant
- R = {TRANSACTED_WITH, LOGGED_IN_FROM, SHARED_VPA, CROSS_BANK_SEEN}
- LOGGED_IN_FROM carries 3.2x higher risk weight than SHARED_VPA in trained model
- New CROSS_BANK_SEEN relation adds cross-institutional edges not possible in
  single-institution systems

**Federated Learning (FedAvg):**
Each bank k ∈ {1,...,K} holds local dataset D_k.
Global objective: F(w) = Σ_k (n_k/n) F_k(w)

FedAvg aggregation:
```
w_{t+1} = Σ_k (n_k/n) w^k_{t+1}
```
Local updates for E epochs before averaging at central server.
Sensitive transaction data NEVER leaves institutional firewalls.

### L6 — Composite Risk Scoring & Decision Engine

**Signal Weighting Matrix:**

| Signal | Weight | Score Range | Gap | Source |
|--------|--------|-------------|-----|--------|
| IMEI hash mismatch (L2) | 0.35 | 0–350 | G1, G2 | NEW — L2 |
| Telecom call volume (L3) | 0.20 | 0–200 | G3 | NEW — L3 |
| ML ensemble (Protectt.ai) | 0.20 | 0–200 | Existing | EXISTING |
| SIM ICCID change (L3) | 0.15 | 0–150 | G2 | NEW — L3 |
| Cross-bank device seen (L2) | 0.10 | 0–100 | G5 | NEW — L2 |
| **TOTAL** | **1.00** | **0–1000** | G1–G5 | Combined |

**Composite Score Formula:**
```javascript
composite = min(1000,
  (hash_mismatch ? 350 : 0) +          // L2: 0 or 350
  Math.round(telecom_score * 1.0) +     // L3: 0-200 (already scaled)
  Math.round(ml_base_score) +           // L5: 0-200 (random 40-120 for demo)
  (iccid_changed ? 150 : 0) +           // L3: 0 or 150
  (cross_bank_seen ? 100 : 0)           // L2: 0 or 100
)
```

**Decision Bands:**

| Score | Decision | System Actions |
|-------|----------|----------------|
| 0–299 | APPROVE | Transaction proceeds. Write TrustConfirm to blockchain. HTTP 200. |
| 300–599 | STEP-UP AUTH | Pause transaction. Biometric re-auth or Silent Network Auth. 60s timeout. On pass: APPROVE. On fail/timeout: BLOCK. |
| 600–1000 | BLOCK + ALERT | Block immediately. Push notification to registered device (NOT SIM). Freeze outbound UPI 30min. Open fraud case with blockchain audit trail. |

**Fast-Path Bypass Triggers (evaluated BEFORE ML queue):**

| Trigger | Technical Condition |
|---------|-------------------|
| SIM swap / device substitution | MismatchDetector emits FraudAlert(HIGH_CONFIDENCE) |
| Real-time screen-share | SCREEN_SHARE_ACTIVE=true AND TRANSACTION_INIT simultaneously |
| Recent port + high value | PORTED_RECENTLY=true AND tx_amount_band IN (HIGH, VERY_HIGH) |
| High telecom risk | TELECOM_RISK_SCORE ≥ 160 regardless of hash match |
| Mule on consortium blocklist | device_hash in shared blocklist → checked at hash submission |

**Performance SLAs:**

| Operation | P95 Target | P99 Hard Limit |
|-----------|-----------|----------------|
| SDK on-device hash computation | <5ms | <10ms |
| Hash submission to blockchain | <40ms | <80ms |
| Smart contract execution | <30ms | <60ms |
| Fast-path BLOCK (mismatch to webhook) | <80ms | <120ms |
| Telecom context fetch | <60ms | <100ms |
| ML ensemble scoring | <100ms | <200ms |
| Full-path decision | <180ms | <300ms |
| Blockchain throughput | 5,000 TPS | 10,000 TPS burst |

**Automated Response Actions:**

| Action | Technical Specification |
|--------|------------------------|
| Push notification | Firebase FCM (Android) / APNs (iOS). Destination: registered device endpoint, NOT SIM number. |
| UPI freeze | Bank webhook BLOCK event with freeze_duration_minutes=30. Bank CBS enforces. |
| Fraud case creation | Blockchain audit trail link, attacker device_hash, timestamp, IP, failed tx details, telecom signals. |
| ML feedback | Confirmed fraud → Protectt.ai Step 7 retraining pipeline within 24h. |

---

## PART 3 — PROTECTT.AI DETECTION PIPELINE (replicate core steps)

The demo must simulate the full Protectt.ai 7-step pipeline enriched with CipherGuard signals.

**Step 1 — Signal Capture** (at TRANSACTION_INIT):
Transaction metadata (amount, merchant, time, recipient VPA, channel),
device fingerprints (OS, device_id, screen_res, jailbreak/root status),
network identifiers (IP, VPN detection, carrier network),
behavioral inputs (typing cadence, swipe patterns, navigation flow, session duration).
NOW ENRICHED WITH: device_hash from L1, IMEI attestation from L2, telecom context from L3.

**Step 2 — Feature Computation** (<10ms):
Velocity metrics (txn-per-hour, cumulative amount in 1min/5min/1hr/24hr windows),
deviations from 30-day behavioral baseline,
device trust score (SIM binding state, root/jailbreak, RASP integrity),
graph-derived features (payee VPA node degree, mule hop count).
NOW ENRICHED WITH: DEVICE_TRUSTED, HASH_MATCH, TELECOM_RISK_SCORE, CROSS_BANK_SEEN,
DAYS_SINCE_REGISTRATION, SCREEN_SHARE_ACTIVE, PORTED_RECENTLY, ICCID_CHANGED.

**Step 3 — Parallel Model Inference**:
LightGBM on tabular features, LSTM/Transformer on session behavioral sequences,
GNN on VPA-to-VPA payment graph subgraph. Outputs: probability scores per model.

**Step 4 — Ensemble Scoring**:
Weighted meta-model combines model outputs → single risk score 0–1000.
SHAP values computed per inference (regulatory requirement for RBI audit trail).
Cost-sensitive learning: class weight 1:500 (fraud:legit).

**Step 5 — Decision Engine** (rule + ML orchestration):
BEFORE rule engine: check for FraudAlert(HIGH_CONFIDENCE) from L2 gRPC subscription.
ON RECEIPT: bypass ML output entirely, issue BLOCK immediately.
If no fast-path: apply score band logic (APPROVE/STEP-UP/BLOCK).

**Step 6 — Automated Response** (total latency 100–300ms):
Transaction block, push alert, step-up biometric/SNA, account hold.

**Step 7 — Feedback Loop**:
Confirmed fraud/false positive outcomes → retraining pipelines.
Blockchain-confirmed fraud cases (case_id CONFIRMED) → additional labeled rows within 24h.

---

## PART 4 — COMPETITOR COMPARISON

### FraudMesh (CipherGuard) vs Industry

| Feature / Capability | CipherGuard | Protectt.ai | Bureau | Paytm Pi | Razorpay |
|---------------------|-------------|-------------|--------|----------|----------|
| Core Approach | Behavioral + Graph + Causal AI + Hardware IMEI | Device + behavioral security | Risk scoring (multi-signal) | Centralized decision engine | Rule + ML fraud engine |
| Hardware IMEI Binding | ✅ YES — TEE-anchored | ❌ No | ❌ No | ❌ No | ❌ No |
| Cross-Bank Ledger | ✅ YES — Hyperledger Fabric consortium | ❌ No | ❌ No | ❌ No | ❌ No |
| Telecom CDR Signals | ✅ YES — bilateral MNO agreements (unique advantage) | ⚠️ SNA binary only | ❌ No | ❌ No | ❌ No |
| Social Engineering Detection | ✅ YES — pre-txn telecom context | ⚠️ Limited (app-layer only) | ⚠️ Basic | ❌ No | ❌ No |
| Real-time Detection | ✅ Advanced (agentic escalation) | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| Behavioral Modeling | ✅ SimCLR self-supervised | ✅ Yes | ⚠️ Basic | ⚠️ Limited | ⚠️ Limited |
| Graph-based Fraud Detection | ✅ Hyperbolic GNN (mule hierarchies) | ❌ No | ❌ No | ⚠️ Limited | ❌ No |
| Network / Mule Detection | ✅ Deep hierarchy + consortium | ❌ No | ⚠️ Partial | ⚠️ Partial | ❌ No |
| Causal AI (False Positive Reduction) | ✅ DoWhy | ❌ No | ❌ No | ❌ No | ❌ No |
| Agentic Decision System | ✅ Dynamic escalation | ❌ No | ❌ No | ⚠️ Rule-based | ⚠️ Rule-based |
| Explainability | ✅ Causal + SHAP signals | ⚠️ Limited | ⚠️ Limited | ⚠️ Partial | ⚠️ Limited |
| Fraud Type Coverage | Network + behavioral + SIM swap + social engineering | App/device fraud | Transaction-level | Ecosystem fraud | Payment fraud |
| Privacy Layer | ✅ Opacus + Federated Learning | ❌ No | ❌ No | ❌ No | ❌ No |
| Adaptability to New Fraud | ✅ Few-shot + contrastive learning | ⚠️ Moderate | ⚠️ Moderate | ⚠️ Moderate | ⚠️ Moderate |
| Cold-Start Solution | ✅ Cross-bank device history (day 1) | ❌ 30-day baseline required | ❌ No | ❌ No | ❌ No |
| Detection Before OTP | ✅ YES — <80ms fast path | ❌ Post-OTP | ❌ Post-OTP | ❌ Post-OTP | ❌ Post-OTP |

---

## PART 5 — WHAT TO BUILD (5 TABS + HEADER + OVERLAYS)

### AESTHETIC: "Quantum Fintech War Room"

```
Background:         #0A0E1A  (deep navy — NOT pure black)
Surface cards:      rgba(255,255,255,0.04) bg + 1px rgba(255,255,255,0.08) border
Primary accent:     #00D4AA  (electric teal — success/trust)
Danger:             #FF3B5C  (crimson — blocks/fraud)
Warning:            #FF9F1C  (amber — step-up)
Info:               #4A9EFF  (blue — informational)
Text primary:       #E8EDF5
Text secondary:     #8A95A8
Text tertiary:      #4A5568
Monospace font:     'JetBrains Mono' or 'Courier New' fallback
UI font:            'DM Sans' or system-ui fallback
Grid bg:            repeating-linear-gradient opacity 0.025
BLOCK glow:         box-shadow: 0 0 24px rgba(255,59,92,0.3)
APPROVE glow:       box-shadow: 0 0 24px rgba(0,212,170,0.25)
STEP-UP glow:       box-shadow: 0 0 24px rgba(255,159,28,0.25)
```

### HEADER (always visible, full width)

```
Left:  [CipherGuard logo — geometric diamond icon] "CipherGuard" 
       subtitle: "IMEI-Blockchain + ML Fraud Detection Platform"
Center: [RBI ✓] [NPCI ✓] [DPDP 2023 ✓] [GSMA ✓] [ISO 27001 ✓] [ISO 42001 ✓]
        — pill badges, teal color, subtle pulse animation
Right: "Team CipherGuard" | live clock (HH:MM:SS) | "PSB Hackathon 2026"
```

### SUBHEADER CALLOUT (always visible, below tabs)

Amber banner:
> "The attack succeeds at Step 2. Every current platform detects at Step 4.
> CipherGuard intercepts at Step 0 — before OTP, before ML scoring, before funds move."

### TAB 1 — DEVICE REGISTRATION

**Left panel — Registration Form:**
- Customer ID (input, default: "CUST_884712")
- Bank (select: SBI / HDFC Bank / ICICI Bank / Kotak Mahindra / PNB / Axis Bank / IndusInd)
- Platform (select: Android 14 Pixel 8 / Android 13 Samsung S23 / iOS 17 iPhone 15 / iOS 16 iPhone 13)
- Device identifier field:
  - If Android selected: label = "IMEI (raw — hashed on-device, never transmitted)"
    placeholder = "490154203237518"
  - If iOS selected: label = "Device UUID (iOS uses DCDevice token via Apple DeviceCheck — not raw IMEI)"
    placeholder = "DCDevice-A4F2B..." (grayed out, readonly)
- "Register Device to Blockchain" button (teal, full width)

**IMPORTANT iOS behaviour:** When iOS platform is selected, automatically:
- Change identifier field label to reflect DeviceCheck
- Change hash derivation displayed in result to: HMAC-SHA-256(DCDevice_token || IDFV || appAttest_keyId, salt)
- NEVER display "IMEI" for iOS — this is technically wrong and a judge will catch it

**Right panel — Animated Event Log (streams line by line with real ms timestamps):**

Log sequence (animate line by line, 80–200ms between lines):
```
[0ms]     RASP integrity checks initializing...
[45ms]    Root detection: PASS (RootBeer scan + /system/bin/su check)
[72ms]    Frida injection scan (/proc/self/maps): PASS
[89ms]    Emulator detection (Build.FINGERPRINT + QEMU props): PASS
[134ms]   Hardware attestation: TEE certificate generated (Android Keystore)
[156ms]   HMAC-SHA-256(IMEI || ANDROID_ID || attest_cert, server_salt) computing...
[162ms]   Raw IMEI zeroed from memory [Arrays.fill() — security compliance]
[201ms]   mTLS 1.3 handshake with Bank Salt Service...
[234ms]   server_salt fetched (32-byte CSPRNG, cached in EncryptedSharedPreferences)
[287ms]   REGISTRATION event → HashRegistrar.sol via bank gateway
[334ms]   Orderer confirmation: BFT consensus 3/3 nodes
[378ms]   Attestation cert validated against Google attestation roots: PASS
[401ms]   Baseline hash written to world state (CouchDB)
[422ms]   ✓ Fabric TX committed — device registered to consortium
```

**Below log — Blockchain Record Card (appears after completion):**
```
device_hash:          [deterministic 64-char hex from IMEI input]
customer_pseudonym:   [6-char hex]...[4-char hex]
event_type:           REGISTRATION
risk_flags:           0x00 (clean — no flags set)
attestation:          [Android: TEE Hardware / iOS: App Attest — Apple verified]
RASP integrity:       PASS — root:NO frida:NO emulator:NO
salt_ttl:             90 days (rotation scheduled)
bank_node_id:         [bank]-NODE-[random 4 chars]
Fabric TX ID:         [12-char hex]...
Block number:         [random 6-digit number]
Orderer confirmation: 2026-04-15T[time]Z — 3/3 BFT nodes
```

**Hash determinism:** Implement djb2 hash on IMEI string → convert to 64-char hex.
Same IMEI → always same hash. Show this visually by letting judges type the same IMEI twice.

### TAB 2 — SIM SWAP ATTACK SIMULATOR

**Top narrative banner (always visible in this tab):**
> "In this simulation, the attacker already has the victim's SIM card in a new device.
> They know the victim's UPI credentials. Watch what happens when they initiate a transaction."

**Two-panel side-by-side layout:**

Left panel — "VICTIM'S REGISTERED DEVICE" (green border):
- Shows: registered IMEI/device identifier (from Tab 1 if run, else default)
- Shows: registered hash (green, labeled "BASELINE — written to blockchain")
- Shows: bank, customer ID, registration timestamp
- Status badge: "TRUSTED DEVICE ✓"

Right panel — "ATTACKER'S DEVICE" (red border):
- Editable IMEI field (default: different value from victim's)
- Computed hash shown live as IMEI is typed (red, labeled "ATTACKER HASH — DIFFERENT")
- Shows computed hash side-by-side with victim hash so mismatch is visually obvious
- Label: "New device, victim's SIM inserted"

**Transaction config (between panels):**
- Amount band selector: LOW (₹500) / MEDIUM (₹5,000) / HIGH (₹45,000 default) / VERY_HIGH (₹1,20,000)
- Destination VPA input (default: "fraudster@ybl")

**"LAUNCH SIM SWAP ATTACK" button** (full-width red button with pulsing border)

**Attack Timeline (animates line by line, each with exact ms timestamp):**
```
+0ms     TRANSACTION_INIT received from attacker device
+6ms     L1 SDK: HMAC-SHA-256 computed from attacker IMEI
+9ms     Attacker device_hash: [HASH_A]
+12ms    Victim baseline hash:  [HASH_V]
+14ms    ⚡ Hash comparison initiated — MismatchDetector.sol
+19ms    Submitting to blockchain gateway via mTLS 1.3...
+26ms    HashRegistrar lookup: customer_pseudonym found (registered at [bank])
+31ms    ████████████████ HASH MISMATCH DETECTED ████████████████
+34ms    risk_flags.HASH_MISMATCH = 1
+37ms    FraudAlert(HIGH_CONFIDENCE) emitted → consortium event bus
+41ms    L6 Decision Engine: ⚡ FAST PATH TRIGGERED
+43ms    ML scoring queue: *** BYPASSED — NOT CONSULTED ***
+45ms    OTP generation:   *** CANCELLED — NOT ISSUED ***
+48ms    Decision: BLOCK (composite_score = 1000)
+52ms    UPI transaction: REJECTED — funds NOT moved
+55ms    Bank webhook fired → outbound UPI frozen (60 min)
+61ms    Push notification → victim's registered device (NOT SIM number)
+67ms    Fraud case #[ID] created with full blockchain audit trail
+71ms    ✓ ATTACK PREVENTED IN 71ms — attacker never reached OTP stage
```

**Final result card (appears after timeline completes):**
- PATHWAY: SMART CONTRACT FAST PATH
- HASH_MATCH: FALSE
- ML QUEUE: SKIPPED
- OTP ISSUED: NO
- DECISION: BLOCK (big red BLOCKED stamp with glow)
- COMPOSITE SCORE: 1000/1000
- LATENCY: [X]ms (always 62–78ms)
- VICTIM NOTIFIED: Push to registered device endpoint (not SIM)
- UPI STATUS: Frozen 60 minutes
- CASE ID: CG-[random 8 chars]
- FABRIC TX ID: [12-char hex]...

**Below result — comparison callout:**
"Current industry standard: 4–120 minutes. CipherGuard: 71ms.
The attacker's transaction failed before they reached the OTP stage.
This is architecturally impossible on any existing Indian UPI fraud platform."

### TAB 3 — SOCIAL ENGINEERING DETECTOR

**Left panel — Live Signal Configuration (all controls update score in real-time, no button needed):**

Controls:
1. Slider: "Unknown inbound calls (15-min window)" — 0 to 10
   Show: call count, computed call_score, risk label
   ≥6 calls: +80, ≥3 calls: +40, else linear
2. Toggle: "Screen share active during transaction" — OFF/ON
   ON = +100, show "(CRITICAL — attacker watching screen)"
3. Toggle: "Clipboard VPA injected from external source" — OFF/ON
   ON = +60, show "(attacker injected destination account)"
4. Toggle: "SIM ICCID changed since last session" — OFF/ON
   ON = +80, show "(SIM swap may have occurred)"
5. Toggle: "Phone number ported in last 72 hours" — OFF/ON
   ON = +70, show "(porting = SIM swap mechanism)"
6. Dropdown: Transaction amount band (LOW / MEDIUM default / HIGH / VERY_HIGH)

Default state on tab load: calls=5, screen=ON, clipboard=ON, iccid=OFF, ported=OFF
This ensures TELECOM_RISK_SCORE starts at 220→capped 200 so fast path is pre-triggered.

**Right panel — Live Score Display (updates every time any control changes):**

TELECOM_RISK_SCORE gauge (0–200):
- Animated horizontal bar with gradient fill
- Color: green(0–79) → amber(80–159) → red(160–200)
- Show each signal contribution as a breakdown:
  Call volume score: +[X]
  Screen share:      +[X]
  Clipboard:         +[X]
  ICCID change:      +[X]
  Porting:           +[X]
  ─────────────────
  TOTAL:             [X] / 200

When score ≥160: show pulsing red badge "⚡ FAST PATH WILL TRIGGER"

COMPOSITE SCORE gauge (0–1000):
- Updates live based on: telecom_score + ml_base(fixed 85 for demo) + iccid(if toggled)
- Show decision band indicator: which zone (APPROVE/STEP-UP/BLOCK) current score falls in
- Three colored zones visible on the bar

**"RUN TRANSACTION CHECK" button:**
Triggers a full pathway simulation with:
- If TELECOM_RISK_SCORE ≥ 160: fast path animation (same style as Tab 2 but telecom-triggered)
- Else if composite ≥ 600: ML full path → BLOCK
- Else if composite ≥ 300: ML full path → STEP-UP AUTH
- Else: ML full path → APPROVE

Show which specific pathway was taken and why.
Show SHAP feature importance for top 5 signals (mock values that are realistic).

**Gap callout:** "This closes G3 — Social Engineering Blind Spot.
No existing platform can detect pre-transaction manipulation.
The telecom context layer is the ONLY mechanism that captures this signal."

**Telecom moat callout:**
"Bilateral MNO data-sharing agreements with Jio/Airtel are our primary competitive moat.
Bureau: ❌ No telecom signals. Protectt.ai: ⚠️ SNA binary only (SIM present? yes/no).
CipherGuard: ✅ Full pre-transaction behavioral context from the voice network."

### TAB 4 — CROSS-BANK MULE DETECTION

**Visual layout: SVG consortium network diagram + event log side by side**

Network diagram (left):
- Shows bank nodes as circles (SBI=green, HDFC=blue, ICICI=purple, Kotak=amber, PNB=red)
- Central node: "CipherGuard Consortium Ledger" (teal diamond)
- Lines connect banks to central ledger
- Initially: only SBI node is "active" (bright, labeled "Device registered 2hrs ago")
- Other banks: dimmed/inactive

Event log (right):
- Monospace dark box
- Initial: "MuleDetector.sol listening on consortium event bus..."

**"Register at another bank (+1)" button:**
Each click:
- Activates next bank node with animation (node brightens, connection line draws)
- Adds to event log: "[timestamp] REGISTRATION: device_hash a3f7c91b... @ [Bank N] (node N)"
- Bank counter badge updates: "Same device seen at: N banks"
- At 3 banks: warning badge appears: "⚠️ MuleDetector threshold reached (≥3 banks in 48h)"
- Button label changes: "Add more banks (optional)"
- "TRIGGER MULE DETECTOR SCAN" button appears (red, pulsing)

When ≥5 banks registered: show "Mule network confirmed — fraud ring visible"

**"TRIGGER MULE DETECTOR SCAN" button:**
Animation sequence in event log (line by line):
```
[+0ms]    MuleDetector.sol: initiating 48-hour sliding window scan...
[+180ms]  Scanning consortium ledger for duplicate device_hash entries...
[+420ms]  ⚡ ALERT: device_hash a3f7c91b... found at [N] distinct bank nodes
[+450ms]  Timestamp analysis: all registrations within 48-hour window: CONFIRMED
[+470ms]  Threshold exceeded (≥3 banks) — MULE_DEVICE_ALERT emitting...
[+490ms]  Broadcasting to all [N] consortium members via event bus...
[+510ms]  Webhook → SBI fraud team: DELIVERED ✓
[+520ms]  Webhook → HDFC Bank fraud team: DELIVERED ✓
[+530ms]  Webhook → [all banks]: DELIVERED ✓
[+560ms]  Hash a3f7c91b... added to consortium shared blocklist
[+580ms]  All future TRANSACTION_INIT for this device_hash: AUTO-BLOCK
[+600ms]  Existing accounts linked to this hash: FLAGGED for review
[+620ms]  ✓ MULE DEVICE NETWORK NEUTRALIZED — [N] banks protected
```

Network diagram: all active bank nodes flash red simultaneously, then show red X badge.
Central node changes label to "MULE BLOCKLIST UPDATED".

**Result card:**
- Hash seen at: N bank nodes
- Alert sent to: [list all banks]
- Action: Added to consortium shared blocklist
- Future transactions: AUTO-BLOCKED at hash check
- No PII shared: ✓ Coordination via pseudonymous hashes only
- (big badge) "MULE DEVICE BLOCKED CONSORTIUM-WIDE"

**Gap callout:**
"This closes G5 — Cross-Bank Visibility Gap.
Before CipherGuard: a fraud ring using 5 different UPI apps across 5 banks
was completely invisible to any single institution's model.
Now: one hash mismatch anywhere → all banks know within 5 minutes."

### TAB 5 — LIVE OPERATIONS DASHBOARD

**Row 1 — 4 Metric Cards (update from all tab actions):**
- Transactions Processed: [count] (increments on every scenario run)
- Fraud Blocked: [count] (increments on BLOCK decisions + mule detections)
- Step-Ups Triggered: [count] (increments on STEP-UP decisions)
- Avg Latency: [X]ms (running average of all completed scenario latencies)

**Row 2 — Two panels:**

Left: "Real-Time Event Feed"
- Scrollable monospace log of all actions from all tabs
- Color coded: green=APPROVE, red=BLOCK, amber=STEP-UP, blue=REGISTRATION, purple=MULE

Right: "Signal Weight Matrix"
- 5 horizontal bars showing weights:
  IMEI hash mismatch (L2)  0.35 [████████████░░░░░░░░] 35%  Gap: G1,G2
  Telecom call volume (L3) 0.20 [████████░░░░░░░░░░░░] 20%  Gap: G3
  ML ensemble (L5)         0.20 [████████░░░░░░░░░░░░] 20%  Existing
  SIM ICCID change (L3)    0.15 [██████░░░░░░░░░░░░░░] 15%  Gap: G2
  Cross-bank seen (L2)     0.10 [████░░░░░░░░░░░░░░░░] 10%  Gap: G5
- Decision band visual: [0─────299|300─────599|600─────1000]
                                APPROVE   STEP-UP    BLOCK

**Row 3 — Gap Closure Tracker (5 cards):**

G1: "SIM Swap Latency"
- Status: CLOSED ✓
- Layer: L2 Blockchain
- Before: 4–120 minutes
- After: <80ms
- Mechanism: Smart contract fast path

G2: "SNA Verification Depth"
- Status: CLOSED ✓
- Layer: L1 + L3
- Before: SIM presence only (binary)
- After: Hardware-anchored IMEI + ICCID + porting

G3: "Social Engineering"
- Status: CLOSED ✓
- Layer: L3 Telecom Enrichment
- Before: ~15% detection rate
- After: >55% detection rate

G4: "Cold-Start"
- Status: CLOSED ✓
- Layer: L2 Blockchain
- Before: 30-day behavioral baseline required
- After: Cross-bank device history from day 1

G5: "Cross-Bank Visibility"
- Status: CLOSED ✓
- Layer: L2 Consortium Ledger
- Before: Each institution sees only its own data
- After: Consortium-wide pseudonymous device registry

**Row 4 — Performance SLA Monitor:**
Show as a table with live values from completed scenarios:

| Operation | Target | Actual (last run) | Status |
|-----------|--------|-------------------|--------|
| SDK hash computation | <5ms | [X]ms | PASS ✓ |
| Blockchain submission | <40ms | [X]ms | PASS ✓ |
| Smart contract exec | <30ms | [X]ms | PASS ✓ |
| Fast-path BLOCK | <80ms | [X]ms | PASS ✓ |
| Telecom context | <60ms | [X]ms | PASS ✓ |
| ML ensemble | <100ms | [X]ms | PASS ✓ |
| Full-path decision | <180ms | [X]ms | PASS ✓ |
| Blockchain TPS | 5,000 | 5,247 | PASS ✓ |

**Row 5 — GNN Mathematical Foundation Panel:**

Title: "Graph Neural Network — Technical Architecture"

Show formatted:
```
Temporal Heterogeneous Graph: G = (V, E)
Node types V: {Account, Device, VPA}
Relation types R: {TRANSACTED_WITH, LOGGED_IN_FROM, SHARED_VPA, CROSS_BANK_SEEN}

RGCN Update Rule:
hᵢ⁽ˡ⁺¹⁾ = σ( Σᵣ∈ᴿ Σⱼ∈ᴺᵣ₍ᵢ₎ (1/cᵢᵣ) Wᵣ⁽ˡ⁾hⱼ⁽ˡ⁾ + W₀⁽ˡ⁾hᵢ⁽ˡ⁾ )

Wᵣ = relation-specific weight matrix
cᵢᵣ = normalization constant (prevents high-degree nodes dominating)
LOGGED_IN_FROM weight: 3.2x higher than SHARED_VPA (trained on IEEE-CIS + PaySim)
NEW: CROSS_BANK_SEEN relation adds cross-institutional edges
     (impossible in any single-institution system)

FedAvg Aggregation (Privacy-Preserving):
w_{t+1} = Σₖ (nₖ/n) wₖ_{t+1}

Each bank trains locally for E epochs.
Central server aggregates weight updates only.
Zero raw transaction data leaves institutional firewalls.
DPDP Act 2023 compliant. RBI data localisation compliant.
```

**Row 6 — Competitor Comparison Table:**
Full table from Part 4 above. CipherGuard column all green. Others mixed.
Make it scrollable horizontally on small screens.

**Row 7 — Training Datasets:**
Two cards:
1. PaySim/MoMTSim
   - Source: Kaggle
   - Size: 6.3M synthetic mobile money transactions
   - Fraud rate: 0.13%
   - Used for: LightGBM tabular model training, velocity feature calibration
   - Download: `kaggle datasets download -d ealaxi/paysim1`

2. IEEE-CIS Fraud Detection
   - Source: Kaggle (IEEE Computational Intelligence Society)
   - Size: 590K transactions, 434 features
   - Type: Identity-transaction graph benchmark
   - Used for: GNN GraphSAGE node embedding training, VPA graph structure
   - Download: `kaggle competitions download -c ieee-fraud-detection`

### FLOATING ? HELP PANEL

Button: fixed bottom-right, "?" circle, teal background.
Click: overlay panel slides in from right.

Content:
```
LOCAL DEMO (recommended)
────────────────────────
1. Save this file as index.html
2. Open in Chrome (no server needed)
3. All functionality works offline

STATIC HOSTING (30-second backup deploy)
──────────────────────────────────────────
Vercel:  drag index.html to vercel.com/new → live URL
Netlify: drag to netlify.com/drop → instant URL
GitHub Pages: push → Settings → Pages → Deploy from main

FULL BACKEND (production integration)
──────────────────────────────────────
pip install fastapi uvicorn lightgbm numpy pandas
uvicorn app:app --host 0.0.0.0 --port 8000
POST /v1/device/register
POST /v1/transaction/check
Change API_BASE = 'http://localhost:8000' in JS config

DATASETS
────────
PaySim:    kaggle datasets download -d ealaxi/paysim1
IEEE-CIS:  kaggle competitions download -c ieee-fraud-detection
Place in /data/ folder

JUDGE Q&A
──────────
"Can IMEI be spoofed?" → TEE attestation. Can't fake without hardware compromise.
"iOS has no IMEI?" → We use DCDevice (DeviceCheck). Functionally equivalent.
"Who runs the nodes?" → Each bank runs its own. BFT requires 2/3 honest.
"DPDP compliant?" → Zero PII on-chain. Pseudonymous hashes only.
"vs Protectt.ai?" → They detect at Step 4. We detect at Step 0.
```

---

## PART 6 — JAVASCRIPT STATE MANAGEMENT

Implement a global state object:
```javascript
const STATE = {
  registeredDevices: {},   // hash map: customerID → device_hash
  dashboardMetrics: { txn: 0, blocked: 0, stepup: 0, latencies: [] },
  eventLog: [],
  slaValues: {},
};
```

Rules:
- Tab 1 completion: registeredDevices[customerID] = computed_hash; metrics.txn++
- Tab 2 attack: metrics.txn++; metrics.blocked++; slaValues.fastPath = latency
- Tab 3 BLOCK: metrics.txn++; metrics.blocked++
- Tab 3 STEP-UP: metrics.txn++; metrics.stepup++
- Tab 3 APPROVE: metrics.txn++
- Tab 4 mule: metrics.txn++; metrics.blocked++
- All completions: eventLog.push(entry); dashboard updates in real-time
- Avg latency = latencies.reduce(sum) / latencies.length

Hash determinism (djb2):
```javascript
function deterministicHash(str) {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash = hash & 0xFFFFFFFF;
  }
  // Convert to 64-char hex
  const h = Math.abs(hash).toString(16).padStart(8,'0');
  return (h+h+h+h+h+h+h+h).substring(0,64);
}
```

---

## PART 7 — OUTPUT REQUIREMENTS

1. Single complete HTML file — open in Chrome, works offline
2. All 5 tabs fully functional with all animations
3. Dashboard reflects all scenario runs in real-time
4. Dark "war room" aesthetic throughout — no light surfaces
5. No placeholder text — every field has real content from this spec
6. IMEI handled correctly for both Android (IMEI) and iOS (DeviceCheck token)
7. Hash is deterministic — same input always same output
8. All fast-path scenarios show <80ms total
9. Composite score computed using the exact weighting matrix
10. GNN math displayed correctly with Unicode superscripts
11. Competitor table complete with all rows
12. Compliance badges always visible in header
13. ? help panel functional
14. Mobile responsive (min 768px)
15. Live clock in header

---

## TEAM & BRANDING

```
Team Name:    CipherGuard
Product:      IMEI-Blockchain + ML Fraud Detection Platform
Tagline:      "Hardware-Anchored, Blockchain-Federated Device Identity fused with
               Real-Time ML Ensemble Scoring for UPI & Digital Payment Security"
Event:        PSB National Hackathon 2026
Compliance:   RBI/NPCI Compliant UPI Security Layer
Target:       Banks, PSPs, NBFCs, MNOs
Key stat:     "13B+ monthly UPI transactions. 400M+ users. 4–120min current lag → <80ms."
Anchor line:  "Current platforms detect at Step 4. CipherGuard detects at Step 0."
```

---

*End of build prompt. Output the complete single HTML file now.*
