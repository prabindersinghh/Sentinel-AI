def compute_composite_score(
    hash_mismatch: bool,
    telecom_risk_score: int,
    ml_score: int,
    iccid_changed: bool,
    cross_bank_seen: bool
) -> dict:
    composite = min(1000,
        (350 if hash_mismatch else 0) +
        int(telecom_risk_score * 1.0) +
        int(ml_score) +
        (150 if iccid_changed else 0) +
        (100 if cross_bank_seen else 0)
    )
    if composite <= 299:
        decision = 'APPROVE'
    elif composite <= 599:
        decision = 'STEP_UP'
    else:
        decision = 'BLOCK'
    return {
        'composite_score': composite,
        'decision': decision,
        'signal_breakdown': {
            'hash_mismatch_contribution': 350 if hash_mismatch else 0,
            'telecom_contribution': int(telecom_risk_score * 1.0),
            'ml_contribution': int(ml_score),
            'iccid_contribution': 150 if iccid_changed else 0,
            'cross_bank_contribution': 100 if cross_bank_seen else 0
        }
    }

def check_fast_path(
    hash_mismatch: bool,
    screen_share_active: bool,
    ported_recently: bool,
    tx_amount_band: str,
    telecom_risk_score: int,
    on_mule_blocklist: bool
) -> dict:
    if hash_mismatch:
        return {'fast_path_triggered': True, 'trigger_reason': 'hash_mismatch', 'decision': 'BLOCK'}
    if screen_share_active:
        return {'fast_path_triggered': True, 'trigger_reason': 'screen_share_active', 'decision': 'BLOCK'}
    if ported_recently and tx_amount_band in ['HIGH', 'VERY_HIGH']:
        return {'fast_path_triggered': True, 'trigger_reason': 'ported_recently_high_value', 'decision': 'BLOCK'}
    if telecom_risk_score >= 160:
        return {'fast_path_triggered': True, 'trigger_reason': 'telecom_risk_score_160', 'decision': 'BLOCK'}
    if on_mule_blocklist:
        return {'fast_path_triggered': True, 'trigger_reason': 'mule_blocklist', 'decision': 'BLOCK'}
    return {'fast_path_triggered': False, 'trigger_reason': None, 'decision': None}
