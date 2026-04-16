// Blockchain ledger simulation
export function registerDeviceOnBlockchain() {
  const generateHex = (bytes: number) =>
    Array.from({ length: bytes }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

  const eventTypes = [
    'REGISTRATION',
    'LOGIN',
    'TRANSACTION_INIT',
    'DEVICE_CHANGE',
    'DEREGISTRATION',
  ];

  const riskFlagCombos = [
    [],
    ['HASH_MISMATCH'],
    ['NEW_DEVICE'],
    ['HIGH_VELOCITY'],
    ['CROSS_BANK_SEEN'],
    ['MULE_SUSPECTED'],
  ];

  const transactionId = generateHex(32);
  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const riskFlags = riskFlagCombos[Math.floor(Math.random() * riskFlagCombos.length)];

  return {
    transactionId,
    eventType,
    deviceHash: generateHex(32),
    customerPseudonym: generateHex(32),
    timestamp: new Date().toISOString(),
    riskFlags,
    status: riskFlags.length > 0 ? 'PENDING_REVIEW' : 'CONFIRMED',
    gasUsed: Math.floor(Math.random() * 100000) + 20000,
  };
}

export function simulateBlockchainEvents(
  scenario: 'MISMATCH' | 'MULE'
) {
  const events: string[] = [];

  if (scenario === 'MISMATCH') {
    events.push('📊 SDK: Hash submission to blockchain gateway...');
    events.push('⛓️ Ledger: HashRegistrar contract invoked');
    events.push('🔍 Ledger: Comparing device_hash with stored baseline');
    events.push('🚨 Ledger: HASH MISMATCH DETECTED');
    events.push('⚡ MismatchDetector: FraudAlert(HIGH_CONFIDENCE) emitted');
    events.push('📢 EventBus: Broadcasting to all consortium members');
    events.push('🏦 Webhook: Bank fraud team receiving alert');
    events.push('❌ Decision: BLOCK immediate (fast-path, &lt;80ms)');
    events.push('🔒 Banking: UPI outbound frozen for 30min');
    events.push('📋 Case: Fraud case opened with blockchain audit trail');
  } else if (scenario === 'MULE') {
    events.push('📊 MuleDetector: Scanning last 48h device_hash patterns');
    events.push('🔍 Ledger: device_hash appearing under 3+ bank_node_ids');
    events.push('🚨 Alert: MULE_DEVICE_ALERT emitted');
    events.push('📢 EventBus: Broadcasting to all consortium members (5min SLA)');
    events.push('🔗 Ledger: Adding device_hash to shared consortium blocklist');
    events.push('🏦 Banks: All institutions receiving blocklist update');
    events.push('⚠️ Future: MismatchDetector will check blocklist FIRST');
  }

  return events;
}
