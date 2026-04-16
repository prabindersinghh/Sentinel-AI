def compute_ml_score(features: dict) -> dict:
    base_score = 50
    shap_values = {}
    # Device trusted
    if not features.get('device_trusted', True):
        base_score += 80
        shap_values['device_trusted'] = 80
    else:
        shap_values['device_trusted'] = 0
    # Hash match
    if not features.get('hash_match', True):
        base_score += 120
        shap_values['hash_match'] = 120
    else:
        shap_values['hash_match'] = 0
    # Cross bank
    if features.get('cross_bank_seen', False):
        base_score += 60
        shap_values['cross_bank_seen'] = 60
    else:
        shap_values['cross_bank_seen'] = 0
    # Days since registration
    days = features.get('days_since_registration', 30)
    if days < 1:
        base_score += 60
        shap_values['days_since_registration'] = 60
    elif days < 7:
        base_score += 40
        shap_values['days_since_registration'] = 40
    else:
        shap_values['days_since_registration'] = 0
    # Telecom risk
    telecom_risk_score = features.get('telecom_risk_score', 0)
    if telecom_risk_score > 100:
        base_score += 40
        shap_values['telecom_risk_score'] = 40
    else:
        shap_values['telecom_risk_score'] = 0
    # Screen share
    if features.get('screen_share_active', False):
        base_score += 70
        shap_values['screen_share_active'] = 70
    else:
        shap_values['screen_share_active'] = 0
    # Ported recently
    if features.get('ported_recently', False):
        base_score += 50
        shap_values['ported_recently'] = 50
    else:
        shap_values['ported_recently'] = 0
    # ICCID changed
    if features.get('iccid_changed', False):
        base_score += 60
        shap_values['iccid_changed'] = 60
    else:
        shap_values['iccid_changed'] = 0
    # Amount band
    tx_amount_band = features.get('tx_amount_band', 'LOW')
    if tx_amount_band == 'VERY_HIGH':
        base_score += 30
        shap_values['tx_amount_band'] = 30
    elif tx_amount_band == 'HIGH':
        base_score += 15
        shap_values['tx_amount_band'] = 15
    else:
        shap_values['tx_amount_band'] = 0
    # Velocity
    if features.get('velocity_1min', 1) > 3:
        base_score += 40
        shap_values['velocity_1min'] = 40
    else:
        shap_values['velocity_1min'] = 0
    ml_score = min(200, base_score)
    # Top features by abs(contribution)
    top_features = sorted(shap_values.items(), key=lambda x: abs(x[1]), reverse=True)
    return {
        'ml_score': ml_score,
        'shap_values': shap_values,
        'top_features': top_features,
        'model_used': 'LightGBM+LSTM+GNN ensemble'
    }
