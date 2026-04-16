// Risk decision computation
export function computeCompositeScore(
  amount: number,
  triggers: {
    hashMismatch: boolean;
    screenShare: boolean;
    recentPort: boolean;
    telecomRisk: boolean;
    muleBlocklist: boolean;
  }
) {
  // Determine amount band
  let amountBand: string;
  if (amount < 1000) amountBand = 'LOW';
  else if (amount < 10000) amountBand = 'MEDIUM';
  else if (amount < 100000) amountBand = 'HIGH';
  else amountBand = 'VERY_HIGH';

  // Initialize scores
  let hashMismatchScore = triggers.hashMismatch ? 350 : 0;
  let telecomScore = triggers.telecomRisk ? 160 : Math.floor(Math.random() * 80);
  let mlBaseScore = Math.floor(Math.random() * 120 + 40);
  let iccidScore = triggers.hashMismatch ? 150 : 0;
  let crossBankScore = triggers.muleBlocklist ? 100 : 0;

  // Check for fast-path triggers BEFORE computing composite
  let fastPathTrigger: string | null = null;

  if (triggers.hashMismatch) {
    fastPathTrigger = 'Hash Mismatch (MismatchDetector)';
  } else if (triggers.screenShare) {
    fastPathTrigger = 'Real-time Screen Share (CRITICAL)';
  } else if (triggers.recentPort && amount > 100000) {
    fastPathTrigger = 'Recent Port + High Value (>100k)';
  } else if (triggers.telecomRisk) {
    fastPathTrigger = 'Telecom Risk ≥160 (bypasses hash match)';
  } else if (triggers.muleBlocklist) {
    fastPathTrigger = 'Mule Consortium Blocklist';
  }

  // Compute composite score (capped at 1000)
  const compositeScore = Math.min(
    1000,
    hashMismatchScore + telecomScore + mlBaseScore + iccidScore + crossBankScore
  );

  // Determine decision
  let decision: 'APPROVE' | 'STEP-UP' | 'BLOCK';
  if (fastPathTrigger && compositeScore >= 300) {
    decision = 'BLOCK';
  } else if (compositeScore >= 600) {
    decision = 'BLOCK';
  } else if (compositeScore >= 300) {
    decision = 'STEP-UP';
  } else {
    decision = 'APPROVE';
  }

  // Risk band description
  let riskBand: string;
  if (compositeScore < 300) {
    riskBand = 'LOW RISK - Standard Processing';
  } else if (compositeScore < 600) {
    riskBand = 'MEDIUM RISK - Enhanced Verification Required';
  } else {
    riskBand = 'HIGH RISK - Immediate Block & Investigation';
  }

  // Breakdown for visualization
  const breakdown = [
    {
      label: 'IMEI Hash Mismatch (L2)',
      value: hashMismatchScore,
      weight: 0.35,
    },
    {
      label: 'Telecom Risk (L3)',
      value: telecomScore,
      weight: 0.2,
    },
    {
      label: 'ML Ensemble (L5)',
      value: mlBaseScore,
      weight: 0.2,
    },
    {
      label: 'SIM ICCID Change (L3)',
      value: iccidScore,
      weight: 0.15,
    },
    {
      label: 'Cross-Bank Device (L2)',
      value: crossBankScore,
      weight: 0.1,
    },
  ];

  // System actions
  const actions: string[] = [];

  if (decision === 'APPROVE') {
    actions.push('✓ Transaction proceeds immediately');
    actions.push('📝 Write TrustConfirm to blockchain');
    actions.push('📊 HTTP 200 response to UPI gateway');
  } else if (decision === 'STEP-UP') {
    actions.push('⏸️ Pause transaction (60s timeout)');
    actions.push(
      '🔐 Request biometric re-auth or Silent Network Auth (SNA)'
    );
    actions.push('✓ On successful auth: APPROVE and proceed');
    actions.push('❌ On failure/timeout: BLOCK');
  } else {
    actions.push('❌ Block transaction immediately');
    actions.push('🔔 Push notification to registered device (NOT SIM)');
    actions.push('🔒 Freeze outbound UPI for 30min');
    actions.push('📋 Open fraud case with blockchain audit trail');
    actions.push('📞 Fraud team alerted with device_hash, signals, timestamp');
    actions.push('🌐 Broadcast MULE_DEVICE_ALERT to consortium (if mule)');
  }

  return {
    transactionId: `TXN_${Date.now().toString(36).toUpperCase()}`,
    amount,
    amountBand,
    hashMismatch: triggers.hashMismatch,
    telecomScore,
    mlScore: mlBaseScore,
    iccidChanged: triggers.hashMismatch,
    crossBankSeen: triggers.muleBlocklist,
    compositeScore,
    decision,
    riskBand,
    fastPathTrigger,
    breakdown,
    actions,
  };
}
