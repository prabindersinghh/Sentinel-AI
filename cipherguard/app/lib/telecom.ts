// Telecom enrichment signal generation
export function generateTelecomSignals(window: '15min' | '24h') {
  // Inbound calls
  const inboundCalls = window === '15min'
    ? Math.floor(Math.random() * 8)
    : Math.floor(Math.random() * 30);

  let callScore = 0;
  if (inboundCalls >= 6) callScore = 80;
  else if (inboundCalls >= 3) callScore = 40;

  // Screen share (10% chance in demo)
  const screenShare = Math.random() < 0.1;

  // VPA clipboard (15% chance)
  const clipboardVPA = Math.random() < 0.15;

  // SIM ICCID change (5% chance)
  const simIccidChange = Math.random() < 0.05;

  // Number porting (3% chance)
  const numberPorting = Math.random() < 0.03;

  let portingScore = 0;
  if (numberPorting) {
    portingScore = 70;
  }

  const totalScore = Math.min(
    200,
    callScore +
      (screenShare ? 100 : 0) +
      (clipboardVPA ? 60 : 0) +
      (simIccidChange ? 80 : 0) +
      portingScore
  );

  const riskLevel =
    totalScore >= 160
      ? 'CRITICAL - FAST-PATH BLOCK'
      : totalScore >= 100
      ? 'HIGH RISK'
      : totalScore >= 50
      ? 'MEDIUM RISK'
      : 'NORMAL';

  return {
    inboundCalls,
    callScore,
    screenShare,
    clipboardVPA,
    simIccidChange,
    numberPorting,
    portingScore,
    totalScore,
    riskLevel,
  };
}
