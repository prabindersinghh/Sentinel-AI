// Device fingerprint generation utilities
export function generateDeviceFingerprint(platform: 'Android' | 'iOS' | 'Web') {
  const generateHex = (bytes: number) =>
    Array.from({ length: bytes }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

  let primaryId: string;
  let secondaryId: string;

  if (platform === 'Android') {
    // Simulated IMEI (15 digits)
    primaryId = Array.from({ length: 15 }, () =>
      Math.floor(Math.random() * 10)
    ).join('');
    // Android ID (64 hex chars)
    secondaryId = generateHex(32);
  } else {
    // DeviceCheck Token
    primaryId = generateHex(32);
    // IDFV (UUID format)
    secondaryId = [
      generateHex(8),
      generateHex(4),
      generateHex(4),
      generateHex(4),
      generateHex(12),
    ].join('-');
  }

  // Generate 32-byte salt (256 bits)
  const salt = generateHex(32);

  // Generate IMEI hash (simulated HMAC-SHA-256)
  const imeiHash = generateHex(64);

  // RASP checks
  const raspassStatus = {
    root: 'PASS',
    frida: 'PASS',
    emulator: 'PASS',
    attestation: 'PASS',
    clockTampering: 'PASS',
  };

  return {
    platform,
    primaryId,
    secondaryId,
    attestationStatus:
      platform === 'Android'
        ? 'KeyStore API — KEY_HARDWARE_LEVEL_STRONG'
        : 'DCAppAttestService (iOS 14+)',
    imeiHash,
    salt,
    raspassStatus,
  };
}
