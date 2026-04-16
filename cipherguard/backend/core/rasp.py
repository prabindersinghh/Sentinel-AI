def run_rasp_checks(platform: str, flags: dict) -> dict:
    checks = {}
    passed = True
    reason = None
    # Root
    checks['root'] = {
        'result': 'FAIL' if flags.get('root_detected', False) else 'PASS',
        'method': 'RootBeer + /system/bin/su scan'
    }
    if checks['root']['result'] == 'FAIL':
        passed = False
        reason = 'ROOT_DETECTED'
    # Frida
    checks['frida'] = {
        'result': 'FAIL' if flags.get('frida_detected', False) else 'PASS',
        'method': '/proc/self/maps scan'
    }
    if checks['frida']['result'] == 'FAIL' and not reason:
        passed = False
        reason = 'FRIDA_DETECTED'
    # Emulator
    checks['emulator'] = {
        'result': 'FAIL' if flags.get('emulator_detected', False) else 'PASS',
        'method': 'Build.FINGERPRINT + QEMU props'
    }
    if checks['emulator']['result'] == 'FAIL' and not reason:
        passed = False
        reason = 'EMULATOR_DETECTED'
    # Attestation
    checks['attestation'] = {
        'result': 'PASS' if flags.get('attestation_valid', True) else 'FAIL',
        'method': 'Google attestation roots'
    }
    if checks['attestation']['result'] == 'FAIL' and not reason:
        passed = False
        reason = 'ATTESTATION_INVALID'
    # Clock
    drift = flags.get('clock_drift_ms', 0)
    checks['clock'] = {
        'result': 'FAIL' if abs(drift) > 300000 else 'PASS',
        'drift_ms': drift,
        'threshold_ms': 300000
    }
    if checks['clock']['result'] == 'FAIL' and not reason:
        passed = False
        reason = 'CLOCK_TAMPERING'
    return {
        'passed': passed,
        'checks': checks,
        'integrity_failure_reason': reason
    }
